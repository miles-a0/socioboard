import { test, expect, Page } from '@playwright/test';

async function bypassNgrok(page: Page) {
  await page.goto('/');
  const ngrokWarning = page.getByText(/You are about to visit/i);
  if (await ngrokWarning.isVisible()) {
    await page.getByRole('button', { name: 'Visit Site' }).click();
  }
}

test.describe('Authentication Pillar', () => {
  const ts = Date.now();
  const testEmail = `auth_test_${ts}@example.com`;

  test('Validates Signup, JWT Session Mount, and Cache Invalidations', async ({ page }) => {
    await bypassNgrok(page);

    // 1. Organic Signup Route
    await page.locator('text=Get Started').first().click();
    await page.getByLabel(/Full Name/i).fill('Auth Tester');
    await page.getByLabel(/Username/i).fill(`user_${ts}`);
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/^Password/i).fill('Password123!');
    await page.getByRole('button', { name: /Create Account/i }).click();
    
    // Assert JWT Redirects natively
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.getByText(/Overview/i).first()).toBeVisible();

    // 2. Cache Invalidation (Logout Equivalent)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // 3. Login Verification
    await page.goto('/');
    await page.locator('text=Sign In').first().click();
    await page.getByLabel(/Email/i).fill(testEmail);
    await page.getByLabel(/^Password/i).fill('Password123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Assert Return
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
