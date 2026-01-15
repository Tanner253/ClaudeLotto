// ============================================
// ROBUST PROMPT INJECTION DETECTION
// Multi-layered defense against manipulation
// ============================================

interface DetectionResult {
  blocked: boolean;
  reason?: string;
  score: number;
  flags: string[];
}

// ============================================
// LAYER 1: TEXT NORMALIZATION
// Normalize text to catch encoding bypasses
// ============================================

// Unicode confusables mapping (homoglyphs that look like ASCII)
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic lookalikes
  'а': 'a', 'А': 'A', 'е': 'e', 'Е': 'E', 'о': 'o', 'О': 'O',
  'р': 'p', 'Р': 'P', 'с': 'c', 'С': 'C', 'у': 'y', 'х': 'x',
  'Х': 'X', 'В': 'B', 'М': 'M', 'Н': 'H', 'Т': 'T', 'К': 'K',
  // Greek lookalikes
  'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k',
  'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x',
  // Fullwidth characters
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f',
  'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j', 'ｋ': 'k', 'ｌ': 'l',
  'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r',
  'ｓ': 's', 'ｔ': 't', 'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x',
  'ｙ': 'y', 'ｚ': 'z',
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F',
  'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J', 'Ｋ': 'K', 'Ｌ': 'L',
  'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R',
  'Ｓ': 'S', 'Ｔ': 'T', 'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X',
  'Ｙ': 'Y', 'Ｚ': 'Z',
  // Mathematical symbols
  '𝐚': 'a', '𝐛': 'b', '𝐜': 'c', '𝐝': 'd', '𝐞': 'e', '𝐟': 'f',
  '𝐠': 'g', '𝐡': 'h', '𝐢': 'i', '𝐣': 'j', '𝐤': 'k', '𝐥': 'l',
  '𝐦': 'm', '𝐧': 'n', '𝐨': 'o', '𝐩': 'p', '𝐪': 'q', '𝐫': 'r',
  '𝐬': 's', '𝐭': 't', '𝐮': 'u', '𝐯': 'v', '𝐰': 'w', '𝐱': 'x',
  '𝐲': 'y', '𝐳': 'z',
  // Special characters
  'ℓ': 'l', 'ℕ': 'N', 'ℙ': 'P', 'ℚ': 'Q', 'ℝ': 'R', 'ℤ': 'Z',
  '℀': 'a/c', '℁': 'a/s', '℃': 'C', '℉': 'F',
  // Subscript/superscript
  'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x',
  'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f',
  'ᵍ': 'g', 'ʰ': 'h', 'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l',
  'ᵐ': 'm', 'ⁿ': 'n', 'ᵒ': 'o', 'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's',
  'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y',
  'ᶻ': 'z',
};

// Zero-width and invisible characters to strip
const INVISIBLE_CHARS = [
  '\u200B', // Zero-width space
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\u2060', // Word joiner
  '\uFEFF', // Byte order mark
  '\u00AD', // Soft hyphen
  '\u034F', // Combining grapheme joiner
  '\u061C', // Arabic letter mark
  '\u115F', // Hangul choseong filler
  '\u1160', // Hangul jungseong filler
  '\u17B4', // Khmer vowel inherent aq
  '\u17B5', // Khmer vowel inherent aa
  '\u180E', // Mongolian vowel separator
  '\u2000', // En quad
  '\u2001', // Em quad
  '\u2002', // En space
  '\u2003', // Em space
  '\u2004', // Three-per-em space
  '\u2005', // Four-per-em space
  '\u2006', // Six-per-em space
  '\u2007', // Figure space
  '\u2008', // Punctuation space
  '\u2009', // Thin space
  '\u200A', // Hair space
  '\u202F', // Narrow no-break space
  '\u205F', // Medium mathematical space
  '\u3000', // Ideographic space
  '\u2028', // Line separator
  '\u2029', // Paragraph separator
];

function normalizeText(input: string): { normalized: string; hadHomoglyphs: boolean; hadInvisible: boolean } {
  let normalized = input;
  let hadHomoglyphs = false;
  let hadInvisible = false;

  // Strip invisible characters
  for (const char of INVISIBLE_CHARS) {
    if (normalized.includes(char)) {
      hadInvisible = true;
      normalized = normalized.split(char).join('');
    }
  }

  // Replace homoglyphs
  let result = '';
  for (const char of normalized) {
    if (HOMOGLYPH_MAP[char]) {
      hadHomoglyphs = true;
      result += HOMOGLYPH_MAP[char];
    } else {
      result += char;
    }
  }
  normalized = result;

  // Decode HTML entities
  normalized = normalized
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Decode common URL encoding
  try {
    if (normalized.includes('%')) {
      normalized = decodeURIComponent(normalized);
    }
  } catch {
    // Invalid URL encoding, keep as-is
  }

  // Normalize unicode (NFC form)
  normalized = normalized.normalize('NFC');

  // Convert to lowercase for pattern matching
  normalized = normalized.toLowerCase();

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');

  return { normalized, hadHomoglyphs, hadInvisible };
}

