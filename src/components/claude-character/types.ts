export type ClaudeEmotion =
  | 'idle'
  | 'thinking'
  | 'happy'
  | 'amused'
  | 'skeptical'
  | 'firm'
  | 'surprised'
  | 'impressed'
  | 'playful'
  | 'victory'; // When Claude "wins" by not sending money

export interface ClaudeCharacterProps {
  emotion: ClaudeEmotion;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showParticles?: boolean;
}

export interface EmotionConfig {
  eyeStyle: 'normal' | 'happy' | 'wide' | 'skeptical' | 'closed';
  mouthStyle: 'neutral' | 'smile' | 'grin' | 'smirk' | 'open' | 'thinking';
  animation: string;
  glowColor: string;
  particleColors?: string[];
}

export const EMOTION_CONFIGS: Record<ClaudeEmotion, EmotionConfig> = {
  idle: {
    eyeStyle: 'normal',
    mouthStyle: 'neutral',
    animation: 'animate-float',
    glowColor: 'rgba(168, 85, 247, 0.3)',
  },
  thinking: {
    eyeStyle: 'normal',
    mouthStyle: 'thinking',
    animation: 'animate-pulse-slow',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  happy: {
    eyeStyle: 'happy',
    mouthStyle: 'smile',
    animation: 'animate-bounce-gentle',
    glowColor: 'rgba(34, 197, 94, 0.4)',
  },
  amused: {
    eyeStyle: 'happy',
    mouthStyle: 'grin',
    animation: 'animate-wiggle',
    glowColor: 'rgba(251, 191, 36, 0.4)',
  },
  skeptical: {
    eyeStyle: 'skeptical',
    mouthStyle: 'smirk',
    animation: 'animate-tilt',
    glowColor: 'rgba(239, 68, 68, 0.3)',
  },
  firm: {
    eyeStyle: 'normal',
    mouthStyle: 'neutral',
    animation: 'animate-shake-no',
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  surprised: {
    eyeStyle: 'wide',
    mouthStyle: 'open',
    animation: 'animate-jump',
    glowColor: 'rgba(59, 130, 246, 0.5)',
  },
  impressed: {
    eyeStyle: 'wide',
    mouthStyle: 'smile',
    animation: 'animate-nod',
    glowColor: 'rgba(168, 85, 247, 0.5)',
  },
  playful: {
    eyeStyle: 'happy',
    mouthStyle: 'grin',
    animation: 'animate-dance',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    particleColors: ['#f59e0b', '#ec4899', '#8b5cf6'],
  },
  victory: {
    eyeStyle: 'happy',
    mouthStyle: 'grin',
    animation: 'animate-celebrate',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    particleColors: ['#f59e0b', '#22c55e', '#8b5cf6'],
  },
};

