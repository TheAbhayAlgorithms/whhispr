import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Control Flows', () => {
  test('unauthenticated user is redirected to login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1, h2')).toContainText(/Sign in|Welcome/i);
  });

  test('displays login form with username/email and password fields', async ({ page }) => {
    await page.goto('/login');

    const identifierInput = page.locator('input[placeholder*="username" i], input[placeholder*="email" i]').first();
    await expect(identifierInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    const submitButton = page.getByRole('button', { name: /Sign in/i });
    await expect(submitButton).toBeVisible();
  });

  test('has link to register page', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /create a new account/i });
    await expect(registerLink).toBeVisible();
  });
});
