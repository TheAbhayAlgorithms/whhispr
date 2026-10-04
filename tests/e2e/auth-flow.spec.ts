import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Control Flows', () => {
  test('unauthenticated user is redirected to login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1, h2')).toContainText(/Sign in|Welcome/i);
  });

  test('displays quick sign-in seed user buttons and fills credentials', async ({ page }) => {
    await page.goto('/login');

    // Verify seed buttons
    const aliceButton = page.getByRole('button', { name: /Alice/i });
    await expect(aliceButton).toBeVisible();

    // Click Alice seed button
    await aliceButton.click();

    // Verify inputs populated
    const identifierInput = page.locator('input[name="identifier"], input[placeholder*="username" i], input[placeholder*="email" i]').first();
    await expect(identifierInput).toHaveValue('alice');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Click Alice seed button
    const aliceButton = page.getByRole('button', { name: /Alice/i });
    await aliceButton.click();

    // Submit form
    const submitButton = page.getByRole('button', { name: /Sign in|Log in/i });
    await submitButton.click();

    // Should redirect to dashboard and show user's presence or sidebar
    await expect(page).toHaveURL(/\/(#|\?.*)?$/, { timeout: 10000 });
    await expect(page.locator('aside')).toBeVisible();
  });
});
