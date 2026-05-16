import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoDetector } from '@content/modules/VideoDetector';

function mockVideo(opts: { width: number; height: number; played?: boolean; visible?: boolean }) {
  const v = document.createElement('video');
  Object.defineProperty(v, 'getBoundingClientRect', {
    value: () => ({
      width: opts.width,
      height: opts.height,
      top: 0,
      left: 0,
      right: opts.width,
      bottom: opts.height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  if (opts.played) Object.defineProperty(v, 'played', { value: { length: 1 } });
  if (opts.visible !== false) {
    Object.defineProperty(v, 'offsetParent', { value: document.body });
  } else {
    Object.defineProperty(v, 'offsetParent', { value: null });
  }
  document.body.appendChild(v);
  return v;
}

describe('VideoDetector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('returns null when no video on page', () => {
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).toBe(null);
  });

  it('picks the only played video', () => {
    mockVideo({ width: 800, height: 450, played: true });
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).not.toBe(null);
  });

  it('ignores never-played video when others have been played', () => {
    mockVideo({ width: 1000, height: 500, played: false });
    const played = mockVideo({ width: 200, height: 100, played: true });
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).toBe(played);
  });

  it('among played videos, picks the one with largest visible area', () => {
    mockVideo({ width: 400, height: 300, played: true });
    const big = mockVideo({ width: 1000, height: 500, played: true });
    const detector = new VideoDetector();
    expect(detector.getTargetVideo()).toBe(big);
  });

  it('emits videochange when target changes', async () => {
    const detector = new VideoDetector();
    const handler = vi.fn();
    detector.on('videochange', handler);
    mockVideo({ width: 1000, height: 500, played: true });
    detector.rescan();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
