import { expect, test, type Page } from '@playwright/test';

async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

test('all primary areas and secondary views render without runtime errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await dismissOnboarding(page);
  const nav = page.getByRole('navigation', { name: 'Game sections' });
  for (const area of ['Evolve', 'Squad', 'Battle', 'Explore', 'Archive']) {
    await nav.getByRole('button', { name: area, exact: true }).click();
  }
  await nav.getByRole('button', { name: 'Squad', exact: true }).click();
  await page.getByRole('button', { name: 'Loadout', exact: true }).click();
  await nav.getByRole('button', { name: 'Battle', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign', exact: true }).click();
  await nav.getByRole('button', { name: 'Archive', exact: true }).click();
  for (const view of ['Achievements', 'Guide', 'Collection']) await page.getByRole('button', { name: view, exact: true }).click();
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('onboarding is three short steps and routes through the core loop', async ({ page }) => {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Getting started' });
  await expect(dialog).toContainText('Step 1 / 3');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog).toContainText('Build a Three-Creature Squad');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await expect(dialog).toContainText('Battle, Earn, Evolve');
  await dialog.getByRole('button', { name: /Start/i }).click();
  await expect(dialog).toBeHidden();
});

test('settings remain accessible from the header utility menu', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await page.getByRole('button', { name: 'Open utility menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Save Data/ }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByLabel('System checks')).toContainText('Save Core');
});

test('visual style and typography profiles apply and persist independently', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await page.getByRole('button', { name: 'Open utility menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Appearance/ }).click();

  await page.getByRole('button', { name: /Pixel Arcade/ }).click();
  await page.getByRole('button', { name: /Pixel.*Aa/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-visual-style', 'pixel-arcade');
  await expect(page.locator('html')).toHaveAttribute('data-typography', 'pixel');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-visual-style', 'pixel-arcade');
  await expect(page.locator('html')).toHaveAttribute('data-typography', 'pixel');

  await page.getByRole('button', { name: 'Open utility menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Appearance/ }).click();
  await page.getByRole('button', { name: /Tactical Minimal/ }).click();
  await page.getByRole('button', { name: /Dual Font.*Aa/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-visual-style', 'tactical-minimal');
  await expect(page.locator('html')).toHaveAttribute('data-typography', 'dual-font');
});

test('archive exposes achievements and guide without extra top-level tabs', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await page.getByRole('navigation', { name: 'Game sections' }).getByRole('button', { name: 'Archive', exact: true }).click();
  await page.getByRole('button', { name: 'Achievements', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible();
  await page.getByRole('button', { name: 'Guide', exact: true }).click();
  await expect(page.getByText(/Field Manual|Handbook/i).first()).toBeVisible();
});

test('progress survives reload and reset restores starter selection', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await page.getByRole('button', { name: /Evolve Splashfang/i }).first().click();
  await expect(page.locator('aside.detail-panel').getByRole('heading', { name: 'Splashfang' })).toBeVisible();
  await page.reload();
  await expect(page.locator('aside.detail-panel').getByRole('heading', { name: 'Splashfang' })).toBeVisible();
  await page.getByRole('button', { name: 'Open utility menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Save Data/ }).click();
  await page.getByRole('button', { name: 'Reset Progress' }).click();
  await page.getByRole('button', { name: 'Yes, reset' }).click();
  await page.reload();
  await expect(page.locator('aside.detail-panel').getByRole('heading', { name: 'Aquabun' })).toBeVisible();
});
