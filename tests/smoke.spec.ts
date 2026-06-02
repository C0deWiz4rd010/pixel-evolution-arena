import { expect, test } from '@playwright/test';

test('tabs switch and collection filters can be reset', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await expect(page.getByLabel('Recommended next command')).toContainText(/OPEN SLOT|EVOLVE READY|CHASE READY/i);

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
  await expect(page.getByRole('button', { name: /Add Squad To Start/i })).toBeDisabled();

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
  await detailPanel.getByRole('button', { name: 'Evolve' }).first().click();
  await expect(detailPanel.getByRole('heading', { name: 'Splashfang' })).toBeVisible();

  await nav.getByRole('button', { name: /Arena/i }).click();
  await page.getByRole('button', { name: 'Start Battle' }).click();

  await expect(page.getByText(/CR \+\d+ Coins/)).toBeVisible();
  await expect(page.getByText(/XP \+\d+/)).toBeVisible();
});

test('arena exposes hybrid controls and the medals tab lists achievements', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Arena/i }).click();
  await expect(page.getByText('Tactic Coach')).toBeVisible();
  await page.getByRole('button', { name: /Apply .* Plan/i }).click();
  await expect(page.getByRole('radio', { name: 'Training' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Guard' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Balance' })).toBeVisible();
  await page.getByRole('radio', { name: 'Aggro' }).click();
  await expect(page.getByRole('radio', { name: 'Aggro' })).toHaveAttribute('aria-checked', 'true');

  await nav.getByRole('button', { name: /Medals/i }).click();
  await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible();
  await expect(page.getByText('First Contact')).toBeVisible();
});

test('collection can evolve a reachable chase directly', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Collection/i }).click();
  await page.getByRole('button', { name: 'Reachable Now' }).click();
  await page.getByRole('button', { name: 'Evolve Now' }).first().click();

  await expect(page.getByText('7 / 71 online')).toBeVisible();
  await expect(page.getByLabel('Recommended next command')).not.toContainText('Cinderpaw can go online');
});

test('full squads can swap in stronger reserve candidates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: 'Load Suggested' }).first().click();
  await expect(page.getByText('3/3 ONLINE')).toBeVisible();

  await nav.getByRole('button', { name: /Collection/i }).click();
  await page.getByRole('button', { name: 'Reachable Now' }).click();
  await page.getByRole('button', { name: 'Evolve Now' }).first().click();

  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: /Swap weakest/i }).first().click();
  await expect(page.locator('.active-squad-board')).toContainText('Cinderpaw');
});

test('progress survives reload and reset restores the starter state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const nav = page.locator('nav[aria-label="Game sections"]');
  const detailPanel = page.locator('aside.detail-panel');

  await expect(detailPanel.getByRole('heading', { name: 'Aquabun' })).toBeVisible();
  await detailPanel.getByRole('button', { name: 'Evolve' }).first().click();
  await expect(detailPanel.getByRole('heading', { name: 'Splashfang' })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(detailPanel.getByRole('heading', { name: 'Splashfang' })).toBeVisible();

  await nav.getByRole('button', { name: /Handbook/i }).click();
  await page.getByRole('button', { name: 'Arm Reset' }).click();
  await page.getByRole('button', { name: 'Confirm Reset' }).click();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(detailPanel.getByRole('heading', { name: 'Aquabun' })).toBeVisible();
});
