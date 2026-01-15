import { MongoClient, Db } from 'mongodb';
import crypto from 'crypto';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.warn('MONGODB_URI not configured - database features will not work');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error('Database connection not configured');
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('claude-lotto');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// ============================================
// DATABASE INITIALIZATION
// Creates necessary indexes for performance and data integrity
// Call this once on server startup or via admin endpoint
// ============================================
export async function initializeDatabase(): Promise<void> {
  const { db } = await connectToDatabase();

  // Used signatures - prevent replay attacks
  await db.collection('used_signatures').createIndex(
    { signature: 1 },
    { unique: true, name: 'unique_signature' }
  );
  await db.collection('used_signatures').createIndex(
    { usedAt: 1 },
    { name: 'signature_timestamp' }
  );

  // Sessions - efficient lookup and cleanup
  await db.collection('sessions').createIndex(
    { sessionId: 1, walletAddress: 1 },
    { unique: true, name: 'unique_session' }
  );
  await db.collection('sessions').createIndex(
    { lastActivity: 1 },
    { name: 'session_activity', expireAfterSeconds: 86400 } // Auto-expire after 24 hours
  );

  // Last requests - for spam throttle
  await db.collection('last_requests').createIndex(
    { walletAddress: 1 },
    { unique: true, name: 'unique_wallet_request' }
  );
  await db.collection('last_requests').createIndex(
    { timestamp: 1 },
    { name: 'request_cleanup', expireAfterSeconds: 60 } // Auto-expire after 1 minute
  );

  // Wins - for displaying recent winners
  await db.collection('wins').createIndex(
    { timestamp: -1 },
    { name: 'wins_by_time' }
  );

  // Attempts - historical queries (all conversations logged for admin review)
  await db.collection('attempts').createIndex(
    { timestamp: -1 },
    { name: 'attempts_by_time' }
  );
  await db.collection('attempts').createIndex(
    { walletAddress: 1 },
    { name: 'attempts_by_wallet' }
  );
  await db.collection('attempts').createIndex(
    { result: 1 },
    { name: 'attempts_by_result' }
  );

  // Flagged conversations - admin review queue (manual flagging only)
  await db.collection('flagged_conversations').createIndex(
    { status: 1, flaggedAt: -1 },
    { name: 'flagged_queue' }
  );
  await db.collection('flagged_conversations').createIndex(
    { attemptId: 1 },
    { unique: true, name: 'unique_flagged_attempt' }
  );

  console.log('Database indexes initialized');
}

// ============================================
// SECURITY: Transaction Signature Tracking
// Prevents replay attacks by ensuring each signature is used only once
// Uses atomic reserve-then-verify pattern to eliminate race conditions
// ============================================

/**
 * Atomically reserve a signature BEFORE expensive verification.
 * This eliminates the race condition window between check and mark.
 *
 * Flow:
 * 1. Try to reserve signature (atomic insert)
 * 2. If reserved, proceed to expensive verification
 * 3. If verification fails, release the reservation
 * 4. If verification succeeds, update with wallet info
 *
 * @returns 'reserved' if newly reserved, 'already_used' if duplicate, 'error' on failure
 */
export async function reserveSignature(signature: string): Promise<'reserved' | 'already_used' | 'error'> {
  try {
    const { db } = await connectToDatabase();
    await db.collection('used_signatures').insertOne({
      signature,
      status: 'pending', // Will be updated to 'confirmed' after verification
      reservedAt: new Date(),
      walletAddress: null, // Will be filled in after verification
      usedAt: null,
    });
    return 'reserved';
  } catch (error: unknown) {
    // Duplicate key error means signature already exists (reserved or used)
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      return 'already_used';
    }
    console.error('Error reserving signature:', error);
    return 'error';
  }
}

/**
 * Confirm a reserved signature after successful verification.
 * Updates the record with wallet info and marks as confirmed.
 */
export async function confirmSignature(signature: string, walletAddress: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('used_signatures').updateOne(
      { signature, status: 'pending' },
      {
        $set: {
          status: 'confirmed',
          walletAddress,
          usedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}

/**
 * Release a reserved signature if verification fails.
 * This allows the signature to be used in a future valid transaction.
 */
export async function releaseSignature(signature: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('used_signatures').deleteOne({
      signature,
      status: 'pending',
    });
    return result.deletedCount > 0;
  } catch {
    return false;
  }
}

// Legacy functions kept for backward compatibility
export async function isSignatureUsed(signature: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const existing = await db.collection('used_signatures').findOne({ signature });
    return !!existing;
  } catch {
    // Fail secure - if we can't check, assume it's used
    return true;
  }
}

export async function markSignatureUsed(signature: string, walletAddress: string): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    await db.collection('used_signatures').insertOne({
      signature,
      walletAddress,
      status: 'confirmed',
      usedAt: new Date(),
    });
    return true;
  } catch (error: unknown) {
    // If duplicate key error, signature was already used (race condition protection)
    if (error instanceof Error && 'code' in error && (error as { code: number }).code === 11000) {
      return false;
    }
    return false;
  }
}

