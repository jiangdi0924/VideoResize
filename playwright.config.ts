import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const distPath = resolve(__dirname, 'dist');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    headless: false,
    launchOptions: {
      args: [
        `--disable-extensions-except=${distPath}`,
        `--load-extension=${distPath}`,
      ],
    },
  },
});
