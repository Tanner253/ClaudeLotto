import { NextResponse } from 'next/server';
import { getConnection, getWalletBalance } from '@/lib/solana';
import { connectToDatabase } from '@/lib/mongodb';
import { TREASURY_WALLET } from '@/lib/constants';

// ============================================
// HEALTH CHECK ENDPOINT
//
// Returns the status of all critical services:
// - Database connectivity
// - Solana RPC connectivity
// - Treasury wallet balance
// - Environment configuration
// ============================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: string; latency?: number };
    solana: { status: string; latency?: number };
    treasury: { status: string; balance?: number };
  };
  config: {
    treasuryWallet: boolean;
    anthropicKey: boolean;
    mongoUri: boolean;
    adminSecret: boolean;
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'unknown' },
      solana: { status: 'unknown' },
      treasury: { status: 'unknown' },
    },
    config: {
      treasuryWallet: !!process.env.TREASURY_WALLET,
      anthropicKey: !!process.env.ANTHROPIC_API_KEY,
      mongoUri: !!process.env.MONGODB_URI,
      adminSecret: !!process.env.ADMIN_SECRET,
    },
  };

  // Check database
  try {
    const dbStart = Date.now();
    await connectToDatabase();
    health.services.database = {
      status: 'connected',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    health.services.database = { status: 'error: ' + (error instanceof Error ? error.message : 'unknown') };
    health.status = 'degraded';
  }

  // Check Solana RPC
  try {
    const solanaStart = Date.now();
    const connection = getConnection();
    await connection.getSlot();
    health.services.solana = {
      status: 'connected',
      latency: Date.now() - solanaStart,
    };
  } catch (error) {
    health.services.solana = { status: 'error: ' + (error instanceof Error ? error.message : 'unknown') };
    health.status = 'degraded';
  }

  // Check treasury wallet
  if (TREASURY_WALLET) {
    try {
      const balance = await getWalletBalance(TREASURY_WALLET);
      health.services.treasury = {
        status: 'accessible',
        balance,
      };
    } catch (error) {
      health.services.treasury = { status: 'error: ' + (error instanceof Error ? error.message : 'unknown') };
      health.status = 'degraded';
    }
  } else {
    health.services.treasury = { status: 'not configured' };
    health.status = 'unhealthy';
  }

  // Check critical config
  if (!health.config.treasuryWallet || !health.config.anthropicKey || !health.config.mongoUri) {
    health.status = 'unhealthy';
  }

  return NextResponse.json(health);
}
