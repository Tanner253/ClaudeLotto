import { NextResponse } from 'next/server';
import { getWalletBalance } from '@/lib/solana';
import { TREASURY_WALLET } from '@/lib/constants';
import type { BalanceResponse } from '@/types';

// ============================================
// BALANCE API - Optimized for Serverless
// 
// Cost optimization strategy:
// 1. Aggressive edge caching (Vercel CDN caches this)
// 2. stale-while-revalidate for fast responses
// 3. Longer cache times to reduce RPC calls
// 
// With 10s cache + stale-while-revalidate:
// - Users get instant responses from CDN
// - Only 6 RPC calls per minute max (not per user!)
// ============================================

// Edge caching - this is the key for serverless cost optimization
// Vercel CDN will cache this response and serve it globally
export const revalidate = 10;

export async function GET(): Promise<NextResponse<BalanceResponse>> {
  try {
    if (!TREASURY_WALLET) {
      return NextResponse.json(
        { balance: 0, error: 'Treasury wallet not configured' },
        { status: 500 }
      );
    }

    // Fetch balance - this only runs when cache is stale
    const balance = await getWalletBalance(TREASURY_WALLET);

    return NextResponse.json(
      { balance },
      {
        headers: {
          // Edge caching: s-maxage for CDN, stale-while-revalidate for instant responses
          // This means: cache for 10s, serve stale for up to 60s while revalidating
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { balance: 0, error: 'Failed to fetch balance' },
      { 
        status: 500,
        headers: {
          // Don't cache errors for long
          'Cache-Control': 'public, s-maxage=5',
        },
      }
    );
  }
}
