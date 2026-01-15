import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/mongodb';
import { verifyWalletSignature } from '@/lib/auth';

// ============================================
// SERVER-AUTHORITATIVE SESSION MANAGEMENT
// Sessions are created and managed entirely server-side
// Client only receives an opaque session token
// ============================================

// Maximum age for session creation messages (5 minutes)
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;

/**
 * Extract and validate timestamp from session message.
 * Message format: "Claude Lotto Session\nWallet: <address>\nTimestamp: <ms>"
 */
function validateMessageTimestamp(message: string, walletAddress: string): { valid: boolean; error?: string } {
  // Verify message format
  const lines = message.split('\n');
  if (lines.length < 3) {
    return { valid: false, error: 'Invalid message format' };
  }

  // Verify message is for session creation (not some other signed message)
  if (!lines[0].includes('Claude Lotto Session')) {
    return { valid: false, error: 'Invalid message type' };
  }

  // Verify wallet address in message matches provided wallet
  const walletLine = lines.find((l) => l.startsWith('Wallet:'));
  if (!walletLine || !walletLine.includes(walletAddress)) {
    return { valid: false, error: 'Wallet address mismatch' };
  }

  // Extract and validate timestamp
  const timestampLine = lines.find((l) => l.startsWith('Timestamp:'));
  if (!timestampLine) {
    return { valid: false, error: 'Missing timestamp' };
  }

  const timestampStr = timestampLine.replace('Timestamp:', '').trim();
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  // Check timestamp is not in the future (with 30s tolerance for clock drift)
  const now = Date.now();
  if (timestamp > now + 30000) {
    return { valid: false, error: 'Timestamp is in the future' };
  }

  // Check timestamp is not too old
  const age = now - timestamp;
  if (age > MAX_MESSAGE_AGE_MS) {
    return { valid: false, error: 'Session message expired. Please try again.' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { walletAddress, signature, message } = body;

    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!signature || typeof signature !== 'string') {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // === TIMESTAMP VALIDATION (REPLAY PROTECTION) ===
    // Validate message format and timestamp before signature verification
    // This prevents replay attacks with old signed messages
    const timestampValidation = validateMessageTimestamp(message, walletAddress);
    if (!timestampValidation.valid) {
      return NextResponse.json(
        { error: timestampValidation.error },
        { status: 400 }
      );
    }

    // Verify the wallet owns this address by checking signature
    const isValid = await verifyWalletSignature(walletAddress, signature, message);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet signature' },
        { status: 401 }
      );
    }

    // Create server-side session
    const sessionId = await createSession(walletAddress);

    return NextResponse.json({
      sessionId,
      message: 'Session created successfully',
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = request.headers.get('x-session-id');
    const walletAddress = request.headers.get('x-wallet-address');

    if (!sessionId || !walletAddress) {
      return NextResponse.json(
        { error: 'Session ID and wallet address required' },
        { status: 400 }
      );
    }

    const session = await getSession(sessionId, walletAddress);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    // Return message count only - don't expose full history to client
    return NextResponse.json({
      valid: true,
      messageCount: session.messages.length,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}
