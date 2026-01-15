'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface UserBalanceProps {
  className?: string;
  onBalanceChange?: (balance: number) => void;
}

export function UserBalance({ className = '', onBalanceChange }: UserBalanceProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    try {
      setLoading(true);
      const lamports = await connection.getBalance(publicKey);
      const sol = lamports / LAMPORTS_PER_SOL;
      setBalance(sol);
      onBalanceChange?.(sol);
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, onBalanceChange]);

  useEffect(() => {
    fetchBalance();
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Also refresh when publicKey changes
  useEffect(() => {
    if (publicKey) {
      fetchBalance();
    }
  }, [publicKey, fetchBalance]);

  if (!publicKey) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-sm font-mono text-[var(--text-secondary)]">
        {loading ? (
          <span className="animate-pulse">...</span>
        ) : balance !== null ? (
          <span className="text-emerald-400 font-semibold">{balance.toFixed(4)} SOL</span>
        ) : (
          <span className="text-red-400">Error</span>
        )}
      </span>
    </div>
  );
}

// Hook version for more flexibility
export function useUserBalance() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return null;
    }

    try {
      setLoading(true);
      const lamports = await connection.getBalance(publicKey);
      const sol = lamports / LAMPORTS_PER_SOL;
      setBalance(sol);
      return sol;
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
      setBalance(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}

