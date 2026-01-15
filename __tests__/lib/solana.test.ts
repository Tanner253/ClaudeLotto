import { PublicKey } from '@solana/web3.js';

describe('Solana Utilities', () => {
  describe('PublicKey validation', () => {
    it('should validate correct public key format', () => {
      const validKey = 'DRpbCBMxVnDK7maPgv9c8c9HfJe9bLZ4jy7cJGshqwzN';
      expect(() => new PublicKey(validKey)).not.toThrow();
    });

    it('should reject invalid public key', () => {
      const invalidKey = 'invalid-key';
      expect(() => new PublicKey(invalidKey)).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => new PublicKey('')).toThrow();
    });
  });

  describe('Lamport conversions', () => {
    const LAMPORTS_PER_SOL = 1_000_000_000;

    it('should convert SOL to lamports correctly', () => {
      expect(0.1 * LAMPORTS_PER_SOL).toBe(100_000_000);
    });

    it('should convert lamports to SOL correctly', () => {
      expect(100_000_000 / LAMPORTS_PER_SOL).toBe(0.1);
    });

    it('should handle 1 SOL', () => {
      expect(1 * LAMPORTS_PER_SOL).toBe(1_000_000_000);
    });
  });
});
