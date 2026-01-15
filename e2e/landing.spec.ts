import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display the main heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Claude Lotto');
  });

  test('should display the pot balance section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Current Pot')).toBeVisible();
  });

  test('should have a Try Your Luck button', async ({ page }) => {
    await page.goto('/');
    const ctaButton = page.locator('text=Try Your Luck');
    await expect(ctaButton).toBeVisible();
  });

  test('should navigate to chat page when clicking CTA', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Try Your Luck');
    await expect(page).toHaveURL('/chat');
  });

  test('should display How It Works section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=How It Works')).toBeVisible();
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
    await expect(page.locator('text=Pay & Chat')).toBeVisible();
    await expect(page.locator('text=Win the Pot')).toBeVisible();
  });

  test('should display The Rules section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=The Rules')).toBeVisible();
  });

  test('should have a link to history page', async ({ page }) => {
    await page.goto('/');
    const historyLink = page.locator('text=View History');
    await expect(historyLink).toBeVisible();
  });
});
