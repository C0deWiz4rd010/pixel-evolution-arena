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
  await expect(page.getByText(/Depth/i)).toBeVisible();
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('language toggle translates the tab navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Settings/i }).click();
  await page.getByRole('button', { name: 'Deutsch', exact: true }).click();

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
  await expect(page.getByText('Combat Beat')).toBeVisible();
  await expect(page.getByRole('button', { name: 'CHARGE' })).toBeVisible();
});
