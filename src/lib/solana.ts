import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  SendTransactionError,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { SOLANA_RPC_URL, WINNER_PERCENTAGE, DEV_PERCENTAGE } from './constants';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  }
  return connection;
}

// ============================================
// SERVER-AUTHORITATIVE TRANSACTION VERIFICATION
// Extracts and returns the ACTUAL payer from the transaction
// NEVER trust client-provided wallet addresses
// ============================================

export interface TransactionVerificationResult {
  valid: boolean;
  error?: string;
  // Server extracts the actual payer - NEVER trust client input
  actualPayer?: string;
  amount?: number;
  blockTime?: number;
}

export async function verifyTransaction(
  signature: string,
  expectedRecipient: string,
  expectedAmountLamports: number
): Promise<TransactionVerificationResult> {
  try {
    const conn = getConnection();
    const tx = await conn.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    if (tx.meta?.err) {
      return { valid: false, error: 'Transaction failed' };
    }

    // Check transaction age - reject transactions older than 10 minutes
    // This prevents replay attacks with old transactions
    const blockTime = tx.blockTime;
    if (blockTime) {
      const txAge = Date.now() / 1000 - blockTime;
      const MAX_TX_AGE_SECONDS = 600; // 10 minutes
      if (txAge > MAX_TX_AGE_SECONDS) {
        return { valid: false, error: 'Transaction too old' };
      }
    }

    const accountKeys = tx.transaction.message.getAccountKeys();
    const instructions = tx.transaction.message.compiledInstructions;

    for (const ix of instructions) {
      const programId = accountKeys.get(ix.programIdIndex);
      if (!programId?.equals(SystemProgram.programId)) continue;

      // Check if this is a transfer instruction (instruction type 2)
      if (ix.data[0] !== 2) continue;

      const fromIndex = ix.accountKeyIndexes[0];
      const toIndex = ix.accountKeyIndexes[1];
      const fromKey = accountKeys.get(fromIndex);
      const toKey = accountKeys.get(toIndex);

      if (!fromKey || !toKey) continue;

      // Decode the amount from the instruction data (bytes 4-12, little endian u64)
      const amountBuffer = ix.data.slice(4, 12);
      const amount = Number(Buffer.from(amountBuffer).readBigUInt64LE(0));

      // Server extracts the actual payer from the transaction
      // We verify the recipient and amount, then RETURN the actual payer
      if (
        toKey.toBase58() === expectedRecipient &&
        amount >= expectedAmountLamports * 0.99 // Allow 1% tolerance for rounding
      ) {
        return {
          valid: true,
          actualPayer: fromKey.toBase58(), // SERVER extracts this - never trust client
          amount,
          blockTime: blockTime || undefined,
        };
      }
    }

    return { valid: false, error: 'No matching transfer found in transaction' };
  } catch {
    // Don't log full error details - could contain sensitive info
    return { valid: false, error: 'Failed to verify transaction' };
  }
}

export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const conn = getConnection();
    const pubkey = new PublicKey(walletAddress);
    const balance = await conn.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

export async function sendPrize(
  winnerAddress: string
): Promise<{ success: boolean; winnerTx?: string; devTx?: string; error?: string }> {
  try {
    const privateKeyStr = process.env.SOLANA_PRIVATE_KEY;
    const devWalletStr = process.env.DEV_WALLET;
    const treasuryWalletStr = process.env.TREASURY_WALLET;

    if (!privateKeyStr || !devWalletStr || !treasuryWalletStr) {
      return { success: false, error: 'Server wallet configuration missing' };
    }

    const conn = getConnection();
    
    let secretKey: Uint8Array;
    try {
      secretKey = bs58.decode(privateKeyStr);
    } catch {
      return { success: false, error: 'Invalid private key format' };
    }
    
    let treasuryKeypair: Keypair;
    try {
      treasuryKeypair = Keypair.fromSecretKey(secretKey);
    } catch {
      return { success: false, error: 'Invalid private key' };
    }
    
    const winnerPubkey = new PublicKey(winnerAddress);
    const devPubkey = new PublicKey(devWalletStr);

    // Get current balance
    const balance = await conn.getBalance(treasuryKeypair.publicKey);

    // Keep enough SOL for rent-exemption + transaction fees
    // Rent-exempt minimum is ~0.00089 SOL, we keep 0.002 SOL to be safe
    const RENT_EXEMPT_RESERVE = 2_000_000; // 0.002 SOL
    const availableBalance = balance - RENT_EXEMPT_RESERVE;

    if (availableBalance <= 0) {
      return { success: false, error: `Insufficient funds in treasury. Need more than ${RENT_EXEMPT_RESERVE / LAMPORTS_PER_SOL} SOL for rent exemption.` };
    }

    const winnerAmount = Math.floor(availableBalance * WINNER_PERCENTAGE);
    const devAmount = Math.floor(availableBalance * DEV_PERCENTAGE);

    // Create transaction with both transfers
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');

    const transaction = new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer: treasuryKeypair.publicKey,
    });

    // Transfer to winner (80%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: winnerPubkey,
        lamports: winnerAmount,
      })
    );

    // Transfer to dev (20%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: devPubkey,
        lamports: devAmount,
      })
    );

    // Sign and send
    transaction.sign(treasuryKeypair);
    
    const signature = await conn.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Confirm transaction
    await conn.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    return {
      success: true,
      winnerTx: signature,
      devTx: signature, // Same transaction
    };
  } catch (error) {
    if (error instanceof SendTransactionError) {
      return { success: false, error: 'Transaction failed' };
    }
    return { success: false, error: 'Failed to send prize' };
  }
}
