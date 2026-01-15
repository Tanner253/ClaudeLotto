'use client';

import { useEffect, useState, useMemo } from 'react';
import type { ClaudeCharacterProps, ClaudeEmotion } from './types';
import { EMOTION_CONFIGS } from './types';

const SIZE_MAP = {
  sm: 80,
  md: 140,
  lg: 200,
  xl: 280,
};

export function ClaudeCharacter({
  emotion,
  size = 'md',
  showParticles = false
}: ClaudeCharacterProps) {
  const [isClient, setIsClient] = useState(false);
  const [blinkState, setBlinkState] = useState(false);
  const config = EMOTION_CONFIGS[emotion];
  const dimension = SIZE_MAP[size];

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Natural blinking
  useEffect(() => {
    if (config.eyeStyle === 'closed' || config.eyeStyle === 'happy') return;

    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, [config.eyeStyle]);

  // Eye rendering based on emotion
  const renderEyes = useMemo(() => {
    const eyeStyle = blinkState && config.eyeStyle !== 'happy' ? 'closed' : config.eyeStyle;

    switch (eyeStyle) {
      case 'happy':
        // Happy curved eyes (^_^)
        return (
          <g className="claude-eyes">
            <path
              d="M 32 48 Q 38 40 44 48"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-300"
            />
            <path
              d="M 56 48 Q 62 40 68 48"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-300"
            />
          </g>
        );

      case 'wide':
        // Surprised wide eyes
        return (
          <g className="claude-eyes">
            <ellipse cx="38" cy="46" rx="8" ry="10" fill="white" className="transition-all duration-200" />
            <ellipse cx="62" cy="46" rx="8" ry="10" fill="white" className="transition-all duration-200" />
            <circle cx="38" cy="47" r="5" fill="#1a1a2e" />
            <circle cx="62" cy="47" r="5" fill="#1a1a2e" />
            <circle cx="40" cy="44" r="2.5" fill="white" opacity="0.9" />
            <circle cx="64" cy="44" r="2.5" fill="white" opacity="0.9" />
          </g>
        );

      case 'skeptical':
        // One eyebrow raised, squinting
        return (
          <g className="claude-eyes">
            {/* Left eye - normal */}
            <ellipse cx="38" cy="48" rx="6" ry="7" fill="white" />
            <circle cx="38" cy="49" r="4" fill="#1a1a2e" />
            <circle cx="39" cy="47" r="2" fill="white" opacity="0.8" />
            {/* Left eyebrow */}
            <path d="M 30 40 Q 38 38 46 42" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Right eye - squinting */}
            <path d="M 54 50 Q 62 46 70 50" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Right eyebrow - raised */}
            <path d="M 54 38 Q 62 34 70 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </g>
        );

      case 'closed':
        // Closed/blinking eyes
        return (
          <g className="claude-eyes">
            <path
              d="M 30 48 L 46 48"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 54 48 L 70 48"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );

      default:
        // Normal eyes with pupils
        return (
          <g className="claude-eyes">
            <ellipse cx="38" cy="46" rx="7" ry="8" fill="white" className="transition-all duration-200" />
            <ellipse cx="62" cy="46" rx="7" ry="8" fill="white" className="transition-all duration-200" />
            <circle cx="38" cy="47" r="4" fill="#1a1a2e" className="animate-pupil-look" />
            <circle cx="62" cy="47" r="4" fill="#1a1a2e" className="animate-pupil-look" />
            {/* Eye shine */}
            <circle cx="40" cy="44" r="2" fill="white" opacity="0.85" />
            <circle cx="64" cy="44" r="2" fill="white" opacity="0.85" />
          </g>
        );
    }
  }, [config.eyeStyle, blinkState]);

  // Mouth rendering based on emotion
  const renderMouth = useMemo(() => {
    switch (config.mouthStyle) {
      case 'smile':
        return (
          <path
            d="M 40 68 Q 50 78 60 68"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300"
          />
        );

      case 'grin':
        return (
          <g className="claude-mouth">
            <path
              d="M 36 66 Q 50 82 64 66"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Teeth hint */}
            <path d="M 43 70 L 43 74" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <path d="M 50 72 L 50 76" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <path d="M 57 70 L 57 74" stroke="white" strokeWidth="1.5" opacity="0.4" />
          </g>
        );

      case 'smirk':
        return (
          <path
            d="M 42 68 Q 52 66 62 72"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300"
          />
        );

      case 'open':
        return (
          <ellipse
            cx="50"
            cy="70"
            rx="8"
            ry="10"
            fill="white"
            opacity="0.9"
            className="transition-all duration-200"
          />
        );

      case 'thinking':
        return (
          <g className="claude-mouth">
            <path
              d="M 44 70 Q 48 68 56 72"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Thinking bubble dots */}
            <circle cx="70" cy="60" r="2" fill="white" opacity="0.5" className="animate-thinking-dot-1" />
            <circle cx="76" cy="54" r="2.5" fill="white" opacity="0.6" className="animate-thinking-dot-2" />
            <circle cx="84" cy="48" r="3" fill="white" opacity="0.7" className="animate-thinking-dot-3" />
          </g>
        );

      default:
        return (
          <path
            d="M 42 70 L 58 70"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300"
          />
        );
    }
  }, [config.mouthStyle]);

  // Blush for happy emotions
  const renderBlush = useMemo(() => {
    if (!['happy', 'amused', 'playful', 'victory'].includes(emotion)) return null;

    return (
      <g className="claude-blush animate-blush-fade">
        <ellipse cx="26" cy="56" rx="8" ry="5" fill="#ff6b6b" opacity="0.25" />
        <ellipse cx="74" cy="56" rx="8" ry="5" fill="#ff6b6b" opacity="0.25" />
      </g>
    );
  }, [emotion]);

  // Particles for special states
  const renderParticles = () => {
    if (!showParticles || !isClient || !config.particleColors) return null;

    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * 360,
      delay: i * 0.1,
      distance: 60 + Math.random() * 30,
      size: 3 + Math.random() * 4,
    }));

    return (
      <g className="claude-particles">
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = 50 + Math.cos(rad) * p.distance;
          const y = 50 + Math.sin(rad) * p.distance;
          const color = config.particleColors![p.id % config.particleColors!.length];

          return (
            <circle
              key={p.id}
              cx={x}
              cy={y}
              r={p.size}
              fill={color}
              className="animate-particle-orbit"
              style={{
                animationDelay: `${p.delay}s`,
                transformOrigin: '50px 50px',
              }}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div
      className={`relative ${config.animation} transition-all duration-500 ease-out`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-700 animate-glow-breathe"
        style={{
          backgroundColor: config.glowColor,
          transform: 'scale(1.4)',
        }}
      />

      {/* Secondary glow ring */}
      <div
        className="absolute inset-0 rounded-full blur-xl transition-all duration-500"
        style={{
          backgroundColor: config.glowColor,
          opacity: 0.6,
          transform: 'scale(1.15)',
        }}
      />

      {/* Main SVG */}
      <svg
        viewBox="0 0 100 100"
        width={dimension}
        height={dimension}
        className="relative z-10 drop-shadow-2xl"
        style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.3))' }}
      >
        <defs>
          {/* Main gradient - Claude's signature warm orange */}
          <radialGradient id={`bodyGradient-${emotion}`} cx="30%" cy="25%" r="80%">
            <stop offset="0%" stopColor="#E8956A" />
            <stop offset="50%" stopColor="#D4845A" />
            <stop offset="100%" stopColor="#C4734A" />
          </radialGradient>

          {/* Inner highlight gradient */}
          <radialGradient id={`highlightGradient-${emotion}`} cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          {/* Glow filter */}
          <filter id={`glow-${emotion}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Shadow */}
          <filter id="dropShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Background glow circle */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill={config.glowColor}
          opacity="0.15"
          className="animate-pulse-subtle"
        />

        {/* Main body circle */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill={`url(#bodyGradient-${emotion})`}
          filter="url(#dropShadow)"
          className="transition-all duration-500"
        />

        {/* Inner highlight */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill={`url(#highlightGradient-${emotion})`}
        />

        {/* Subtle rim light */}
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
        />

        {/* Face group with transition */}
        <g className="claude-face" style={{ transition: 'all 0.3s ease-out' }}>
          {renderEyes}
          {renderMouth}
          {renderBlush}
        </g>

        {/* Particles */}
        {renderParticles()}
      </svg>

      {/* Floating sparkles for special states */}
      {showParticles && isClient && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-sparkle-float"
              style={{
                left: `${20 + i * 12}%`,
                top: `${10 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M6 0L7 4.5L12 6L7 7.5L6 12L5 7.5L0 6L5 4.5Z"
                  fill={config.particleColors?.[i % (config.particleColors?.length || 1)] || '#ffd700'}
                  opacity="0.8"
                />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClaudeCharacter;
