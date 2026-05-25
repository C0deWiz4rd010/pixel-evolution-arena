import { expect, test } from '@playwright/test';

test('tabs switch and collection filters can be reset', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Collection/i }).click();
  await expect(page.getByRole('heading', { name: 'Digital Archive' })).toBeVisible();

  await page.getByRole('button', { name: 'Locked', exact: true }).click();
  await page.getByRole('combobox').first().selectOption('Rookie');
  await expect(page.getByText(/matches/i)).toBeVisible();

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'All', exact: true }).first()).toHaveClass(/active/);
});

test('empty squad is blocked in arena and can be rebuilt from squad tab', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: 'Clear Squad' }).click();
  await expect(page.getByText('0/3 ONLINE')).toBeVisible();

  await nav.getByRole('button', { name: /Arena/i }).click();
  await page.getByRole('button', { name: 'Start Battle' }).click();
  await expect(page.getByText('Add at least one monster to your squad.')).toBeVisible();

  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: 'Load Suggested' }).first().click();
  await expect(page.getByText('1/3 ONLINE')).toBeVisible();
});

test('default route can evolve and battles produce rewards', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await expect(page.getByRole('heading', { name: 'Evolution Tree' })).toBeVisible();
  const detailPanel = page.locator('aside.detail-panel');
  await expect(detailPanel.getByRole('heading', { name: 'Aquabun' })).toBeVisible();
  await detailPanel.getByRole('button', { name: 'Evolve' }).click();
  await expect(detailPanel.getByRole('heading', { name: 'Splashfang' })).toBeVisible();

  await nav.getByRole('button', { name: /Arena/i }).click();
  await page.getByRole('button', { name: 'Start Battle' }).click();

  await expect(page.getByText(/CR \+\d+ Coins/)).toBeVisible();
  await expect(page.getByText(/Rewards: \+\d+ Coins, \+\d+ DNA Shards, \+\d+ XP\./)).toBeVisible();
});
