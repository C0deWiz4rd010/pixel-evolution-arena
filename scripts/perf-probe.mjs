#!/usr/bin/env node
/**
 * Production performance probe on a throttled phone profile.
 *
 * Serves dist/ with a tiny static server, opens it in Chromium at 390x844 with 4x CPU throttling and
 * reports LCP, startup long tasks, idle animation frames and the Collection tab-switch latency.
 *
 * Usage: npm run build && npm run perf
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= '0';
const { chromium } = await import('playwright');

const ROOT = 'dist/pixel-evolution-arena/browser';
const PORT = 4411;
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname);
  const file = path === '/' ? 'index.html' : path;
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(await readFile(join(ROOT, 'index.html')));
  }
}).listen(PORT);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  window.__lcp = 0;
  window.__long = 0;
  window.__frames = 0;
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => (window.__lcp = entry.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => (window.__long += entry.duration))).observe({ type: 'longtask', buffered: true });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    window.__frames += 1;
    return raf(callback);
  };
  // Returning player with onboarding done, so the measurement reflects the real game shell.
  localStorage.setItem(
    'pixel-evolution-arena.save',
    JSON.stringify({ saveVersion: 12, savedAt: new Date().toISOString(), player: { coins: 1200, dnaShards: 45, squadIds: ['M007', 'M008'], selectedMonsterId: 'M007', tutorialDone: true, inventory: [] }, monsters: [], battleLogs: [] }),
  );
});

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(3000);
const startup = await page.evaluate(() => ({ lcpMs: Math.round(window.__lcp), startupLongTaskMs: Math.round(window.__long) }));

await page.evaluate(() => (window.__frames = 0));
await page.waitForTimeout(5000);
const idleRafPerSec = await page.evaluate(() => window.__frames / 5);

const started = Date.now();
await page.getByRole('navigation', { name: 'Game sections' }).getByRole('button', { name: 'Archive', exact: true }).click();
await page.locator('.collection-grid').waitFor();
const collectionSwitchMs = Date.now() - started;

await page.waitForTimeout(2000);
await page.evaluate(() => (window.__frames = 0));
await page.waitForTimeout(4000);
const collectionIdleRafPerSec = await page.evaluate(() => window.__frames / 4);

console.log(JSON.stringify({ profile: 'phone 390x844, 4x CPU throttle', ...startup, idleRafPerSec, collectionSwitchMs, collectionIdleRafPerSec }, null, 2));
await browser.close();
server.close();
