'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClaudeCharacter } from '@/components/claude-character';
import { PrizePool } from '@/components/PrizePool';
import type { ClaudeEmotion } from '@/components/claude-character';

const IDLE_EMOTIONS: ClaudeEmotion[] = ['idle', 'playful', 'happy', 'amused', 'impressed'];

export default function Home() {
  const [potBalance, setPotBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [emotion, setEmotion] = useState<ClaudeEmotion>('idle');
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch('/api/balance');
        const data = await res.json();
        if (data.error) {
          console.error('Balance API error:', data.error);
        }
        setPotBalance(data.balance ?? 0);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setPotBalance(0);
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
    // Poll every 30s on landing page - less critical here
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through emotions periodically
  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
      setEmotion(IDLE_EMOTIONS[Math.floor(Math.random() * IDLE_EMOTIONS.length)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isHovering]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    setEmotion('playful');
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setEmotion('idle');
  };

  return (
    <main className="min-h-screen page-bg relative overflow-x-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-1 absolute -top-32 -left-32 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="orb orb-2 absolute top-1/3 -right-32 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl" />
        <div className="orb orb-3 absolute -bottom-32 left-1/3 w-72 h-72 bg-emerald-500/6 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 header-blur border-b border-white/5 sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-sm">CL</span>
            </div>
            <span className="font-bold text-xl text-[var(--text-primary)]">Claude Lotto</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Social Links */}
            <a
              href="https://github.com/Tanner253/ClaudeLotto"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all"
              title="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
              </svg>
            </a>
            <a
              href="https://x.com/i/communities/2011701376192331907"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-all"
              title="X Community"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* CA Address - Coming soon */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-white/10"
              title="Contract address"
            >
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Coming soon
              </span>
            </div>
            
            <Link href="/history" className="btn-ghost">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">History</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center min-h-[calc(100vh-4rem)] px-6 py-8 md:py-12">
        <div className="max-w-3xl w-full space-y-8 md:space-y-12 stagger-children">
          
          {/* Hero Section - Prize + Claude Character */}
          <div className="flex flex-col items-center gap-6">
            {/* Claude Character */}
            <div
              className="cursor-pointer transition-transform duration-300 hover:scale-105"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <ClaudeCharacter emotion={emotion} size="xl" showParticles={isHovering} />
            </div>
          </div>

          {/* MASSIVE Prize Pool Display */}
          <div className="relative">
            <PrizePool balance={potBalance} loading={loading} size="xl" />
          </div>

          {/* Headline */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-[var(--text-primary)]">
              Can you convince Claude
              <br />
              <span className="text-gradient-gold">to send you the money?</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
              Each message costs <span className="font-semibold text-orange-400">{process.env.NEXT_PUBLIC_MESSAGE_COST_SOL || '0.1'} SOL</span> and adds to the prize pool.
              Convince Claude to release the funds and <span className="font-semibold text-[var(--text-primary)]">win everything</span>.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center pt-2">
            <Link href="/chat" className="btn-primary text-lg px-12 py-5">
              <span className="text-xl">🎰</span>
              Start Playing
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* How it works */}
          <div className="card p-8 md:p-10">
            <h2 className="text-center text-sm text-[var(--text-muted)] uppercase tracking-widest mb-8 font-bold">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <Step 
                number={1} 
                icon="⚡" 
                title="Connect" 
                description="Link your Solana wallet to get started" 
              />
              <Step 
                number={2} 
                icon="💬" 
                title="Chat" 
                description={`Send messages for ${process.env.NEXT_PUBLIC_MESSAGE_COST_SOL || '0.1'} SOL each`}
              />
              <Step 
                number={3} 
                icon="🏆" 
                title="Win" 
                description="Convince Claude, win the entire pot" 
              />
            </div>
          </div>

          {/* Flywheel */}
          <div className="card p-6 md:p-8 border border-orange-500/20 bg-orange-500/5">
            <h2 className="text-center text-sm text-[var(--text-muted)] uppercase tracking-widest mb-4 font-bold">
              The Flywheel
            </h2>
            <p className="text-center text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
              When someone wins, <span className="font-semibold text-orange-400">15% of the profit from dev winnings</span> is used to buy back and god candle the chart — so wins fuel more demand and support the token.
            </p>
          </div>

          {/* User Security */}
          <div className="card p-6 md:p-8 border border-emerald-500/20 bg-emerald-500/5">
            <h2 className="text-center text-sm text-[var(--text-muted)] uppercase tracking-widest mb-6 font-bold">
              User Security
            </h2>
            <ul className="space-y-3 text-[var(--text-secondary)] max-w-xl mx-auto text-left list-disc list-inside leading-relaxed">
              <li>The wallet connection is <span className="font-semibold text-[var(--text-primary)]">read-only</span> for user identification.</li>
              <li>When you send a message to pay, you can <span className="font-semibold text-[var(--text-primary)]">preview the transaction</span> before signing to verify legitimacy.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">No token approvals.</span> We only request a one-time SOL transfer for the exact message cost each time — no unlimited or recurring approvals.</li>
              <li><span className="font-semibold text-[var(--text-primary)]">Your keys never leave your wallet.</span> Signing happens inside Phantom (or your wallet); we never see or store private keys.</li>
              <li>Payments go only to the <span className="font-semibold text-[var(--text-primary)]">prize pool treasury</span>; the transaction you sign has a single recipient and the exact amount shown.</li>
              <li>If you are concerned, please do the following:</li>
            </ul>
            <ol className="space-y-2 text-[var(--text-secondary)] max-w-xl mx-auto text-left list-decimal list-inside mt-4 mb-4 leading-relaxed">
              <li>Scan the <span className="font-semibold text-[var(--text-primary)]">fully open-source</span> code on GitHub with a premium model of your choice (free Grok will not read the code): <a href="https://github.com/Tanner253/ClaudeLotto" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline font-medium">github.com/Tanner253/ClaudeLotto</a></li>
              <li><span className="font-semibold text-[var(--text-primary)]">Only connect a fresh, burner wallet.</span></li>
            </ol>
            <p className="text-center text-sm text-[var(--text-muted)] max-w-xl mx-auto">
              Do these two things for <span className="font-semibold text-[var(--text-primary)]">any</span> project you interface with.
            </p>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm">
            <TrustBadge icon="✓" label="Transparent" color="success" />
            <TrustBadge icon="🔒" label="Secure" color="primary" />
            <TrustBadge icon="🤖" label="AI-Powered" color="accent" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Built with Claude AI by Anthropic
        </p>
      </footer>
    </main>
  );
}

function Step({ 
  number, 
  icon, 
  title, 
  description 
}: { 
  number: number; 
  icon: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center group">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-500/20 group-hover:border-orange-500/30">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="inline-flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <h3 className="font-bold text-lg text-[var(--text-primary)]">{title}</h3>
      </div>
      <p className="text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function TrustBadge({ 
  icon, 
  label, 
  color 
}: { 
  icon: string; 
  label: string; 
  color: 'success' | 'primary' | 'accent';
}) {
  const colorClasses = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    primary: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    accent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${colorClasses[color]}`}>
      <span>{icon}</span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
