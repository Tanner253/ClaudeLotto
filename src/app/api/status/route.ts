import { NextResponse } from 'next/server';
import { getWalletBalance } from '@/lib/solana';
import { getRecentWins, getTotalWins } from '@/lib/mongodb';
import { TREASURY_WALLET } from '@/lib/constants';

// ============================================
// GAME STATUS ENDPOINT
// Returns current pot balance and recent winners
// Used by frontend to display game state
// ============================================

export interface WinInfo {
  walletAddress: string;
  amount: number;
  transaction: string;
  timestamp: string;
}

export interface StatusResponse {
  potBalance: number;
  recentWins: WinInfo[];
  totalWins: number;
  totalPaidOut: number;
}

export async function GET(): Promise<NextResponse<StatusResponse>> {
  try {
    // Get current pot balance
    const potBalance = TREASURY_WALLET ? await getWalletBalance(TREASURY_WALLET) : 0;

    // Get recent wins
    const recentWinsRaw = await getRecentWins(5);
    const recentWins: WinInfo[] = recentWinsRaw.map((w) => ({
      walletAddress: w.walletAddress,
      amount: w.amount,
      transaction: w.transaction,
      timestamp: w.timestamp.toISOString(),
    }));

    // Get total stats
    const { count: totalWins, totalAmount: totalPaidOut } = await getTotalWins();

    return NextResponse.json({
      potBalance,
      recentWins,
      totalWins,
      totalPaidOut,
    });
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json({
      potBalance: 0,
      recentWins: [],
      totalWins: 0,
      totalPaidOut: 0,
    });
  }
}