// ============================================
// SECURITY: Server-side Session Management
// Stores conversation history server-side to prevent client manipulation
// ============================================
export async function createSession(walletAddress: string): Promise<string> {
  try {
    const { db } = await connectToDatabase();
    const sessionId = crypto.randomBytes(32).toString('hex');
    await db.collection('sessions').insertOne({
      sessionId,
      walletAddress,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    });
    return sessionId;
  } catch {
    throw new Error('Failed to create session');
  }
}

export async function getSession(sessionId: string, walletAddress: string): Promise<{
  messages: { role: 'user' | 'assistant'; content: string }[];
} | null> {
  try {
    const { db } = await connectToDatabase();
    const session = await db.collection('sessions').findOne({
      sessionId,
      walletAddress, // Ensure session belongs to this wallet
    });
    if (!session) return null;
    return { messages: session.messages || [] };
  } catch {
    return null;
  }
}

export async function addMessageToSession(
  sessionId: string,
  walletAddress: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('sessions').updateOne(
      { sessionId, walletAddress },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $push: { messages: message }, $set: { lastActivity: new Date() } } as any
    );
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}

// ============================================
// SECURITY: Spam Throttle
// Simple rate limit - 1 request per second per wallet
// ============================================
const THROTTLE_MS = 1000; // 1 second between requests

export async function checkSpamThrottle(walletAddress: string): Promise<{
  allowed: boolean;
  retryAfterMs?: number;
}> {
  try {
    const { db } = await connectToDatabase();
    const lastRequest = await db.collection('last_requests').findOne({ walletAddress });

    if (lastRequest) {
      const timeSince = Date.now() - lastRequest.timestamp.getTime();
      if (timeSince < THROTTLE_MS) {
        return { allowed: false, retryAfterMs: THROTTLE_MS - timeSince };
      }
    }

    return { allowed: true };
  } catch {
    // Fail open for throttle - don't block on DB errors
    return { allowed: true };
  }
}

export async function recordRequest(walletAddress: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    await db.collection('last_requests').updateOne(
      { walletAddress },
      { $set: { walletAddress, timestamp: new Date() } },
      { upsert: true }
    );
  } catch {
    // Non-critical
  }
}

// ============================================
// WINS LOG
// Records all wins for display to users
// Game continues forever - multiple winners possible
// ============================================
export interface WinRecord {
  walletAddress: string;
  amount: number;
  reason: string;
  transaction: string;
  timestamp: Date;
}

export async function recordWin(
  walletAddress: string,
  amount: number,
  reason: string,
  transaction: string
): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    await db.collection('wins').insertOne({
      walletAddress,
      amount,
      reason,
      transaction,
      timestamp: new Date(),
    });
  } catch {
    // Non-critical for logging
  }
}

export async function getRecentWins(limit = 10): Promise<WinRecord[]> {
  try {
    const { db } = await connectToDatabase();
    const wins = await db.collection('wins')
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return wins.map((w) => ({
      walletAddress: w.walletAddress,
      amount: w.amount,
      reason: w.reason,
      transaction: w.transaction,
      timestamp: w.timestamp,
    }));
  } catch {
    return [];
  }
}

export async function getTotalWins(): Promise<{ count: number; totalAmount: number }> {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('wins').aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]).toArray();

    if (result.length === 0) {
      return { count: 0, totalAmount: 0 };
    }
    return { count: result[0].count, totalAmount: result[0].totalAmount };
  } catch {
    return { count: 0, totalAmount: 0 };
  }
}

// ============================================
// CONVERSATION LOGGING
// ALL conversations are logged for transparency and admin review
// NO automatic win detection - admin manually reviews and flags
// ============================================
export async function logAttempt(
  walletAddress: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  transactionSignatures: string[],
  result: 'logged' | 'flagged' | 'approved' | 'rejected',
  prizeTransaction?: string
): Promise<string> {
  try {
    const { db } = await connectToDatabase();
    const insertResult = await db.collection('attempts').insertOne({
      walletAddress,
      messages,
      transactionSignatures,
      timestamp: new Date(),
      result,
      prizeTransaction,
    });
    return insertResult.insertedId.toString();
  } catch {
    throw new Error('Failed to log attempt');
  }
}

