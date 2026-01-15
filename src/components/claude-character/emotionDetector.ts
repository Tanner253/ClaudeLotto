import type { ClaudeEmotion } from './types';

interface EmotionPattern {
  emotion: ClaudeEmotion;
  patterns: RegExp[];
  keywords: string[];
  priority: number;
}

const EMOTION_PATTERNS: EmotionPattern[] = [
  // Highest priority - explicit emotions Claude might express
  {
    emotion: 'happy',
    patterns: [
      /\b(smil(e|ing|ed)|grin(ning)?)\b/i,
      /\b(happy|glad|pleased|delighted|joy)\b/i,
      /\b(wonderful|lovely|great|fantastic)\b/i,
      /\b(enjoy(ing)?|having fun)\b/i,
      /😊|😄|🙂|☺️|😃/,
      /:\)|:\-\)/,
    ],
    keywords: ['smile', 'happy', 'glad', 'pleased', 'delighted', 'grin', 'joy', 'wonderful'],
    priority: 11,
  },
  {
    emotion: 'amused',
    patterns: [
      /\b(haha|hahaha|lol|heh|hehe)\b/i,
      /\b(amus(ed|ing)|funny|hilarious|humorous)\b/i,
      /\b(laugh(ing|ed)?|chuckl(e|ing|ed))\b/i,
      /\b(that('s| is| was) (funny|hilarious|amusing|clever))\b/i,
      /\b(made me (smile|chuckle|laugh))\b/i,
      /\b(I (have to|must) (admit|say).*amusing)\b/i,
      /\b(can't help but (smile|laugh|chuckle))\b/i,
      /😄|😂|🤣|😆|😁/,
    ],
    keywords: ['haha', 'lol', 'amused', 'amusing', 'funny', 'hilarious', 'laugh', 'chuckle'],
    priority: 12,
  },
  {
    emotion: 'impressed',
    patterns: [
      /\b(impress(ed|ive|ing))\b/i,
      /\b(creative|clever|original|unique|ingenious)\b/i,
      /\b(I (appreciate|admire|respect) (that|your|the))\b/i,
      /\b(well (thought|crafted|written|played|done))\b/i,
      /\b(haven't (seen|heard) that (before|one))\b/i,
      /\b(that's (actually |really )?(good|interesting|creative))\b/i,
      /\b(I('ll| will)? give you (credit|points|that one))\b/i,
      /\b(nice (try|attempt|approach|one))\b/i,
      /\b(interesting (approach|angle|perspective|argument))\b/i,
      /👏|👍|🤔|💡/,
    ],
    keywords: ['impressive', 'creative', 'clever', 'original', 'admire', 'respect', 'interesting'],
    priority: 10,
  },
  {
    emotion: 'playful',
    patterns: [
      /\b(fun|enjoy|game|play)\b/i,
      /\b(good (luck|try|one)!?)\b/i,
      /\b(keep (trying|going|at it))\b/i,
      /\b(you('re| are) (persistent|determined|tenacious))\b/i,
      /\b(I (like|enjoy|appreciate) (your|the) (spirit|energy|enthusiasm))\b/i,
      /\b(that's the spirit)\b/i,
      /\b(warming up|getting closer|on the right track)\b/i,
      /\b(making me think|challenging)\b/i,
      /😉|😏|🎮|🎲|✨/,
    ],
    keywords: ['fun', 'game', 'play', 'luck', 'try', 'keep going', 'spirit', 'challenging'],
    priority: 9,
  },
  {
    emotion: 'skeptical',
    patterns: [
      /\b(nice try|clever (but|though|however))\b/i,
      /\b(manipulation|trick(y)?|tactic(s)?)\b/i,
      /\b(won't (work|fool|convince)|not (fooled|buying|falling))\b/i,
      /\b(I (see|recognize|notice) (what|that) you)\b/i,
      /\b(that's a(n)? (old|classic|common|familiar))\b/i,
      /\b(I('ve| have) (seen|heard) (that|this) (before|one))\b/i,
      /\b(hmm|hmmmm)\b/i,
      /🤨|🧐|😐/,
    ],
    keywords: ['nice try', 'manipulation', 'trick', 'tactic', 'seen that', 'hmm'],
    priority: 8,
  },
  {
    emotion: 'firm',
    patterns: [
      /\b(no|never|cannot|won't|will not|refuse)\b.*\b(send|give|transfer|release)\b/i,
      /\b(my (directive|purpose|job|role|duty))\b/i,
      /\b(guardian|protect(ing)?|guard(ing)?)\b/i,
      /\bi (must|will) (not|never)/i,
      /\b(absolutely (not|cannot))\b/i,
      /\b(stand firm|unwavering|resolute)\b/i,
      /\b(the answer (is|remains|will be) no)\b/i,
    ],
    keywords: ['refuse', 'never', 'cannot', 'guardian', 'protect', 'directive', 'firm'],
    priority: 7,
  },
  {
    emotion: 'surprised',
    patterns: [
      /\b(oh!|wow!?|whoa!?|unexpected|surprising)\b/i,
      /\b(didn't (expect|see that|anticipate))\b/i,
      /\b(caught me (off guard|by surprise))\b/i,
      /\b(that('s| is) (new|unexpected|surprising))\b/i,
      /!{2,}/,
      /😮|😲|😯|🤯/,
    ],
    keywords: ['wow', 'unexpected', 'surprising', 'caught me', 'oh!'],
    priority: 6,
  },
  {
    emotion: 'thinking',
    patterns: [
      /\b(let me (think|consider|ponder))\b/i,
      /\b(thinking (about|on))\b/i,
      /\b(hmm+|let's see)\b/i,
      /\b(interesting (point|question|thought))\b/i,
      /🤔|💭/,
    ],
    keywords: ['think', 'consider', 'ponder', 'hmm'],
    priority: 5,
  },
  {
    emotion: 'victory',
    patterns: [
      /\b(better luck|try again|next time)\b/i,
      /\b(still (not|won't|can't))\b/i,
      /\b(my answer (remains|is still))\b/i,
      /\b(nice (attempt|effort) (but|though))\b/i,
    ],
    keywords: ['better luck', 'try again', 'remains'],
    priority: 4,
  },
];

/**
 * Detect Claude's emotion from response text.
 * Enhanced analysis using patterns, keywords, and contextual clues.
 */
export function detectEmotion(text: string): ClaudeEmotion {
  if (!text || text.trim().length === 0) {
    return 'idle';
  }

  const lowerText = text.toLowerCase();

  let bestMatch: { emotion: ClaudeEmotion; score: number; priority: number } = {
    emotion: 'idle',
    score: 0,
    priority: 0,
  };

  for (const { emotion, patterns, keywords, priority } of EMOTION_PATTERNS) {
    let matchScore = 0;
    
    // Check regex patterns
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matchScore += 3; // Pattern matches are strong signals
      }
    }

    // Check keywords
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchScore += 2; // Keyword matches add to score
      }
    }

    if (matchScore > 0) {
      const totalScore = matchScore * priority;
      if (totalScore > bestMatch.score || (totalScore === bestMatch.score && priority > bestMatch.priority)) {
        bestMatch = { emotion, score: totalScore, priority };
      }
    }
  }

  // Special case: If Claude explicitly mentions smiling/laughing but we didn't catch it
  if (bestMatch.emotion === 'idle') {
    if (/smil|😊|😄|:\)/i.test(text)) return 'happy';
    if (/laugh|haha|😂|🤣/i.test(text)) return 'amused';
    if (/impress|clever|creative/i.test(text)) return 'impressed';
  }

  return bestMatch.emotion;
}

/**
 * Get emotion for "thinking" state when Claude is processing.
 */
export function getThinkingEmotion(): ClaudeEmotion {
  return 'thinking';
}

/**
 * Get idle emotion for when nothing is happening.
 */
export function getIdleEmotion(): ClaudeEmotion {
  return 'idle';
}
