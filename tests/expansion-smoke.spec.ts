import { expect, test, type Page } from '@playwright/test';

/** First-run onboarding overlay blocks the UI; dismiss it before interacting. */
async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

/** Collects uncaught page errors so a runtime crash fails the smoke test. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

test('every tab renders without runtime errors', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  const tabs = ['Forge', 'Arena', 'Expedition', 'Collection', 'Campaign', 'Medals', 'Handbook', 'Settings', 'Squad'];
  for (const tab of tabs) {
    await nav.getByRole('button', { name: new RegExp(tab, 'i') }).click();
    await page.waitForTimeout(150);
  }

  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('forge, campaign, and expedition headers render', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Forge/i }).click();
  await expect(page.getByRole('heading', { name: 'Forge', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Blueprints' })).toBeVisible();

  await nav.getByRole('button', { name: /Campaign/i }).click();
  await expect(page.getByRole('heading', { name: 'Campaign', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Boss Codex' })).toBeVisible();

  await nav.getByRole('button', { name: /Expedition/i }).click();
  await expect(page.getByRole('heading', { name: 'Expedition', exact: true })).toBeVisible();
});

test('an expedition run can be launched and shows the run HUD', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  // Make sure a squad is loaded so the launch is enabled.
  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: 'Load Suggested' }).first().click();

  await nav.getByRole('button', { name: /Expedition/i }).click();
  await page.getByRole('button', { name: 'Launch Expedition' }).click();

  await expect(page.getByText(/Run HP/i)).toBeVisible();
  await expect(page.locator('.run-meta')).toContainText('Depth');
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('language toggle translates the tab navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Settings/i }).click();
  await page.getByRole('button', { name: /:\s*Deutsch$/ }).click();

  // Collection -> "Sammlung", Squad -> "Truppe" once German is active.
  await expect(nav).toContainText('Sammlung');
  await expect(nav).toContainText('Truppe');
});

test('combat beats appear in the arena when enabled', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Settings/i }).click();
  await page.locator('.toggle-row', { hasText: /Active combat beats/i }).getByRole('button').click();

  await nav.getByRole('button', { name: /Arena/i }).click();
  await expect(page.getByRole('button', { name: 'CHARGE' })).toBeVisible();
});

test('operations deck exposes forge and expedition quick flows', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  await page.getByRole('button', { name: /Command Deck/i }).click();

  const operations = page.getByLabel('Operations deck');
  await expect(operations).toContainText('Evolution Route');
  await expect(operations).toContainText('Forge Pulse');
  await expect(operations).toContainText('Campaign Track');
  await expect(operations).toContainText('Expedition Relay');

  await operations.locator('.ops-card', { hasText: 'Forge Pulse' }).getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Forge', exact: true })).toBeVisible();
  await expect(page.getByLabel('Forge command')).toContainText(/Forge Command/i);

  await page.getByRole('button', { name: /Command Deck/i }).click();
  await page.getByLabel('Operations deck').locator('.ops-card', { hasText: 'Expedition Relay' }).getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Expedition', exact: true })).toBeVisible();
  await expect(page.getByLabel('Expedition relay status')).toContainText(/Relay Status/i);
  await expect(page.getByText(/Run HP|Launch an Expedition/i)).toBeVisible();
});

test('battle intel surfaces render across shell, arena, campaign, forge, and expedition', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');
  await page.getByRole('button', { name: /Command Deck/i }).click();

  await expect(page.getByLabel('Global intel strip')).toContainText('Combat Intel');
  await expect(page.getByLabel('Global intel strip')).toContainText('Campaign Pressure');
  await expect(page.getByLabel('Global intel strip')).toContainText('Expedition Relay');

  await nav.getByRole('button', { name: /Arena/i }).click();
  await page.getByRole('button', { name: /Start Battle|Queue Next Battle|Retry Battle/i }).click();
  await expect(page.getByLabel('Recent battle dossier')).toContainText('Recent Runs');
  await expect(page.getByLabel('Recent battle dossier')).toContainText(/\+\d+ CR \/ \+\d+ XP/);

  await nav.getByRole('button', { name: /Campaign/i }).click();
  await expect(page.getByLabel('Campaign objective radar')).toContainText('Chapter Pulse');
  await expect(page.getByLabel('Campaign objective radar')).toContainText('Combat Trend');

  await nav.getByRole('button', { name: /Forge/i }).click();
  await expect(page.getByLabel('Forge diagnostics')).toContainText('Coverage');
  await expect(page.getByLabel('Forge diagnostics')).toContainText('Battle Trend');

  await nav.getByRole('button', { name: /Expedition/i }).click();
  await expect(page.getByLabel('Expedition preflight scanner')).toContainText('Preflight Scanner');
  await expect(page.getByLabel('Expedition preflight scanner')).toContainText('Arena Trend');
});

test('handbook, medals, campaign, and settings expose the new command-center surfaces', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Handbook/i }).click();
  await expect(page.getByLabel('Handbook command center')).toContainText('Daily Relay');
  await expect(page.getByText('Boss Prep Grid')).toBeVisible();
  await page.getByLabel('Handbook command center').getByRole('button', { name: 'Run Battle' }).click();
  await expect(page.getByRole('heading', { name: 'Arena Control' })).toBeVisible();

  await nav.getByRole('button', { name: /Medals/i }).click();
  await expect(page.getByLabel('Medal focus board')).toContainText('Streak Ladder');
  await expect(page.locator('.stat-readout').getByText('Next streak medal', { exact: true })).toBeVisible();

  await nav.getByRole('button', { name: /Campaign/i }).click();
  await expect(page.getByLabel('Boss prep deck')).toContainText(/Surge Window|Chronocore Crown|No named boss/i);
  await expect(page.getByLabel('Campaign reward runway')).toContainText('Chapter Reward');

  await nav.getByRole('button', { name: /Settings/i }).click();
  await expect(page.getByLabel('System checks')).toContainText('Save Core');
  await expect(page.getByText('Profile Signal')).toBeVisible();
});
