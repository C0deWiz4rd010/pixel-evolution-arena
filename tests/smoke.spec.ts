import { expect, test, type Page } from '@playwright/test';

/** First-run onboarding overlay blocks the UI; dismiss it before interacting. */
async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

test('tabs switch and collection filters can be reset', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await expect(page.getByLabel('Recommended next command')).toContainText(/OPEN SLOT|EVOLVE READY|CHASE READY/i);
  await expect(page.getByLabel('Quick commands')).toContainText('Auto Squad');
  await expect(page.getByLabel('Mission control matrix')).toContainText('Loop Priority');
  await expect(page.getByLabel('Mission control matrix')).toContainText('Evolution');
  await expect(page.getByLabel('Mission control matrix')).toContainText('Arena');

  await nav.getByRole('button', { name: /Collection/i }).click();
  await expect(page.getByRole('heading', { name: 'Digital Archive' })).toBeVisible();

  await page.getByRole('button', { name: 'Locked', exact: true }).click();
  await page.getByRole('combobox').first().selectOption('Rookie');
  await expect(page.getByText(/matches/i)).toBeVisible();

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('button', { name: 'All', exact: true }).first()).toHaveClass(/active/);
});

test('mission control matrix can execute the primary evolution action', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);

  const missionMatrix = page.getByLabel('Mission control matrix');
  await expect(missionMatrix).toContainText(/Splashfang|Cinderpaw|Evolution/i);

  await missionMatrix.getByRole('button').first().click();
  await expect(page.locator('aside.detail-panel')).toContainText(/Splashfang|Cinderpaw/i);
});

test('quick commands rebuild squad, launch battle, and expose ready evolution', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');
  const quickCommands = page.getByLabel('Quick commands');

  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: 'Clear Squad' }).click();
  await expect(page.getByText('0/3 ONLINE')).toBeVisible();

  await quickCommands.getByRole('button', { name: /Auto Squad/i }).click();
  await expect(page.getByText('3/3 ONLINE')).toBeVisible();
  await expect(quickCommands.getByRole('button', { name: /Evolve Ready/i })).toBeEnabled();

  await quickCommands.getByRole('button', { name: /Run Battle/i }).click();
  await expect(page.getByRole('heading', { name: 'Arena Control' })).toBeVisible();
  await expect(page.getByText(/CR \+\d+ Coins/)).toBeVisible();
});

test('collection and detail panels use the document scrollbar only', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Collection/i }).click();
  await expect(page.getByRole('heading', { name: 'Digital Archive' })).toBeVisible();

  const collectionScroll = await page.locator('.dex-side').evaluate((element) => {
    const style = getComputedStyle(element);
    return { maxHeight: style.maxHeight, overflowY: style.overflowY };
  });
  expect(collectionScroll).toEqual({ maxHeight: 'none', overflowY: 'visible' });

  await nav.getByRole('button', { name: /Evolution Tree/i }).click();
  await expect(page.getByRole('heading', { name: 'Evolution Tree' })).toBeVisible();

  const detailScroll = await page.locator('aside.detail-panel').first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { maxHeight: style.maxHeight, overflowY: style.overflowY };
  });
  expect(detailScroll).toEqual({ maxHeight: 'none', overflowY: 'visible' });
});

test('empty squad is blocked in arena and can be rebuilt from squad tab', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
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
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await expect(page.getByRole('heading', { name: 'Evolution Tree' })).toBeVisible();
  const detailPanel = page.locator('aside.detail-panel');
  await expect(detailPanel.getByRole('heading', { name: 'Aquabun' })).toBeVisible();
  await page.getByRole('button', { name: /Evolve Splashfang/i }).click();
  await expect(detailPanel.getByRole('heading', { name: 'Splashfang' })).toBeVisible();

  await nav.getByRole('button', { name: /Arena/i }).click();
  await page.getByRole('button', { name: 'Start Battle' }).click();

  await expect(page.getByText(/CR \+\d+ Coins/)).toBeVisible();
  await expect(page.getByText(/XP \+\d+/)).toBeVisible();
});

test('training lab drills spend coins and grant xp to the selected monster', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);

  const detailPanel = page.locator('aside.detail-panel');
  const xpBefore = await detailPanel.locator('.xp-bar span').last().innerText();
  const coinsBefore = await page.locator('.stat-chip.coins strong').innerText();

  await detailPanel.locator('.training-console .drill-grid button').first().click();

  await expect(detailPanel.locator('.xp-bar span').last()).not.toHaveText(xpBefore);
  await expect(page.locator('.stat-chip.coins strong')).not.toHaveText(coinsBefore);
});

test('auto build loads a full squad and arena shows run readiness forecast', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Squad/i }).click();
  await page.getByRole('button', { name: 'Clear Squad' }).click();
  await page.getByRole('button', { name: 'Auto Build Best Squad' }).click();
  await expect(page.getByText('3/3 ONLINE')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Battle Readiness' })).toBeVisible();
  await expect(page.getByLabel('Squad stat shape')).toContainText('Squad Shape');

  await nav.getByRole('button', { name: /Arena/i }).click();
  await expect(page.getByLabel('Run readiness checklist')).toContainText('Run Readiness');
  await expect(page.getByLabel('Arena momentum')).toContainText(/Ignition Run|Chain x/i);
  await expect(page.getByLabel('Arena momentum')).toContainText(/Next win|Rewards unlock/i);
  await expect(page.getByLabel('Reward forecast')).toContainText(/Reward Forecast/i);
  await expect(page.getByLabel('Arena objective stack')).toContainText('Daily Directive');
  await expect(page.getByLabel('Arena objective stack')).toContainText('Next Evolution');
  await expect(page.getByLabel('Arena objective stack')).toContainText('Battle Milestone');
  await expect(page.getByRole('button', { name: /Start Battle|Queue Next Battle|Retry Battle/i })).toBeEnabled();
});

test('arena exposes hybrid controls and the medals tab lists achievements', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
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

test('arena prep console can auto-prep and launch a run', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Arena/i }).click();
  await expect(page.getByLabel('Prep console')).toContainText('Coach + Drill Macros');
  await page.getByRole('button', { name: /Prep \+ Launch/i }).click();

  await expect(page.getByText(/CR \+\d+ Coins/)).toBeVisible();
  await expect(page.getByText(/XP \+\d+/)).toBeVisible();
});

test('collection can evolve a reachable chase directly', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
  const nav = page.locator('nav[aria-label="Game sections"]');

  await nav.getByRole('button', { name: /Collection/i }).click();
  await expect(page.getByLabel('Chase queue')).toContainText('Chase Queue');
  await page.getByRole('button', { name: 'Reachable Now' }).click();
  const beforeArchiveOnline = await page.locator('.archive-sync small').innerText();
  await page.getByRole('button', { name: 'Evolve Now' }).first().click();

  await expect(page.locator('.archive-sync small')).not.toHaveText(beforeArchiveOnline);
  await expect(page.getByLabel('Recommended next command')).not.toContainText('Cinderpaw can go online');
});

test('full squads can swap in stronger reserve candidates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissOnboarding(page);
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
  await dismissOnboarding(page);
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
