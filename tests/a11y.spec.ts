import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility guard: axe-core must report no serious or critical WCAG A/AA violations on every
 * primary view, at phone and desktop width.
 */

const VIEWS: readonly { area: string; view?: string }[] = [
  { area: 'Evolve' },
  { area: 'Squad', view: 'Formation' },
  { area: 'Squad', view: 'Loadout' },
  { area: 'Battle', view: 'Arena' },
  { area: 'Battle', view: 'Campaign' },
  { area: 'Explore' },
  { area: 'Archive', view: 'Collection' },
  { area: 'Archive', view: 'Research' },
  { area: 'Archive', view: 'Achievements' },
  { area: 'Archive', view: 'Guide' },
];

async function dismissOnboarding(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
] as const) {
  test(`axe: no serious violations @ ${viewport.name}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await dismissOnboarding(page);
    const nav = page.getByRole('navigation', { name: 'Game sections' });
    const problems: string[] = [];

    for (const entry of VIEWS) {
      await nav.getByRole('button', { name: entry.area, exact: true }).click();
      if (entry.view) await page.getByRole('button', { name: entry.view, exact: true }).click();
      await page.waitForTimeout(400);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      for (const violation of results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')) {
        problems.push(`${entry.area}/${entry.view ?? '-'}: ${violation.id} (${violation.nodes.length}) ${violation.nodes[0]?.target.join(' ')}`);
      }
    }

    expect(problems, problems.join('\n')).toHaveLength(0);
  });
}
