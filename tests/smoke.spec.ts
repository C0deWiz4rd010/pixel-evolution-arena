import { expect, test, type Page } from '@playwright/test';

async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'Game sections' });
}

test('five-area shell exposes one next goal and archive filters', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  const nav = primaryNav(page);
  for (const label of ['Evolve', 'Squad', 'Battle', 'Explore', 'Archive']) {
    await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByLabel('Recommended next action')).toBeVisible();
  await expect(page.getByLabel('Recommended next action')).toHaveCount(1);

  await nav.getByRole('button', { name: 'Archive', exact: true }).click();
  await page.getByRole('button', { name: 'Collection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Creature Collection' })).toBeVisible();
  await page.getByRole('button', { name: 'Locked', exact: true }).click();
  await page.locator('.archive-filters select').first().selectOption('Rookie');
  await expect(page.getByText(/Creatures$/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveClass(/active/);
});

test('evolution discovery updates the selected family and dex', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await expect(page.getByRole('heading', { name: 'Grow Your Collection' })).toBeVisible();
  const dexBefore = await page.getByLabel('Dex collection progress').innerText();
  await page.getByRole('button', { name: /Evolve Splashfang/i }).first().click();
  await expect(page.locator('aside.detail-panel').getByRole('heading', { name: 'Splashfang' })).toBeVisible();
  await expect(page.getByLabel('Dex collection progress')).not.toHaveText(dexBefore);
});

test('training drill spends coins and grants xp', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  const detail = page.locator('aside.detail-panel');
  const xpBefore = await detail.locator('.xp-bar span').last().innerText();
  const coinsBefore = await page.locator('.stat-chip.coins strong').innerText();
  await detail.locator('details.training-console summary').click();
  await detail.getByRole('button', { name: 'Run Drill' }).first().click();
  await expect(detail.locator('.xp-bar span').last()).not.toHaveText(xpBefore);
  await expect(page.locator('.stat-chip.coins strong')).not.toHaveText(coinsBefore);
});

test('squad auto build and loadout remain one coherent area', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  const nav = primaryNav(page);
  await nav.getByRole('button', { name: 'Squad', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Build Your Team' })).toBeVisible();
  await page.getByText('Presets & Maintenance').click();
  await page.getByRole('button', { name: 'Clear Squad' }).click();
  await page.getByRole('button', { name: 'Auto Build Best Squad' }).click();
  await expect(page.getByText('3/3 Ready')).toBeVisible();
  await page.getByRole('button', { name: 'Loadout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Forge & Equip' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auto Equip Best' })).toBeVisible();
});

test('arena battle plan and reward loop work', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  await primaryNav(page).getByRole('button', { name: 'Battle', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Arena Control' })).toBeVisible();
  await page.getByRole('radio', { name: /Assault/ }).click();
  await expect(page.getByRole('radio', { name: /Assault/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Start Battle' }).click();
  await expect(page.getByRole('heading', { name: 'Choose Squad Order' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Focus Target/ }).click();
  await expect(page.getByRole('heading', { name: 'Tactical Pulse' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Battle growth result')).toHaveCount(0);
  await page.getByRole('button', { name: /Break/ }).click();
  const secondOrder = page.getByRole('heading', { name: 'Choose Squad Order' });
  if (await secondOrder.isVisible({ timeout: 10_000 }).catch(() => false)) await page.getByRole('button', { name: /Build Overdrive/ }).click();
  await expect(page.getByLabel('Battle growth result')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Battle growth result')).toContainText(/Mastery/);

  const masteryBeforeReload = await page.getByLabel('Battle growth result').locator('.mastery-head b').first().innerText();
  expect(masteryBeforeReload).toMatch(/^\+\d+$/);
  await page.reload();
  await primaryNav(page).getByRole('button', { name: 'Evolve', exact: true }).click();
  await expect(page.getByLabel('Battle mastery')).toContainText(/\d+ MP/);
});

test('campaign and expedition are reachable through their primary areas', async ({ page }) => {
  await page.goto('/');
  await dismissOnboarding(page);
  const nav = primaryNav(page);
  await nav.getByRole('button', { name: 'Battle', exact: true }).click();
  await page.getByRole('button', { name: 'Campaign', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Campaign', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deep Grid Expedition' })).toBeVisible();
  await page.getByRole('button', { name: 'Launch Expedition' }).click();
  await expect(page.getByText('Run Health')).toBeVisible();
});

test('mobile shell has no document overflow and keeps the next action visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await dismissOnboarding(page);
  await expect(primaryNav(page)).toBeVisible();
  await expect(page.getByLabel('Recommended next action')).toBeVisible();
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
});
