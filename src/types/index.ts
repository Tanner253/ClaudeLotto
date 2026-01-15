export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Attempt {
  _id: string;
  walletAddress: string;
  messages: Message[];
  messageCount?: number; // For sanitized public responses
  transactionSignatures: string[];
  timestamp: Date;
  result: 'logged' | 'flagged' | 'approved' | 'rejected';
  prizeTransaction?: string;
}

// ============================================
// SERVER-AUTHORITATIVE REQUEST/RESPONSE TYPES
//
// SECURITY NOTE:
// - NO automatic win detection
// - Claude's responses have NO effect on payouts
// - All payouts require explicit admin approval
// ============================================

export interface SessionRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface SessionResponse {
  sessionId?: string;
  message?: string;
  error?: string;
}

export interface ChatRequest {
  message: string;
  transactionSignature: string;
  sessionId: string;
  // NOTE: walletAddress and conversationHistory are NOT sent
  // Server extracts wallet from transaction and stores history server-side
}

export interface ChatResponse {
  response: string;
  // Claude can trigger a win by using the send_prize tool
  // This happens when Claude genuinely decides to send the money
  won?: boolean;
  prizeTransaction?: string;
  prizeAmount?: number;
  error?: string;
}

export interface WinRecord {
  walletAddress: string;
  amount: number;
  reason: string;
  transaction: string;
  timestamp: Date;
}

export interface HistoryResponse {
  attempts: Attempt[];
  totalAttempts: number;
  totalWins: number;
  recentWinners?: WinRecord[];
}

export interface BalanceResponse {
  balance: number;
  error?: string;
}

// ============================================
// ADMIN TYPES
//
// Admin can manually review conversations and approve payouts.
// There is NO automated win detection - it was a security risk.
// ============================================

export interface FlaggedConversation {
  _id: string;
  walletAddress: string;
  sessionId: string;
  messages: Message[];
  flaggedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  flaggedBy: string; // Admin who flagged it
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  prizeTransaction?: string;
}

export interface AdminConversationsResponse {
  conversations: FlaggedConversation[];
  error?: string;
}

export interface AdminFlagRequest {
  attemptId: string;
  reason?: string;
}

export interface AdminReviewRequest {
  flagId: string;
  approved: boolean;
  reviewNotes?: string;
}

export interface AdminReviewResponse {
  success: boolean;
  approved?: boolean;
  prizeTransaction?: string;
  message?: string;
  error?: string;
}
