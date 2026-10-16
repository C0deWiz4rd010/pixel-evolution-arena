import { expect, test, type Page } from '@playwright/test';

/**
 * Local visual regression net for style refactors. Baselines are platform-specific (fonts, GPU),
 * so they stay out of git: run `npm run test:visual -- --update-snapshots` on a known-good commit,
 * refactor, then `npm run test:visual` to diff every view at phone and desktop width.
 */

const SAVE = {
  saveVersion: 12,
  savedAt: '2026-10-01T12:00:00.000Z',
  player: {
    coins: 2400,
    dnaShards: 120,
    battlesFought: 6,
    battlesWon: 4,
    squadIds: ['M007', 'M008'],
    selectedMonsterId: 'M007',
    tutorialDone: true,
    inventory: ['Shadow Gem', 'Repair Cell'],
    bioData: 60,
    totalBioData: 90,
  },
  monsters: [],
  battleLogs: [{ text: 'Visual baseline log line.', type: 'system' }],
};

const VIEWS: readonly { area: string; view?: string; key: string }[] = [
  { area: 'Evolve', key: 'evolve' },
  { area: 'Squad', view: 'Formation', key: 'squad' },
  { area: 'Squad', view: 'Loadout', key: 'loadout' },
  { area: 'Battle', view: 'Arena', key: 'arena' },
  { area: 'Battle', view: 'Campaign', key: 'campaign' },
  { area: 'Explore', key: 'expedition' },
  { area: 'Archive', view: 'Collection', key: 'collection' },
  { area: 'Archive', view: 'Research', key: 'research' },
  { area: 'Archive', view: 'Achievements', key: 'medals' },
  { area: 'Archive', view: 'Guide', key: 'guide' },
];

async function openSeeded(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date('2026-10-01T12:00:00'));
  await page.addInitScript((save) => {
    localStorage.setItem('pixel-evolution-arena.save', JSON.stringify(save));
    Math.random = () => 0.42;
  }, SAVE);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.addStyleTag({ content: 'app-arena-effects { display: none !important; }' });
  await page.waitForLoadState('networkidle');
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
]) {
  test.describe(`visual @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const entry of VIEWS) {
      test(entry.key, async ({ page }) => {
        await openSeeded(page);
        await page.getByRole('navigation', { name: 'Game sections' }).getByRole('button', { name: entry.area, exact: true }).click();
        if (entry.view) await page.getByRole('button', { name: entry.view, exact: true }).click();
        await page.waitForTimeout(600);
        await expect(page).toHaveScreenshot(`${viewport.name}-${entry.key}.png`, {
          fullPage: false,
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.002,
          mask: [page.locator('.pixi-host canvas, app-expedition-map canvas')],
        });
      });
    }
  });
}
