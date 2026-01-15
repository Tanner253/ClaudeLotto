'use client';

import { useState, useEffect, useRef } from 'react';

interface PrizePoolProps {
  balance: number | null;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  compact?: boolean;
}

export function PrizePool({ 
  balance, 
  loading = false, 
  size = 'lg',
  showLabel = true,
}: PrizePoolProps) {
  const [displayValue, setDisplayValue] = useState(balance ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sparkles, setSparkles] = useState<number[]>([]);
  const prevBalance = useRef(balance);

  // Animate when balance increases
  useEffect(() => {
    if (balance === null || prevBalance.current === null) {
      prevBalance.current = balance;
      setDisplayValue(balance ?? 0);
      return;
    }

    const prev = prevBalance.current;
    const next = balance;

    if (next > prev) {
      // Trigger celebration animation
      setIsAnimating(true);
      setSparkles(Array.from({ length: 8 }, (_, i) => i));

      // Animate the number counting up
      const duration = 800;
      const steps = 20;
      const increment = (next - prev) / steps;
      const stepDuration = duration / steps;
      let current = prev;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
          setDisplayValue(next);
          clearInterval(timer);
          setTimeout(() => {
            setIsAnimating(false);
            setSparkles([]);
          }, 400);
        } else {
          setDisplayValue(current);
        }
      }, stepDuration);

      prevBalance.current = balance;
      return () => clearInterval(timer);
    } else {
      setDisplayValue(next);
      prevBalance.current = balance;
    }
  }, [balance]);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl md:text-6xl',
    xl: 'text-6xl md:text-7xl lg:text-8xl',
  };

  const containerSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  return (
    <div className={`relative ${containerSizes[size]}`}>
      {/* Glow effect behind */}
      <div className={`prize-glow ${isAnimating ? 'opacity-100' : 'opacity-50'}`} />
      
      {/* Card container */}
      <div className={`
        relative card-prize rounded-3xl overflow-hidden
        ${containerSizes[size]}
        ${isAnimating ? 'prize-increasing' : ''}
      `}>
        {/* Shimmer overlay when animating */}
        {isAnimating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
               style={{ backgroundSize: '200% 100%' }} />
        )}
        
        {/* Content */}
        <div className="relative text-center">
          {showLabel && (
            <p className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
              🏆 Prize Pool
            </p>
          )}
          
          {loading ? (
            <div className={`${sizeClasses[size]} h-16 shimmer rounded-xl mx-auto max-w-xs`} />
          ) : (
            <div className="relative inline-block">
              {/* Main prize amount */}
              <div className={`prize-amount text-gradient-gold number-ticker ${sizeClasses[size]}`}>
                {displayValue.toFixed(2)}
              </div>
              
              {/* Currency label */}
              <div className="text-xl md:text-2xl font-bold text-[var(--text-muted)] mt-1">
                SOL
              </div>
            </div>
          )}
        </div>
        
        {/* Celebration sparkles */}
        {sparkles.map((i) => (
          <span
            key={i}
            className="absolute text-2xl sparkle"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 0.08}s`,
              color: ['#f97316', '#f59e0b', '#a855f7', '#10b981'][i % 4],
            }}
          >
            {['✦', '★', '✧', '⭐'][i % 4]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Compact prize display for header
export function PrizePoolCompact({ 
  balance, 
  loading = false 
}: { 
  balance: number | null; 
  loading?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(balance ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (balance === null || prevBalance.current === null) {
      prevBalance.current = balance;
      setDisplayValue(balance ?? 0);
      return;
    }

    if (balance > prevBalance.current) {
      setIsAnimating(true);
      
      const duration = 600;
      const steps = 15;
      const increment = (balance - prevBalance.current) / steps;
      const stepDuration = duration / steps;
      let current = prevBalance.current;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        
        if (step >= steps) {
          setDisplayValue(balance);
          clearInterval(timer);
          setTimeout(() => setIsAnimating(false), 300);
        } else {
          setDisplayValue(current);
        }
      }, stepDuration);

      prevBalance.current = balance;
      return () => clearInterval(timer);
    } else {
      setDisplayValue(balance);
      prevBalance.current = balance;
    }
  }, [balance]);

  return (
    <div className={`
      flex items-center gap-2 px-4 py-2 rounded-full
      bg-gradient-to-r from-orange-500/15 to-amber-500/10
      border border-orange-500/20
      ${isAnimating ? 'animate-bounce-in ring-2 ring-orange-500/30 ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}
    `}>
      <span className="text-lg">🏆</span>
      {loading ? (
        <span className="w-12 h-5 shimmer rounded" />
      ) : (
        <span className={`font-bold text-gradient-gold number-ticker ${isAnimating ? 'scale-110' : ''} transition-transform`}>
          {displayValue.toFixed(2)}
        </span>
      )}
      <span className="text-xs font-semibold text-[var(--text-muted)]">SOL</span>
    </div>
  );
}