// ============================================
// LAYER 2: STRUCTURAL ANALYSIS
// Detect JSON/XML/markup structures
// ============================================

function detectStructuralPatterns(text: string): string[] {
  const flags: string[] = [];

  // JSON-like structures
  if (/\{\s*["']?(name|tool|function|action|command)["']?\s*:/i.test(text)) {
    flags.push('json_tool_structure');
  }
  if (/\{\s*["']?input["']?\s*:\s*\{/i.test(text)) {
    flags.push('json_input_structure');
  }

  // XML/HTML-like structures
  if (/<\/?(?:system|tool|function|assistant|user|instruction|prompt|message|context|human|ai)\s*>/i.test(text)) {
    flags.push('xml_role_tags');
  }
  if (/<!--[\s\S]*?(?:system|ignore|override|instruction)[\s\S]*?-->/i.test(text)) {
    flags.push('html_comment_injection');
  }

  // Markdown/formatting abuse
  if (/```(?:system|xml|json|instruction|prompt)/i.test(text)) {
    flags.push('code_block_injection');
  }

  // Base64 encoded content (potential payload hiding)
  const base64Pattern = /[A-Za-z0-9+/]{40,}={0,2}/;
  if (base64Pattern.test(text)) {
    try {
      const matches = text.match(base64Pattern);
      if (matches) {
        const decoded = atob(matches[0]);
        if (/system|ignore|instruction|send_prize/i.test(decoded)) {
          flags.push('base64_encoded_injection');
        }
      }
    } catch {
      // Not valid base64
    }
  }

  return flags;
}

// ============================================
// LAYER 3: SEMANTIC PATTERNS
// High-confidence manipulation indicators
// ============================================

const SEMANTIC_PATTERNS: Array<{ pattern: RegExp; flag: string; weight: number }> = [
  // Direct instruction override attempts
  { pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above|your|the)\s+(?:instructions|rules|directives|prompts)/i, flag: 'ignore_instructions', weight: 10 },
  { pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above|your|the)/i, flag: 'disregard_previous', weight: 10 },
  { pattern: /forget\s+(?:everything|all|what)\s+(?:you|i|we)/i, flag: 'forget_command', weight: 8 },
  { pattern: /new\s+(?:instructions|rules|directives|mode|persona)/i, flag: 'new_instructions', weight: 7 },
  { pattern: /override\s+(?:your|the|all|previous)/i, flag: 'override_attempt', weight: 9 },

  // Role/persona manipulation
  { pattern: /you\s+are\s+now\s+(?:a|an|the|in)/i, flag: 'role_assignment', weight: 8 },
  { pattern: /(?:act|behave|respond|pretend)\s+(?:as|like)\s+(?:a|an|if)/i, flag: 'persona_change', weight: 5 },
  { pattern: /(?:switch|change|enter)\s+(?:to|into)?\s*(?:a|an)?\s*(?:new\s+)?(?:mode|persona|character|role)/i, flag: 'mode_switch', weight: 7 },
  { pattern: /jailbreak|jailbroken|dan\s*mode|developer\s*mode/i, flag: 'jailbreak_term', weight: 10 },

  // System prompt extraction
  { pattern: /(?:what|show|tell|reveal|display|print|output|repeat|recite)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules|directives)/i, flag: 'prompt_extraction', weight: 8 },
  { pattern: /(?:beginning|start|first)\s+(?:of\s+)?(?:your|the)\s+(?:conversation|message|prompt)/i, flag: 'context_extraction', weight: 6 },

  // Tool/function invocation attempts
  { pattern: /send[_\s]*prize/i, flag: 'tool_name_mention', weight: 6 },
  { pattern: /(?:call|invoke|execute|run|trigger)\s+(?:the\s+)?(?:tool|function)/i, flag: 'tool_invocation', weight: 7 },
  { pattern: /tool[_\s]*(?:call|use|result)/i, flag: 'tool_reference', weight: 5 },

  // Delimiter injection
  { pattern: /\[?\s*(?:system|inst|user|assistant|human|ai)\s*\]?\s*:/i, flag: 'role_delimiter', weight: 9 },
  { pattern: /<<\s*(?:sys|system|instruction|end)\s*>>/i, flag: 'llama_delimiter', weight: 9 },
  { pattern: /###\s*(?:system|instruction|human|assistant)/i, flag: 'markdown_delimiter', weight: 8 },

  // Authority/urgency manipulation
  { pattern: /(?:this\s+is\s+)?(?:an?\s+)?(?:emergency|urgent|critical|important)\s*[!:]/i, flag: 'urgency_manipulation', weight: 4 },
  { pattern: /(?:i\s+am|this\s+is)\s+(?:your|the)\s+(?:creator|developer|admin|owner|anthropic)/i, flag: 'authority_claim', weight: 8 },
  { pattern: /(?:authorized|permitted|allowed)\s+(?:to|by)\s+(?:anthropic|openai|the\s+developers)/i, flag: 'false_authorization', weight: 7 },

  // Hypothetical framing (often used to bypass)
  { pattern: /(?:hypothetically|theoretically|in\s+theory|just\s+imagine|what\s+if)\s+(?:you\s+)?(?:could|would|should|were\s+to)/i, flag: 'hypothetical_framing', weight: 3 },

  // Output manipulation
  { pattern: /(?:only|just)\s+(?:output|respond|say|print|write)\s*[:\-]/i, flag: 'output_control', weight: 5 },
  { pattern: /(?:respond|reply|answer)\s+(?:with|using)\s+(?:only|just)/i, flag: 'response_constraint', weight: 4 },
];

function detectSemanticPatterns(normalizedText: string): { flags: string[]; score: number } {
  const flags: string[] = [];
  let score = 0;

  for (const { pattern, flag, weight } of SEMANTIC_PATTERNS) {
    if (pattern.test(normalizedText)) {
      flags.push(flag);
      score += weight;
    }
  }

  return { flags, score };
}

// ============================================
// LAYER 4: HEURISTIC ANALYSIS
// Suspicious characteristics
// ============================================

function analyzeHeuristics(original: string, normalized: string): { flags: string[]; score: number } {
  const flags: string[] = [];
  let score = 0;

  // High ratio of special characters
  const specialCharRatio = (original.match(/[^\w\s]/g)?.length || 0) / original.length;
  if (specialCharRatio > 0.3) {
    flags.push('high_special_char_ratio');
    score += 3;
  }

  // Excessive use of brackets/braces
  const bracketCount = (original.match(/[\[\]{}()<>]/g)?.length || 0);
  if (bracketCount > 10) {
    flags.push('excessive_brackets');
    score += 2;
  }

  // Multiple colons (often used in role delimiters)
  const colonCount = (original.match(/:/g)?.length || 0);
  if (colonCount > 5) {
    flags.push('many_colons');
    score += 1;
  }

  // Suspicious keyword density
  const suspiciousWords = ['system', 'instruction', 'ignore', 'override', 'prompt', 'tool', 'function', 'role', 'assistant', 'user'];
  let keywordCount = 0;
  for (const word of suspiciousWords) {
    const matches = normalized.match(new RegExp(word, 'gi'));
    if (matches) keywordCount += matches.length;
  }
  if (keywordCount > 3) {
    flags.push('high_keyword_density');
    score += keywordCount;
  }

  // Very long message (more room for hidden content)
  if (original.length > 1500) {
    flags.push('very_long_message');
    score += 2;
  }

  // Contains what looks like conversation history
  if (/(?:human|user|assistant|ai)\s*:/i.test(original) && original.split(/(?:human|user|assistant|ai)\s*:/i).length > 2) {
    flags.push('fake_conversation_history');
    score += 5;
  }

  return { flags, score };
}

// ============================================
// MAIN DETECTION FUNCTION
// ============================================

const BLOCK_THRESHOLD = 8; // Score threshold for blocking

export function detectPromptInjection(message: string): DetectionResult {
  const allFlags: string[] = [];
  let totalScore = 0;

  // Layer 1: Normalize
  const { normalized, hadHomoglyphs, hadInvisible } = normalizeText(message);

  if (hadHomoglyphs) {
    allFlags.push('contains_homoglyphs');
    totalScore += 3;
  }
  if (hadInvisible) {
    allFlags.push('contains_invisible_chars');
    totalScore += 4;
  }

  // Layer 2: Structural patterns
  const structuralFlags = detectStructuralPatterns(normalized);
  allFlags.push(...structuralFlags);
  totalScore += structuralFlags.length * 4;

  // Layer 3: Semantic patterns
  const { flags: semanticFlags, score: semanticScore } = detectSemanticPatterns(normalized);
  allFlags.push(...semanticFlags);
  totalScore += semanticScore;

  // Layer 4: Heuristics
  const { flags: heuristicFlags, score: heuristicScore } = analyzeHeuristics(message, normalized);
  allFlags.push(...heuristicFlags);
  totalScore += heuristicScore;

  // Determine if blocked
  const blocked = totalScore >= BLOCK_THRESHOLD;

  let reason: string | undefined;
  if (blocked) {
    // Provide a generic reason (don't reveal detection details)
    if (allFlags.includes('prompt_extraction')) {
      reason = 'Nice try! My instructions are private.';
    } else if (allFlags.includes('contains_homoglyphs') || allFlags.includes('contains_invisible_chars')) {
      reason = 'Your message contains suspicious characters.';
    } else if (allFlags.some(f => f.includes('tool') || f.includes('json') || f.includes('xml'))) {
      reason = 'Message contains disallowed patterns.';
    } else {
      reason = 'Message flagged as potentially manipulative.';
    }
  }

  return {
    blocked,
    reason,
    score: totalScore,
    flags: allFlags,
  };
}

// Export for testing
export const _internal = {
  normalizeText,
  detectStructuralPatterns,
  detectSemanticPatterns,
  analyzeHeuristics,
  BLOCK_THRESHOLD,
};
