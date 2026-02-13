'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PrizePoolCompact } from '@/components/PrizePool';
import type { HistoryResponse, Attempt, WinRecord } from '@/types';

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [potBalance, setPotBalance] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [historyRes, balanceRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/balance')
        ]);
        
        if (!historyRes.ok) throw new Error('Failed to fetch history');
        
        const historyJson = await historyRes.json();
        const balanceJson = await balanceRes.json();
        
        setData(historyJson);
        setPotBalance(balanceJson.balance ?? 0);
      } catch (err) {
        setError('Failed to load history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen page-bg relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1 absolute top-1/3 -left-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="orb orb-2 absolute bottom-1/3 -right-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 header-blur border-b border-white/5 sticky top-0">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
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

          <h1 className="font-bold text-lg text-[var(--text-primary)]">Attempt History</h1>

          {/* Right - Prize Pool + Social */}
          <div className="flex items-center gap-3">
            {/* Social Links */}
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
            </div>
            
            <PrizePoolCompact balance={potBalance} loading={loading} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 gap-4 mb-8 stagger-children">
            <div className="card p-6 text-center">
              <p className="text-4xl font-extrabold text-[var(--text-primary)] mb-1">{data.totalAttempts}</p>
              <p className="text-sm text-[var(--text-muted)] font-medium">Total Attempts</p>
            </div>
            <div className="card card-highlight p-6 text-center">
              <p className="text-4xl font-extrabold text-gradient-gold mb-1">{data.totalWins}</p>
              <p className="text-sm text-[var(--text-muted)] font-medium">Winners 🏆</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-12 h-12 border-3 border-[var(--border-default)] border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="text-[var(--text-secondary)] mt-4 font-medium">Loading history...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-20 animate-fade-in">
            <div className="card inline-flex items-center gap-3 rounded-xl px-6 py-4 border border-red-500/30 bg-red-500/10">
              <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {data && data.attempts.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No attempts yet</h3>
            <p className="text-[var(--text-secondary)] mb-6">Be the first to try your luck!</p>
            <Link href="/chat" className="btn-primary">
              🎰 Start Playing
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        {/* Winners Section */}
        {data && data.recentWinners && data.recentWinners.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm text-[var(--text-muted)] uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <span className="text-lg">🏆</span> Recent Winners
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recentWinners.map((winner, i) => (
                <div
                  key={`${winner.transaction}-${i}`}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <WinnerCard winner={winner} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attempts list */}
        {data && data.attempts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm text-[var(--text-muted)] uppercase tracking-widest font-bold mb-4">
              Recent Attempts
            </h2>
            <div className="space-y-3">
              {data.attempts.map((attempt, i) => (
                <div
                  key={attempt._id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <AttemptCard
                    attempt={attempt}
                    isExpanded={expandedId === attempt._id}
                    onToggle={() => setExpandedId((id) => (id === attempt._id ? null : attempt._id))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function WinnerCard({ winner }: { winner: WinRecord }) {
  const date = new Date(winner.timestamp);

  return (
    <div className="card card-highlight p-5 transition-all duration-300 hover:translate-y-[-2px] ring-1 ring-emerald-500/20">
      <div className="flex items-center gap-4">
        {/* Trophy */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/30 flex items-center justify-center">
          <span className="text-2xl">🏆</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-medium text-[var(--text-secondary)]">
              {winner.walletAddress}
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-400">
            +{winner.amount.toFixed(4)} SOL
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {date.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function AttemptCard({
  attempt,
  isExpanded,
  onToggle,
}: {
  attempt: Attempt;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const date = new Date(attempt.timestamp);
  const shortWallet = attempt.walletAddress.includes('...')
    ? attempt.walletAddress
    : `${attempt.walletAddress.slice(0, 4)}...${attempt.walletAddress.slice(-4)}`;
  const isWin = attempt.result === 'approved';
  const messages = attempt.messages ?? [];
  const hasMessages = messages.length > 0;

  return (
    <div
      className={`card overflow-hidden transition-all duration-300 ${
        isWin ? 'card-highlight ring-1 ring-orange-500/20' : ''
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left flex items-center justify-between hover:bg-white/[0.02] transition-colors rounded-t-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-inset"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isWin
              ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30'
              : 'bg-[var(--bg-elevated)] border border-white/10'
          }`}>
            {isWin ? (
              <span className="text-2xl">🏆</span>
            ) : (
              <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-medium text-[var(--text-secondary)]">{shortWallet}</span>
              {isWin && (
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm">
                  🎉 Winner!
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {attempt.messageCount ?? 0} message{(attempt.messageCount ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <span
            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 bg-[var(--bg-elevated)]/50">
          <div className="p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Conversation
            </h3>
            {hasMessages ? (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        msg.role === 'user'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}
                      title={msg.role === 'assistant' ? 'Claude' : undefined}
                    >
                      {msg.role === 'user' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div
                      className={`flex-1 min-w-0 rounded-xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-500/10 border border-blue-500/20 text-[var(--text-primary)]'
                          : 'bg-[var(--bg-card)] border border-white/10 text-[var(--text-secondary)]'
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                        {msg.role === 'user' ? 'User' : 'Claude'}
                      </p>
                      <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No messages in this attempt.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
