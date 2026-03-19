import { test, expect, Page } from '@playwright/test';

async function bypassNgrok(page: Page) {
  await page.goto('/');
  const ngrokWarning = page.getByText(/You are about to visit/i);
  if (await ngrokWarning.isVisible()) {
    await page.getByRole('button', { name: 'Visit Site' }).click();
  }
}

test.describe('Analytics Dashboard', () => {
  const ts = Date.now();

  test('Renders Analytics Dashboard Stats', async ({ page }) => {
    await bypassNgrok(page);

    // Bootstrap user session
    await page.locator('text=Get Started').first().click();
    await page.getByLabel(/Full Name/i).fill('Analytics Tester');
    await page.getByLabel(/Username/i).fill(`analytics_${ts}`);
    await page.getByLabel(/Email/i).fill(`analytics_${ts}@example.com`);
    await page.getByLabel(/^Password/i).fill('Password123!');
    await page.getByRole('button', { name: /Create/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);

    // Navigate to Analytics page
    const analyticsLink = page.getByRole('link', { name: /Analytics|Reports/i });
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      
      // Check if Stats cards contain text
      await expect(page.getByText(/Goal Completion Rate/i).first()).toBeVisible();
      await expect(page.getByText(/Link Clicks/i).first()).toBeVisible();
      await expect(page.getByText(/Audience Shares/i).first()).toBeVisible();
    }
  });
});