export async function getAttempts(limit = 50): Promise<{
  attempts: Array<{
    _id: string;
    walletAddress: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    transactionSignatures: string[];
    timestamp: Date;
    result: 'logged' | 'flagged' | 'approved' | 'rejected';
    prizeTransaction?: string;
  }>;
  totalAttempts: number;
  totalApproved: number;
}> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('attempts');

    const [attempts, totalAttempts, totalApproved] = await Promise.all([
      collection.find().sort({ timestamp: -1 }).limit(limit).toArray(),
      collection.countDocuments(),
      collection.countDocuments({ result: 'approved' }),
    ]);

    return {
      attempts: attempts.map((a) => ({
        _id: a._id.toString(),
        walletAddress: a.walletAddress,
        messages: a.messages,
        transactionSignatures: a.transactionSignatures,
        timestamp: a.timestamp,
        result: a.result,
        prizeTransaction: a.prizeTransaction,
      })),
      totalAttempts,
      totalApproved,
    };
  } catch {
    return { attempts: [], totalAttempts: 0, totalApproved: 0 };
  }
}

// ============================================
// ADMIN: Manual Conversation Flagging
// Admin can flag any logged conversation for review
// This is the ONLY way to initiate a potential payout
// NO automated detection - 100% manual admin control
// ============================================
export async function adminFlagConversation(
  attemptId: string,
  flaggedBy: string,
  reason?: string
): Promise<string> {
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    // Get the attempt to flag
    const attempt = await db.collection('attempts').findOne({ _id: new ObjectId(attemptId) });
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    // Create flagged conversation record
    const result = await db.collection('flagged_conversations').insertOne({
      attemptId,
      walletAddress: attempt.walletAddress,
      messages: attempt.messages,
      transactionSignatures: attempt.transactionSignatures,
      flaggedAt: new Date(),
      flaggedBy,
      reason: reason || null,
      status: 'pending', // pending | approved | rejected
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      prizeTransaction: null,
    });

    // Update the attempt status
    await db.collection('attempts').updateOne(
      { _id: new ObjectId(attemptId) },
      { $set: { result: 'flagged' } }
    );

    return result.insertedId.toString();
  } catch (error) {
    if (error instanceof Error && error.message === 'Attempt not found') {
      throw error;
    }
    throw new Error('Failed to flag conversation');
  }
}

export async function getFlaggedConversations(): Promise<Array<{
  _id: string;
  attemptId: string;
  walletAddress: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  flaggedAt: Date;
  flaggedBy: string;
  reason?: string;
  status: string;
}>> {
  try {
    const { db } = await connectToDatabase();
    const flagged = await db.collection('flagged_conversations')
      .find({ status: 'pending' })
      .sort({ flaggedAt: -1 })
      .toArray();

    return flagged.map((f) => ({
      _id: f._id.toString(),
      attemptId: f.attemptId,
      walletAddress: f.walletAddress,
      messages: f.messages,
      flaggedAt: f.flaggedAt,
      flaggedBy: f.flaggedBy,
      reason: f.reason || undefined,
      status: f.status,
    }));
  } catch {
    return [];
  }
}

export async function reviewFlaggedConversation(
  flagId: string,
  approved: boolean,
  reviewedBy: string,
  reviewNotes: string,
  prizeTransaction?: string
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    // Update the flagged conversation
    const result = await db.collection('flagged_conversations').updateOne(
      { _id: new ObjectId(flagId), status: 'pending' },
      {
        $set: {
          status: approved ? 'approved' : 'rejected',
          reviewedBy,
          reviewedAt: new Date(),
          reviewNotes,
          prizeTransaction: prizeTransaction || null,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return false;
    }

    // Get the flagged conversation to update the original attempt
    const flagged = await db.collection('flagged_conversations').findOne({ _id: new ObjectId(flagId) });
    if (flagged) {
      await db.collection('attempts').updateOne(
        { _id: new ObjectId(flagged.attemptId) },
        {
          $set: {
            result: approved ? 'approved' : 'rejected',
            prizeTransaction: prizeTransaction || null,
          },
        }
      );
    }

    return true;
  } catch {
    return false;
  }
}
