import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

test('VideoResize works on Bilibili video page', async () => {
  const userDataDir = '/tmp/videoresize-e2e-bili-' + Date.now();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${resolve(__dirname, '../../dist')}`,
      `--load-extension=${resolve(__dirname, '../../dist')}`,
    ],
  });

  const page = await ctx.newPage();
  await page.goto('https://www.bilibili.com/video/BV1GJ411x7h7');
  await page.waitForSelector('video', { timeout: 15000 });
  await page.evaluate(() => document.querySelector('video')!.play().catch(() => {}));
  await page.waitForTimeout(2000);

  const hostFound = await page.evaluate(() => {
    return !!document.getElementById('video-resize-root');
  });
  expect(hostFound).toBe(true);

  await ctx.close();
});
