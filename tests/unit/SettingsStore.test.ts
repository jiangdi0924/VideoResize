import { describe, it, expect, beforeEach } from 'vitest';
import { createSettingsStore } from '@shared/store/SettingsStore';
import { DEFAULT_DOMAIN_SETTINGS, DEFAULT_GLOBAL_SETTINGS } from '@shared/types';

describe('SettingsStore', () => {
  let store: ReturnType<typeof createSettingsStore>;

  beforeEach(async () => {
    store = createSettingsStore();
    await store.getState().init();
  });

  it('initializes with defaults when storage is empty', () => {
    const state = store.getState();
    expect(state.global).toEqual(DEFAULT_GLOBAL_SETTINGS);
    expect(state.domains).toEqual({});
  });

  it('updates global settings and persists', async () => {
    await store.getState().updateGlobal({ defaultMaskOpacity: 0.5 });
    expect(store.getState().global.defaultMaskOpacity).toBe(0.5);
    // Wait for 200ms debounce to flush to storage
    await new Promise((r) => setTimeout(r, 250));
    const stored = await chrome.storage.local.get('settings');
    expect((stored.settings as { global: { defaultMaskOpacity: number } }).global.defaultMaskOpacity).toBe(0.5);
  });

  it('upserts domain settings (merge with defaults)', async () => {
    await store.getState().updateDomain('youtube.com', { lastMaximize: true });
    const got = store.getState().domains['youtube.com'];
    expect(got).toEqual({ ...DEFAULT_DOMAIN_SETTINGS, lastMaximize: true });
  });

  it('returns existing domain settings merged with overrides', async () => {
    await store.getState().updateDomain('youtube.com', { lastMaximize: true, lastMaskOpacity: 0.6 });
    await store.getState().updateDomain('youtube.com', { lastMaximize: false });
    const got = store.getState().domains['youtube.com'];
    expect(got.lastMaximize).toBe(false);
    expect(got.lastMaskOpacity).toBe(0.6);
  });

  it('getDomain returns defaults for unknown domain', () => {
    const got = store.getState().getDomain('unknown.com');
    expect(got).toEqual(DEFAULT_DOMAIN_SETTINGS);
  });
});
