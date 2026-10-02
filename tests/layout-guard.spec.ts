import { expect, test, type Page } from '@playwright/test';

/**
 * Layout guard: every primary view at phone, tablet and desktop widths must render without
 * page errors and without content poking outside the viewport. Elements inside intentional
 * horizontal rails (overflow-x: auto/scroll) are allowed to extend past the edge.
 */

const VIEWPORTS = [
  { name: 'phone-s', width: 360, height: 800 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 960 },
] as const;

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

async function findEscapingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const scrollsX = (el: Element | null): boolean => {
      for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
        const overflowX = getComputedStyle(node).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
      }
      return false;
    };
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll('.play-surface *, .header-hud *, nav *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= width + 1 && rect.left >= -1) continue;
      if (scrollsX(el)) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.position === 'fixed') continue;
      const label = `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).trim().split(/\s+/).slice(0, 2).join('.')}`;
      offenders.push(`${label} [${Math.round(rect.left)}..${Math.round(rect.right)}]`);
      if (offenders.length >= 6) break;
    }
    return offenders;
  });
}

for (const viewport of VIEWPORTS) {
  test(`layout guard @ ${viewport.name} ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await dismissOnboarding(page);
    const nav = page.getByRole('navigation', { name: 'Game sections' });
    const problems: string[] = [];

    for (const entry of VIEWS) {
      await nav.getByRole('button', { name: entry.area, exact: true }).click();
      if (entry.view) await page.getByRole('button', { name: entry.view, exact: true }).click();
      await page.waitForTimeout(250);
      const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (docOverflow > 0) problems.push(`${entry.area}/${entry.view ?? '-'}: document overflows by ${docOverflow}px`);
      const escaping = await findEscapingElements(page);
      if (escaping.length) problems.push(`${entry.area}/${entry.view ?? '-'}: ${escaping.join(', ')}`);
    }

    expect(errors, errors.join('\n')).toHaveLength(0);
    expect(problems, problems.join('\n')).toHaveLength(0);
  });
}
