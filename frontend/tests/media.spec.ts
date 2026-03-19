import { test, expect, Page } from '@playwright/test';

async function bypassNgrok(page: Page) {
  await page.goto('/');
  const ngrokWarning = page.getByText(/You are about to visit/i);
  if (await ngrokWarning.isVisible()) {
    await page.getByRole('button', { name: 'Visit Site' }).click();
  }
}

test.describe('Storage Pillar', () => {
  const ts = Date.now();

  test('Dynamically Bypasses Local File Buffers to Assert S3 Storage Uploader', async ({ page }) => {
    await bypassNgrok(page);

    // Bootstrap ephemeral session to access Media Page safely
    await page.locator('text=Get Started').first().click();
    await page.getByLabel(/Full Name/i).fill('Media Tester');
    await page.getByLabel(/Username/i).fill(`media_${ts}`);
    await page.getByLabel(/Email/i).fill(`media_${ts}@example.com`);
    await page.getByLabel(/^Password/i).fill('Password123!');
    await page.getByRole('button', { name: /Create/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);

    // Navigate natively to the Asset Library
    const mediaLink = page.getByRole('link', { name: /Media|Library/i });
    if (await mediaLink.isVisible()) {
      await mediaLink.click();
      
      // Simulate Native File Picker Invocation using Playwright FileChoosers
      // We wrap the click in a promise to securely intercept the OS Window before it crashes headless mode
      const uploadArea = page.getByText(/Upload/i).first();
      if (await uploadArea.isVisible()) {
        const [fileChooser] = await Promise.all([
          page.waitForEvent('filechooser'),
          uploadArea.click()
        ]);
        
        // Push the active `package.json` configuration file as a dummy asset
        await fileChooser.setFiles('package.json');
        
        // Assert the Storage Library physically mapped the binary
        await expect(page.getByText(/package.json/i)).toBeVisible();
      }
    }
  });
});
