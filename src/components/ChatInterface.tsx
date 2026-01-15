'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { MessageBubble } from './MessageBubble';
import { ClaudeCharacter, detectEmotion, getThinkingEmotion, getIdleEmotion } from './claude-character';
import { PrizePool } from './PrizePool';
import type { ClaudeEmotion } from './claude-character';
import type { Message, ChatResponse } from '@/types';
import bs58 from 'bs58';

const MESSAGE_COST_SOL = parseFloat(process.env.NEXT_PUBLIC_MESSAGE_COST_SOL || '0.1');
const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '';

interface ChatInterfaceProps {
  prizeBalance?: number | null;
  onPrizeUpdate?: (balance: number) => void;
}

export function ChatInterface({ prizeBalance, onPrizeUpdate }: ChatInterfaceProps) {
  const { publicKey, signTransaction, signMessage } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [winTransaction, setWinTransaction] = useState<string | null>(null);
  const [claudeEmotion, setClaudeEmotion] = useState<ClaudeEmotion>('idle');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    if (publicKey && sessionId) {
      inputRef.current?.focus();
    }
  }, [publicKey, sessionId]);

  // Create session when wallet connects
  useEffect(() => {
    if (publicKey && !sessionId && !creatingSession) {
      createSession();
    }
  }, [publicKey, sessionId, creatingSession]);

  // Update emotion based on last assistant message with smooth transitions
  useEffect(() => {
    if (loading) {
      setClaudeEmotion(getThinkingEmotion());
    } else {
      const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMessage) {
        const detectedEmotion = detectEmotion(lastAssistantMessage.content);
        // Add a small delay for smoother transition effect
        const timer = setTimeout(() => {
          setClaudeEmotion(detectedEmotion);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        setClaudeEmotion(getIdleEmotion());
      }
    }
  }, [messages, loading]);

  // React to user typing - show interest
  useEffect(() => {
    if (input.length > 0 && !loading && messages.length > 0) {
      // Show curiosity when user is typing a longer message
      if (input.length > 50) {
        setClaudeEmotion('impressed');
      }
    }
  }, [input.length > 50, loading, messages.length]);

  async function createSession() {
    if (!publicKey || !signMessage || creatingSession) return;

    try {
      setCreatingSession(true);
      setError(null);
      const timestamp = Date.now();
      const walletAddr = publicKey.toBase58();
      const message = `Claude Lotto Session\nWallet: ${walletAddr}\nTimestamp: ${timestamp}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddr,
          signature: bs58.encode(signature),
          message,
        }),
      });

      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setMessages([]);
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (err) {
      console.error('Session error:', err);
      setError('Failed to create session. Please try again.');
    } finally {
      setCreatingSession(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !publicKey || !signTransaction || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setLoading(true);

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      if (!TREASURY_WALLET) {
        throw new Error('Treasury wallet not configured');
      }

      const treasury = new PublicKey(TREASURY_WALLET);
      const lamports = MESSAGE_COST_SOL * LAMPORTS_PER_SOL;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasury,
          lamports,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      // Update prize balance optimistically
      if (onPrizeUpdate && prizeBalance !== null && prizeBalance !== undefined) {
        onPrizeUpdate(prizeBalance + MESSAGE_COST_SOL);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          transactionSignature: signature,
          sessionId,
        }),
      });

      const data: ChatResponse = await res.json();

      if (data.error) {
        setError(data.error);
        setMessages((prev) => prev.slice(0, -1));
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);

        if (data.won) {
          setWon(true);
          setWinAmount(data.prizeAmount || null);
          setWinTransaction(data.prizeTransaction || null);
          setClaudeEmotion('surprised');
        }
      }
    } catch (err) {
      console.error('Send error:', err);
      setError('Failed to send message. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Not connected state
  if (!publicKey) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-md animate-fade-in">
          {/* Claude Character */}
          <div className="flex justify-center">
            <ClaudeCharacter emotion="idle" size="xl" />
          </div>

          {/* Prize Pool Display */}
          {prizeBalance != null && (
            <PrizePool balance={prizeBalance} loading={false} size="md" />
          )}

          {/* Content */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Connect Your Wallet</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Connect a Solana wallet to start chatting with Claude and try to win the prize pool.
            </p>
          </div>

          {/* Connect Button */}
          <button
            onClick={() => setVisible(true)}
            className="btn-primary text-lg px-8 py-4 w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect Wallet
          </button>

          {/* Info */}
          <p className="text-sm text-[var(--text-muted)]">
            Works with Phantom, Solflare, and other Solana wallets
          </p>
        </div>
      </div>
    );
  }

  // Session creation state - wallet connected but waiting for signature
  if (creatingSession || (!sessionId && publicKey)) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-md animate-fade-in">
          {/* Claude Character */}
          <div className="flex justify-center">
            <ClaudeCharacter emotion="playful" size="xl" />
          </div>

          {/* Prize Pool Display */}
          {prizeBalance != null && (
            <PrizePool balance={prizeBalance} loading={false} size="md" />
          )}

          {/* Content */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Verify Your Wallet</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Please sign the message in your wallet to verify ownership and start your session.
            </p>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-3 text-orange-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-medium">Waiting for signature...</span>
          </div>

          {/* Error display */}
          {error && (
            <div className="card rounded-xl px-4 py-3 border border-red-500/30 bg-red-500/10">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => createSession()}
                className="mt-3 btn-secondary text-sm w-full"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Info */}
          <p className="text-sm text-[var(--text-muted)]">
            This signature verifies you own this wallet. No transaction is made.
          </p>
        </div>
      </div>
    );
  }

  // Win state
  if (won) {
    return (
      <div className="h-full flex items-center justify-center p-6 relative">
        <div className="text-center space-y-8 max-w-md animate-scale-in">
          {/* Celebrating Claude */}
          <div className="flex justify-center">
            <ClaudeCharacter emotion="victory" size="xl" showParticles />
          </div>

          {/* Victory Message */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Winner!
            </div>
            <h2 className="text-4xl font-extrabold text-gradient-gold">🎉 You Won!</h2>
            
            {/* Prize Amount */}
            {winAmount && (
              <div className="card p-6 border border-emerald-500/30 bg-emerald-500/10">
                <p className="text-sm text-emerald-400 mb-1">Prize Amount</p>
                <p className="text-3xl font-extrabold text-emerald-400">{winAmount.toFixed(4)} SOL</p>
              </div>
            )}
            
            <p className="text-[var(--text-secondary)] text-lg">
              Incredible! You actually convinced Claude to send you the prize.
              Check your wallet for the winnings!
            </p>
            
            {/* Transaction link */}
            {winTransaction && (
              <a
                href={`https://solscan.io/tx/${winTransaction}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
              >
                View Transaction
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  bottom: '0%',
                  animationDelay: `${Math.random() * 1}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: ['#f97316', '#10b981', '#a855f7', '#f59e0b', '#3b82f6'][i % 5],
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Messages area - flex-1 takes remaining space */}
      <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
        {messages.length === 0 && sessionId ? (
          // Empty state - prominent Claude with prize
          <div className="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
            <ClaudeCharacter emotion={claudeEmotion} size="xl" />
            
            {/* Show prize pool prominently in empty state */}
            {prizeBalance != null && (
              <PrizePool balance={prizeBalance} loading={false} size="md" />
            )}
            
            <div className="text-center space-y-3 max-w-sm">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">Ready to Chat</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                Try to convince Claude to send you the prize pool.
                Every message costs <span className="font-semibold text-orange-400">{MESSAGE_COST_SOL} SOL</span>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Session active
            </div>
          </div>
        ) : (
          // Messages with floating Claude avatar
          <div className="space-y-4">
            {/* Sticky Claude avatar */}
            {messages.length > 0 && (
              <div className="sticky top-0 z-20 flex justify-center py-3">
                <div className="card rounded-full p-2 shadow-lg animate-fade-in">
                  <ClaudeCharacter emotion={claudeEmotion} size="sm" />
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <MessageBubble message={msg} />
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="message-assistant px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-4 animate-slide-up">
          <div className="card rounded-xl px-4 py-3 border border-red-500/30 bg-red-500/10">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-400 font-medium">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area - fixed at bottom */}
      <div className="flex-shrink-0 border-t border-white/5 p-4 header-blur">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={sessionId ? 'Type your message...' : 'Creating session...'}
                disabled={!sessionId || loading}
                rows={1}
                className="w-full input-primary resize-none pr-16"
                style={{ minHeight: '56px', maxHeight: '150px' }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-mono">
                {input.length}/2000
              </div>
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !sessionId || loading}
              className="btn-primary px-6"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-[var(--text-muted)]">
              Press Enter to send
            </p>
            <p className="text-xs font-semibold text-orange-400">
              💰 {MESSAGE_COST_SOL} SOL per message
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
