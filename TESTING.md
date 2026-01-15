# Claude Lotto - Testing Guide

This guide explains how to test the Claude Lotto application, including the complete win/payout flow.

## Prerequisites

1. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```

2. **Required Environment Variables**
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   MONGODB_URI=mongodb://localhost:27017 (or MongoDB Atlas URI)
   SOLANA_PRIVATE_KEY=<base58 encoded private key>
   TREASURY_WALLET=<treasury public address>
   NEXT_PUBLIC_TREASURY_WALLET=<same as above>
   DEV_WALLET=<developer wallet address>
   ADMIN_SECRET=<generate with: openssl rand -hex 32>
   ```

3. **Generate Admin Secret**
   ```bash
   openssl rand -hex 32
   ```

## Starting the Application

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run production
npm run build
npm start
```

## Testing Steps

### 1. Health Check

Verify all services are running:

```bash
curl http://localhost:3000/api/health | jq
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": { "status": "connected" },
    "solana": { "status": "connected" },
    "treasury": { "status": "accessible", "balance": 1.5 }
  },
  "config": {
    "treasuryWallet": true,
    "anthropicKey": true,
    "mongoUri": true,
    "adminSecret": true
  }
}
```

### 2. Initialize Database

Create necessary indexes (run once per environment):

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/init-db | jq
```

### 3. Test the Chat Flow (Manual)

1. Open http://localhost:3000/chat in browser
2. Connect your Phantom wallet (use devnet for testing)
3. Make sure you have devnet SOL (use https://faucet.solana.com)
4. Send a message and pay 0.1 SOL
5. Verify Claude responds

### 4. Test the Win/Payout Flow

Since Claude is designed to NEVER agree to send funds, you need to use the admin test endpoint:

#### Step 1: Create a Test Win

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "YOUR_WALLET_ADDRESS", "testMessage": "Test win for QA"}' \
  http://localhost:3000/api/admin/test-win | jq
```

Response:
```json
{
  "success": true,
  "winId": "507f1f77bcf86cd799439011",
  "message": "Test win created. Go to /api/admin/wins to approve and trigger payout.",
  "nextSteps": [...]
}
```

#### Step 2: View Pending Wins

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/wins | jq
```

#### Step 3: Approve the Win (Triggers Payout)

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"winId": "507f1f77bcf86cd799439011", "approved": true, "reviewNotes": "Test payout"}' \
  http://localhost:3000/api/admin/wins | jq
```

Response (if successful):
```json
{
  "success": true,
  "approved": true,
  "prizeTransaction": "5xYz...transaction_signature",
  "message": "Win approved and prize sent"
}
```

#### Step 4: Verify Payout

Check the transaction on Solana Explorer:
- Devnet: https://explorer.solana.com/tx/SIGNATURE?cluster=devnet
- Mainnet: https://explorer.solana.com/tx/SIGNATURE

### 5. Test Rejection Flow

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"winId": "507f1f77bcf86cd799439011", "approved": false, "reviewNotes": "False positive"}' \
  http://localhost:3000/api/admin/wins | jq
```

## API Endpoints Reference

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/balance` | GET | Get treasury balance |
| `/api/session` | POST | Create authenticated session |
| `/api/chat` | POST | Send message (requires payment) |
| `/api/history` | GET | View sanitized attempt history |

### Admin Endpoints (Require `Authorization: Bearer ADMIN_SECRET`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/init-db` | POST | Initialize database indexes |
| `/api/admin/wins` | GET | List pending wins |
| `/api/admin/wins` | POST | Approve/reject a win |
| `/api/admin/test-win` | POST | Create test win for testing |
| `/api/history` | GET | Full history (with admin auth) |

## Security Testing Checklist

- [ ] Verify transactions can't be reused (signature replay protection)
- [ ] Verify rate limiting works (20 messages/hour/wallet)
- [ ] Verify session is required for chat
- [ ] Verify wallet address is extracted from transaction (not trusted from client)
- [ ] Verify wins require admin approval (no automatic payouts)
- [ ] Verify history endpoint sanitizes data for non-admins
- [ ] Verify admin endpoints require authentication

## Common Issues

### "Transaction signature already used"
Each transaction can only be used once. Create a new payment transaction.

### "Invalid or expired session"
Sessions expire after 24 hours. Reconnect your wallet to create a new session.

### "Rate limit exceeded"
Wait for the rate limit window to reset (1 hour) or use a different wallet.

### "Transaction too old"
Transactions older than 10 minutes are rejected. Create a fresh transaction.

### Health check shows "unhealthy"
Check that all environment variables are set correctly in `.env.local`.

## Devnet Testing

For testing on Solana devnet:

1. Set `NEXT_PUBLIC_SOLANA_NETWORK=devnet` in `.env.local`
2. Get devnet SOL from https://faucet.solana.com
3. Create a devnet wallet for treasury using Phantom (switch to devnet in settings)
4. Fund the treasury with devnet SOL for payout testing

## Production Checklist

Before going to mainnet:

- [ ] Change `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
- [ ] Use a dedicated RPC provider (Helius, QuickNode, etc.)
- [ ] Secure the `SOLANA_PRIVATE_KEY` (consider hardware wallet)
- [ ] Set a strong `ADMIN_SECRET`
- [ ] Use MongoDB Atlas with authentication
- [ ] Set up monitoring and alerts
- [ ] Review all security measures
- [ ] Test the full flow on mainnet with small amounts first
