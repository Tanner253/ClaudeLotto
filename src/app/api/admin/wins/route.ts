import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import {
  getAttempts,
  adminFlagConversation,
  getFlaggedConversations,
  reviewFlaggedConversation,
} from '@/lib/mongodb';
import { sendPrize } from '@/lib/solana';

// ============================================
// ADMIN-ONLY API: Conversation Review and Payout
//
// SECURITY ARCHITECTURE:
// 1. NO automatic win detection - removed entirely
// 2. Admin must manually review ALL conversations
// 3. Admin manually flags conversations for payout consideration
// 4. Admin explicitly approves or rejects flagged conversations
// 5. Only approved conversations trigger prize transfers
//
// This endpoint requires admin authentication.
// Claude's responses have NO effect on payouts.
// ============================================

// GET /api/admin/wins - Get all conversations and flagged ones for review
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!verifyAdminAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'flagged';

    if (view === 'all') {
      // Get all logged conversations for review
      const { attempts, totalAttempts, totalApproved } = await getAttempts(100);
      return NextResponse.json({
        conversations: attempts,
        totalConversations: totalAttempts,
        totalApproved,
      });
    } else {
      // Get flagged conversations pending review
      const flagged = await getFlaggedConversations();
      return NextResponse.json({ flagged });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to get conversations' }, { status: 500 });
  }
}

// POST /api/admin/wins - Flag a conversation or review a flagged one
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!verifyAdminAuth(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    // ACTION: Flag a conversation for review
    if (action === 'flag') {
      const { attemptId, reason } = body;

      if (!attemptId || typeof attemptId !== 'string') {
        return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
      }

      const flagId = await adminFlagConversation(attemptId, 'admin', reason);

      return NextResponse.json({
        success: true,
        flagId,
        message: 'Conversation flagged for review',
      });
    }

    // ACTION: Review a flagged conversation (approve/reject)
    if (action === 'review') {
      const { flagId, approved, reviewNotes } = body;

      if (!flagId || typeof flagId !== 'string') {
        return NextResponse.json({ error: 'Flag ID is required' }, { status: 400 });
      }

      if (typeof approved !== 'boolean') {
        return NextResponse.json({ error: 'Approved status is required' }, { status: 400 });
      }

      let prizeTransaction: string | undefined;

      // If approved, send the prize
      if (approved) {
        const flagged = await getFlaggedConversations();
        const conversation = flagged.find((f) => f._id === flagId);

        if (!conversation) {
          return NextResponse.json(
            { error: 'Flagged conversation not found or already processed' },
            { status: 404 }
          );
        }

        // Send the prize
        const prizeResult = await sendPrize(conversation.walletAddress);

        if (!prizeResult.success) {
          return NextResponse.json(
            { error: `Failed to send prize: ${prizeResult.error}` },
            { status: 500 }
          );
        }

        prizeTransaction = prizeResult.winnerTx;
      }

      // Update the flagged conversation record
      const updated = await reviewFlaggedConversation(
        flagId,
        approved,
        'admin',
        reviewNotes || '',
        prizeTransaction
      );

      if (!updated) {
        return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        approved,
        prizeTransaction,
        message: approved ? 'Approved and prize sent' : 'Rejected',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
