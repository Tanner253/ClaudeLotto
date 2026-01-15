import { NextRequest, NextResponse } from 'next/server';
import { getAttempts, getRecentWins, getTotalWins } from '@/lib/mongodb';
import { verifyAdminAuth } from '@/lib/auth';
import type { HistoryResponse } from '@/types';

// ============================================
// HISTORY API - Two modes:
// 1. Public: Returns sanitized stats only (no conversation content)
// 2. Admin: Returns full history with conversations (requires auth)
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<HistoryResponse>> {
  try {
    const authHeader = request.headers.get('authorization');
    const isAdmin = verifyAdminAuth(authHeader);

    const [attemptsData, recentWinners, winsData] = await Promise.all([
      getAttempts(50),
      getRecentWins(10),
      getTotalWins(),
    ]);

    const { attempts, totalAttempts } = attemptsData;
    const { count: totalWinsCount } = winsData;

    if (isAdmin) {
      // Admin gets full history including conversations
      // Map to expected response format
      const mappedAttempts = attempts.map((a) => ({
        ...a,
        result: a.result as 'logged' | 'flagged' | 'approved' | 'rejected',
        // Count only user messages for display
        messageCount: a.messages.filter(m => m.role === 'user').length,
      }));

      return NextResponse.json({
        attempts: mappedAttempts,
        totalAttempts,
        totalWins: totalWinsCount,
        recentWinners,
      });
    }

    // Public users get sanitized data - no conversation content
    // This prevents leaking jailbreak attempts to other users
    const sanitizedAttempts = attempts.map((attempt) => ({
      _id: attempt._id,
      // Mask wallet address for privacy (show first 4 and last 4 chars)
      walletAddress: maskWalletAddress(attempt.walletAddress),
      // Don't expose actual messages - just show count of USER messages only
      messages: [],
      messageCount: attempt.messages.filter(m => m.role === 'user').length,
      transactionSignatures: [], // Don't expose signatures
      timestamp: attempt.timestamp,
      result: attempt.result,
      // Don't expose prize transaction details publicly
      prizeTransaction: attempt.prizeTransaction ? '[REDACTED]' : undefined,
    }));

    // Sanitize winner wallet addresses for public view
    const sanitizedWinners = recentWinners.map(w => ({
      ...w,
      walletAddress: maskWalletAddress(w.walletAddress),
      transaction: w.transaction.slice(0, 8) + '...',
    }));

    return NextResponse.json({
      attempts: sanitizedAttempts as typeof attempts,
      totalAttempts,
      totalWins: totalWinsCount,
      recentWinners: sanitizedWinners,
    });
  } catch {
    return NextResponse.json(
      { attempts: [], totalAttempts: 0, totalWins: 0 },
      { status: 500 }
    );
  }
}

function maskWalletAddress(address: string): string {
  if (address.length < 12) return '****';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
