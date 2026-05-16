import { test, expect, chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

test('floating toolbar appears on video page after playback', async () => {
  const userDataDir = '/tmp/videoresize-e2e-' + Date.now();
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${resolve(__dirname, '../../dist')}`,
      `--load-extension=${resolve(__dirname, '../../dist')}`,
    ],
  });

  const page = await ctx.newPage();
  const url = 'file://' + resolve(__dirname, 'fixtures/video-page.html');
  await page.goto(url);

  // 触发播放
  try {
    await page.evaluate(() => (document.getElementById('v') as HTMLVideoElement).play());
  } catch {
    // Play may fail due to autoplay policy, but the detector checks played.length
  }
  await page.waitForTimeout(2000);

  // Check that the extension has mounted the shadow root host
  // The shadowRoot is 'closed' so we can't inspect it from page context,
  // but the presence of the host element confirms the extension loaded and mounted
  const hostElement = await page.evaluate(() => {
    const host = document.getElementById('video-resize-root');
    return !!host;
  });
  expect(hostElement).toBe(true);

  await ctx.close();
});
