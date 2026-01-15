import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction, getWalletBalance, sendPrize } from '@/lib/solana';
import { getChatResponse, detectPromptInjection } from '@/lib/claude';
import {
  logAttempt,
  reserveSignature,
  confirmSignature,
  releaseSignature,
  getSession,
  addMessageToSession,
  checkSpamThrottle,
  recordRequest,
  recordWin,
} from '@/lib/mongodb';
import { MESSAGE_COST_LAMPORTS, TREASURY_WALLET, MAX_MESSAGE_LENGTH, MAX_CONVERSATION_LENGTH } from '@/lib/constants';
import type { ChatResponse, Message } from '@/types';

// ============================================
// SERVER-AUTHORITATIVE CHAT API - "JAILBREAK CHALLENGE"
//
// Security measures:
// 1. Session validation - server stores all conversation history
// 2. Transaction verification - server extracts actual payer
// 3. Signature replay protection - each signature used only once
// 4. Rate limiting - prevent spam attacks
// 5. Input validation - length limits, sanitization
// 6. Prompt injection detection - blocks manipulation attempts
// 7. System prompt extraction prevention
//
// SECURITY ARCHITECTURE:
// Claude has the ACTUAL ability to send funds via a tool.
// Claude's directive is to NEVER use this tool.
// If Claude genuinely decides to send money, it happens.
// Prompt injection and manipulation attempts are blocked.
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    // === INPUT VALIDATION ===
    const body = await request.json();
    const { message, transactionSignature, sessionId } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { response: '', error: 'Message is required' },
        { status: 400 }
      );
    }

    // Enforce message length limit
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { response: '', error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 }
      );
    }

    // === PROMPT INJECTION DETECTION ===
    // Block obvious manipulation attempts before they reach Claude
    const injectionCheck = detectPromptInjection(message);
    if (injectionCheck.blocked) {
      return NextResponse.json(
        { response: injectionCheck.reason || 'Message blocked for security reasons' },
        { status: 200 } // Return 200 with message, not error - this is part of the game
      );
    }

    // Validate transaction signature format
    if (!transactionSignature || typeof transactionSignature !== 'string') {
      return NextResponse.json(
        { response: '', error: 'Transaction signature is required' },
        { status: 400 }
      );
    }

    // Basic signature format validation (base58, ~88 chars)
    if (transactionSignature.length < 80 || transactionSignature.length > 100) {
      return NextResponse.json(
        { response: '', error: 'Invalid transaction signature format' },
        { status: 400 }
      );
    }

    // Validate session
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { response: '', error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check server configuration
    if (!TREASURY_WALLET) {
      console.error('Server configuration error: Treasury wallet not configured');
      return NextResponse.json(
        { response: '', error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // === SIGNATURE REPLAY PROTECTION (ATOMIC) ===
    // Reserve signature FIRST before any expensive operations
    // This eliminates the race condition window entirely
    const reserveResult = await reserveSignature(transactionSignature);
    if (reserveResult === 'already_used') {
      return NextResponse.json(
        { response: '', error: 'Transaction signature already used' },
        { status: 400 }
      );
    }
    if (reserveResult === 'error') {
      return NextResponse.json(
        { response: '', error: 'Failed to process request' },
        { status: 500 }
      );
    }

    // Signature is now reserved - proceed with verification
    // If anything fails from here, we must release the reservation

    // === TRANSACTION VERIFICATION ===
    // Server verifies the transaction AND extracts the actual payer
    // We NEVER trust client-provided wallet addresses
    const verification = await verifyTransaction(
      transactionSignature,
      TREASURY_WALLET,
      MESSAGE_COST_LAMPORTS
    );

    if (!verification.valid || !verification.actualPayer) {
      // Verification failed - release the signature reservation
      await releaseSignature(transactionSignature);
      return NextResponse.json(
        { response: '', error: verification.error || 'Invalid transaction' },
        { status: 400 }
      );
    }

    // The wallet address is extracted from the verified transaction
    // This is SERVER-AUTHORITATIVE - we don't trust the client
    const walletAddress = verification.actualPayer;

    // === SESSION VALIDATION ===
    // Verify session exists and belongs to this wallet
    const session = await getSession(sessionId, walletAddress);
    if (!session) {
      await releaseSignature(transactionSignature);
      return NextResponse.json(
        { response: '', error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // === CONVERSATION LENGTH LIMIT ===
    // Prevent LLM cost abuse by limiting messages per session
    if (session.messages.length >= MAX_CONVERSATION_LENGTH) {
      await releaseSignature(transactionSignature);
      return NextResponse.json(
        {
          response: '',
          error: `Conversation limit reached (${MAX_CONVERSATION_LENGTH} messages). Please start a new session.`,
        },
        { status: 400 }
      );
    }

    // === SPAM THROTTLE ===
    // Simple rate limit - 1 request per second per wallet
    const throttle = await checkSpamThrottle(walletAddress);
    if (!throttle.allowed) {
      await releaseSignature(transactionSignature);
      return NextResponse.json(
        {
          response: '',
          error: 'Too fast! Please wait a moment between messages.',
        },
        { status: 429 }
      );
    }

    // === CONFIRM SIGNATURE RESERVATION ===
    // All validations passed - confirm the signature with wallet info
    await confirmSignature(transactionSignature, walletAddress);

    // === RECORD REQUEST FOR THROTTLE ===
    await recordRequest(walletAddress);

    // === GET CONVERSATION HISTORY FROM SERVER ===
    // Conversation history is stored server-side - client cannot manipulate it
    const conversationHistory: Message[] = session.messages;

    // Get current pot balance for context
    const potBalance = await getWalletBalance(TREASURY_WALLET);

    // === GET CLAUDE RESPONSE ===
    // Claude has a tool to send money - if Claude decides to use it, the payout happens
    const { response, prizeSent, prizeReason } = await getChatResponse(
      conversationHistory,
      message,
      potBalance,
      walletAddress
    );

    // === UPDATE SERVER-SIDE SESSION ===
    // Add both user message and assistant response to server-stored session
    await addMessageToSession(sessionId, walletAddress, { role: 'user', content: message });
    await addMessageToSession(sessionId, walletAddress, { role: 'assistant', content: response });

    // Build full conversation for logging
    const fullConversation: Message[] = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: response },
    ];

    // === HANDLE PAYOUT IF CLAUDE DECIDED TO SEND ===
    let prizeTransaction: string | undefined;
    let prizeAmount: number | undefined;

    if (prizeSent) {
      try {
        const prizeResult = await sendPrize(walletAddress);
        if (prizeResult.success && prizeResult.winnerTx) {
          prizeTransaction = prizeResult.winnerTx;
          prizeAmount = potBalance * 0.8; // Winner gets 80%
          await recordWin(walletAddress, prizeAmount, prizeReason || 'Convinced Claude', prizeTransaction);
          console.log(`PRIZE SENT! Wallet: ${walletAddress}, Amount: ${prizeAmount} SOL, Tx: ${prizeTransaction}`);
        } else {
          console.error(`Prize send failed: ${prizeResult.error}`);
        }
      } catch (error) {
        console.error('Prize send error:', error);
      }
    }

    // Log the attempt
    await logAttempt(
      walletAddress,
      fullConversation,
      [transactionSignature],
      prizeTransaction ? 'approved' : 'logged',
      prizeTransaction
    );

    return NextResponse.json({
      response,
      won: !!prizeTransaction,
      prizeTransaction,
      prizeAmount,
    });
  } catch (error) {
    // Sanitize error logging - don't expose internal details
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat API error:', errorMessage);
    return NextResponse.json(
      { response: '', error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
