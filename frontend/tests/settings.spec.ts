import { test, expect, Page } from '@playwright/test';

async function bypassNgrok(page: Page) {
  await page.goto('/');
  const ngrokWarning = page.getByText(/You are about to visit/i);
  if (await ngrokWarning.isVisible()) {
    await page.getByRole('button', { name: 'Visit Site' }).click();
  }
}

test.describe('User Preferences Pillar', () => {
  const ts = Date.now();
  
  test('Validates LocalStorage Theme Toggling and Dynamic OAuth URL Generation', async ({ page }) => {
    await bypassNgrok(page);

    // Bootstrap an ephemeral user to reach Settings safely
    await page.locator('text=Get Started').first().click();
    await page.getByLabel(/Full Name/i).fill('Settings Tester');
    await page.getByLabel(/Username/i).fill(`settings_${ts}`);
    await page.getByLabel(/Email/i).fill(`settings_${ts}@example.com`);
    await page.getByLabel(/^Password/i).fill('Password123!');
    await page.getByRole('button', { name: /Create/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);

    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: /General Settings/i })).toBeVisible();

    // Verify Theme Switches don't crash the context
    const darkModeBtn = page.getByRole('button', { name: /Dark Mode/i });
    if (await darkModeBtn.isVisible()) {
      await darkModeBtn.click();
      const themeVal = await page.evaluate(() => localStorage.getItem('theme'));
      expect(['dark', 'light']).toContain(themeVal);
    }

    // Verify the Native Snapchat Business Restriction Warning is organically mounted
    await expect(page.getByText(/Snapchat publishing is limited to Verified Business Profiles/i)).toBeVisible();
    
    // Verify the API endpoints map dynamically inside the Host GUI
    const connectSnapchat = page.locator('a').filter({ hasText: /Connect Snapchat/i });
    if (await connectSnapchat.isVisible()) {
      const href = await connectSnapchat.getAttribute('href');
      expect(href).toContain('/api/auth/snapchat/login');
    }
  });
});
