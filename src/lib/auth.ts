import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ============================================
// SERVER-AUTHORITATIVE AUTHENTICATION
// Verifies wallet ownership through cryptographic signatures
// ============================================

/**
 * Verify that a wallet signature is valid for a given message.
 * This proves the client controls the private key for the wallet.
 */
export async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Validate wallet address format
    const publicKey = new PublicKey(walletAddress);

    // Decode the signature from base58
    const signatureBytes = bs58.decode(signature);

    // Encode the message as bytes
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature using nacl
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );

    return isValid;
  } catch {
    // Don't log full error details
    return false;
  }
}

/**
 * Generate a challenge message for wallet authentication.
 * This should be signed by the client to prove wallet ownership.
 */
export function generateAuthChallenge(walletAddress: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  return `Claude Lotto Authentication\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}

/**
 * Verify admin authentication using a secret key.
 * For admin-only endpoints like payout approval.
 */
export function verifyAdminAuth(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    // Don't log - just fail silently for security
    return false;
  }

  // Expect format: "Bearer <secret>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const providedSecret = parts[1];
  if (providedSecret.length !== adminSecret.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < adminSecret.length; i++) {
    result |= providedSecret.charCodeAt(i) ^ adminSecret.charCodeAt(i);
  }

  return result === 0;
}
