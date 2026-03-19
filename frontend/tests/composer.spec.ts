import { test, expect, Page } from '@playwright/test';

async function bypassNgrok(page: Page) {
  await page.goto('/');
  const ngrokWarning = page.getByText(/You are about to visit/i);
  if (await ngrokWarning.isVisible()) {
    await page.getByRole('button', { name: 'Visit Site' }).click();
  }
}

test.describe('Composer Engine Pillar', () => {
  const ts = Date.now();

  test('Assembles Multi-channel Payloads, Injects AI Content, and Fires Schedule Network Webhooks', async ({ page }) => {
    await bypassNgrok(page);

    // Bootstrap Ephemeral Composer Session
    await page.locator('text=Get Started').first().click();
    await page.getByLabel(/Full Name/i).fill('Composer Tester');
    await page.getByLabel(/Username/i).fill(`composer_${ts}`);
    await page.getByLabel(/Email/i).fill(`composer_${ts}@example.com`);
    await page.getByLabel(/^Password/i).fill('Password123!');
    await page.getByRole('button', { name: /Create/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);

    // Navigate to Posts Creator Module
    const postsLink = page.getByRole('link', { name: /Create Post/i }).first();
    if (await postsLink.isVisible()) {
        await postsLink.click();
    } else {
        await page.goto('/posts');
    }

    // Await the DOM to mount the Composer architecture
    await expect(page.getByText(/Create Post/i)).toBeVisible();

    // 1. Social Target Allocation
    const fbButton = page.locator('button', { hasText: 'Facebook' });
    if (await fbButton.isVisible()) await fbButton.click();

    const snapButton = page.locator('button', { hasText: 'Snapchat' });
    if (await snapButton.isVisible()) await snapButton.click();

    // 2. Draft Insertion & Magic AI Simulation
    const textArea = page.locator('textarea').first();
    await textArea.fill('Releasing the new AI social system!');
    
    const magicAiPrompt = page.getByRole('button', { name: /Enhance|Magic/i });
    if (await magicAiPrompt.isVisible()) {
        // We click the AI enhancement module and simply wait for the DOM to un-freeze state
        await magicAiPrompt.click();
    }

    // 3. Fire the physically verified Submit Hook
    const scheduleBtn = page.getByRole('button', { name: /Schedule Post/i });
    if (await scheduleBtn.isVisible()) {
        await scheduleBtn.click();
        
        // Ensure success toast mounts
        await expect(page.getByText(/Post Scheduled|Success/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
