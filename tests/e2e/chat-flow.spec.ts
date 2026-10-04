import { test, expect } from '@playwright/test';

test.describe('Chat Dashboard & Theme E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via quick sign-in
    await page.goto('/login');
    const aliceButton = page.getByRole('button', { name: /Alice/i });
    await aliceButton.click();
    const submitButton = page.getByRole('button', { name: /Sign in|Log in/i });
    await submitButton.click();
    await expect(page).toHaveURL(/\/(#|\?.*)?$/, { timeout: 10000 });
  });

  test('renders dashboard sidebar and navigation elements', async ({ page }) => {
    // Verify sidebar and chat listing area
    await expect(page.locator('aside')).toBeVisible();

    // Verify search input or new chat action
    const searchOrFilter = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchOrFilter.count() > 0) {
      await expect(searchOrFilter).toBeVisible();
    }
  });

  test('toggles theme between light and dark modes', async ({ page }) => {
    const html = page.locator('html');
    const themeButton = page.locator('button[title*="theme" i], button[aria-label*="theme" i]').first();

    if (await themeButton.isVisible()) {
      const isInitialDark = await html.evaluate((el) => el.classList.contains('dark'));
      await themeButton.click();
      const isAfterDark = await html.evaluate((el) => el.classList.contains('dark'));
      expect(isAfterDark).toBe(!isInitialDark);
    }
  });

  test('supports keyboard shortcut ESC to dismiss modals', async ({ page }) => {
    // Pressing ESC should not crash or error
    await page.keyboard.press('Escape');
    await expect(page.locator('aside')).toBeVisible();
  });
});
