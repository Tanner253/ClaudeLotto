import { test, expect } from '@playwright/test';

test.describe('Chat Page', () => {
  test('should display the chat interface', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('text=Chat with Claude')).toBeVisible();
  });

  test('should show Connect Wallet button', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('text=Connect Wallet')).toBeVisible();
  });

  test('should have disabled input when wallet not connected', async ({ page }) => {
    await page.goto('/chat');
    const input = page.locator('input[placeholder*="Connect wallet"]');
    await expect(input).toBeDisabled();
  });

  test('should have disabled send button when wallet not connected', async ({ page }) => {
    await page.goto('/chat');
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeDisabled();
  });

  test('should display message cost', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('text=0.1 SOL per message')).toBeVisible();
  });

  test('should have back button to home', async ({ page }) => {
    await page.goto('/chat');
    const backButton = page.locator('text=Back');
    await expect(backButton).toBeVisible();
    await backButton.click();
    await expect(page).toHaveURL('/');
  });

  test('should have link to history', async ({ page }) => {
    await page.goto('/chat');
    const historyLink = page.locator('a[href="/history"]');
    await expect(historyLink).toBeVisible();
  });
});
