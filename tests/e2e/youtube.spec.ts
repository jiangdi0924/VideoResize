import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

test('VideoResize works on YouTube watch page', async () => {
  const userDataDir = '/tmp/videoresize-e2e-yt-' + Date.now();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${resolve(__dirname, '../../dist')}`,
      `--load-extension=${resolve(__dirname, '../../dist')}`,
    ],
  });

  const page = await ctx.newPage();
  await page.goto('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  await page.waitForSelector('video');
  await page.evaluate(() => document.querySelector('video')!.play().catch(() => {}));
  await page.waitForTimeout(2000);

  const hostFound = await page.evaluate(() => {
    return !!document.getElementById('video-resize-root');
  });
  expect(hostFound).toBe(true);

  await ctx.close();
});
