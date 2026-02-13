'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { ChatInterface } from '@/components/ChatInterface';
import { PrizePoolCompact } from '@/components/PrizePool';
import { UserBalance } from '@/components/UserBalance';

const CA_ADDRESS = '3fBQe5kaAZqbZYD3BcbXqSZFNxmS3wJTzMxjrn5Xpump';

export default function ChatPage() {
  const { publicKey } = useWallet();
  const [potBalance, setPotBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyCA = async () => {
    await navigator.clipboard.writeText(CA_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch('/api/balance');
        const data = await res.json();
        setPotBalance(data.balance ?? 0);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setPotBalance(0);
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
    // Poll every 15s - CDN caches for 10s anyway, so this is efficient
    // Optimistic updates in ChatInterface handle immediate balance changes
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="h-screen flex flex-col page-bg relative overflow-hidden">
      {/* Subtle background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="orb orb-1 absolute -top-32 left-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="orb orb-2 absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/8 rounded-full blur-3xl" />
      </div>

      {/* Header with Prize Pool */}
      <header className="relative z-20 flex-shrink-0 header-blur border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left - Back button + User Balance */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-300 group"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-white/10 flex items-center justify-center group-hover:bg-[var(--bg-elevated)] group-hover:border-orange-500/20 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="hidden sm:inline text-sm font-medium">Back</span>
            </Link>
            
            {/* User Balance */}
            {publicKey && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-white/10">
                <span className="text-xs text-[var(--text-muted)]">Your balance:</span>
                <UserBalance />
              </div>
            )}
          </div>

          {/* Center - Prize Pool (prominent!) */}
          <PrizePoolCompact balance={potBalance} loading={loading} />

          {/* Right - Brand + Social */}
          <div className="flex items-center gap-3">
            {/* Social Links + CA */}
            <div className="hidden sm:flex items-center gap-1">
              <a
                href="https://github.com/Tanner253/ClaudeLotto"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all"
                title="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                </svg>
              </a>
              <a
                href="https://x.com/i/communities/2011701376192331907"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all"
                title="X Community"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* CA Address */}
              <button
                onClick={copyCA}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--bg-card)] border border-white/10 hover:border-orange-500/30 transition-all group"
                title="Click to copy CA"
              >
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {CA_ADDRESS.slice(0, 4)}...{CA_ADDRESS.slice(-4)}
                </span>
                {copied ? (
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-[var(--text-muted)] group-hover:text-orange-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xs">CL</span>
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold text-sm text-[var(--text-primary)]">Claude Lotto</p>
                <p className="text-xs text-[var(--text-muted)]">{process.env.NEXT_PUBLIC_MESSAGE_COST_SOL || '0.1'} SOL per message</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Interface - takes remaining height with flex-1 */}
      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <ChatInterface prizeBalance={potBalance} onPrizeUpdate={setPotBalance} />
      </div>
    </main>
  );
}
