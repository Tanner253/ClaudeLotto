import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'devnet';
process.env.NEXT_PUBLIC_TREASURY_WALLET = 'TestTreasuryWallet11111111111111111111111111';
process.env.NEXT_PUBLIC_MESSAGE_COST = '0.1';
process.env.MESSAGE_COST_SOL = '0.1';
process.env.TREASURY_WALLET = 'TestTreasuryWallet11111111111111111111111111';
process.env.WINNER_PERCENTAGE = '0.8';
process.env.DEV_PERCENTAGE = '0.2';
