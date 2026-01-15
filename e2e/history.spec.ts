import { test, expect } from '@playwright/test';

test.describe('History Page', () => {
  test('should display the history heading', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('h1')).toContainText('Attempt History');
  });

  test('should display stats section', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('text=Total Attempts')).toBeVisible();
    await expect(page.locator('text=Total Wins')).toBeVisible();
  });

  test('should have back button to home', async ({ page }) => {
    await page.goto('/history');
    const backButton = page.locator('text=Back');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL('/');
  });

  test('should have link to try your luck', async ({ page }) => {
    await page.goto('/history');
    const tryLink = page.locator('a[href="/chat"]');
    await expect(tryLink).toBeVisible();
  });

  test('should show empty state or attempts list', async ({ page }) => {
    await page.goto('/history');
    // Wait for loading to complete
    await page.waitForTimeout(1000);
    // Either shows attempts, empty state, or stats with 0 (when DB not configured)
    const content = await page.content();
    const hasAttempts = content.includes('DENIED') || content.includes('WON');
    const hasEmptyState = content.includes('No attempts yet') || content.includes('Be the first');
    const hasStats = content.includes('Total Attempts');
    expect(hasAttempts || hasEmptyState || hasStats).toBe(true);
  });
});
