import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { initializeDatabase } from '@/lib/mongodb';

// ============================================
// ADMIN-ONLY: Database Initialization
//
// Creates all necessary indexes for performance and data integrity.
// Should be called once when setting up a new environment.
// Safe to call multiple times (indexes are created idempotently).
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin authentication
  const authHeader = request.headers.get('authorization');
  if (!verifyAdminAuth(authHeader)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await initializeDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      indexes: [
        'used_signatures: unique_signature, signature_timestamp',
        'sessions: unique_session, session_activity (TTL 24h)',
        'rate_limits: rate_limit_lookup, rate_limit_cleanup (TTL 1h)',
        'attempts: attempts_by_time, attempts_by_wallet, attempts_by_result',
        'pending_wins: pending_wins_queue, pending_wins_by_wallet',
      ],
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database: ' + (error instanceof Error ? error.message : 'unknown') },
      { status: 500 }
    );
  }
}
