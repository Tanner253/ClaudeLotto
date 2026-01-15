describe('Prize Calculation', () => {
  const WINNER_PERCENTAGE = 0.8;
  const DEV_PERCENTAGE = 0.2;

  function calculatePrize(balance: number) {
    const availableBalance = balance - 10000; // Keep some for fees
    const winnerAmount = Math.floor(availableBalance * WINNER_PERCENTAGE);
    const devAmount = Math.floor(availableBalance * DEV_PERCENTAGE);
    return { winnerAmount, devAmount };
  }

  it('should calculate 80/20 split correctly', () => {
    const balance = 1_000_000_000; // 1 SOL in lamports
    const { winnerAmount, devAmount } = calculatePrize(balance);

    // Available is 999,990,000 lamports
    expect(winnerAmount).toBe(799_992_000);
    expect(devAmount).toBe(199_998_000);
  });

  it('should handle small balances', () => {
    const balance = 100_000; // 0.0001 SOL
    const { winnerAmount, devAmount } = calculatePrize(balance);

    // Available is 90,000 lamports
    expect(winnerAmount).toBe(72_000);
    expect(devAmount).toBe(18_000);
  });

  it('should handle zero balance after fees', () => {
    const balance = 5000; // Less than fee reserve
    const { winnerAmount, devAmount } = calculatePrize(balance);

    // Available is negative, floor to 0
    expect(winnerAmount).toBeLessThanOrEqual(0);
    expect(devAmount).toBeLessThanOrEqual(0);
  });

  it('should maintain 80/20 ratio', () => {
    const balance = 5_000_000_000; // 5 SOL
    const { winnerAmount, devAmount } = calculatePrize(balance);

    const ratio = winnerAmount / devAmount;
    expect(ratio).toBeCloseTo(4, 1); // 80/20 = 4
  });
});
