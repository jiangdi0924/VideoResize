import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MaximizeEngine } from '@content/modules/MaximizeEngine';

describe('MaximizeEngine', () => {
  let source: HTMLVideoElement;
  let container: HTMLDivElement;
  let engine: MaximizeEngine;

  beforeEach(() => {
    document.body.innerHTML = '';
    // jsdom does not implement HTMLMediaElement.prototype.play; stub it globally.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    source = document.createElement('video');
    Object.defineProperty(source, 'videoWidth', { value: 1920, configurable: true });
    Object.defineProperty(source, 'videoHeight', { value: 1080, configurable: true });
    // captureStream mock returns a minimal MediaStream-like object with getTracks()
    const mockStream = { getTracks: () => [] } as unknown as MediaStream;
    (source as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream = vi.fn(() => mockStream);
    document.body.appendChild(source);
    container = document.createElement('div');
    document.body.appendChild(container);
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
    engine = new MaximizeEngine(source, container);
  });

  it('maximize creates a mirror video at viewport size', () => {
    engine.maximize({ keepAspect: false });
    const mirror = engine.getMirror();
    expect(mirror).not.toBe(null);
    expect(mirror!.style.position).toBe('fixed');
    expect(mirror!.style.width).toBe('1920px');
    expect(mirror!.style.height).toBe('1080px');
    expect(mirror!.parentElement).toBe(container);
  });

  it('original video is unchanged after maximize', () => {
    const originalStyle = source.style.cssText;
    engine.maximize({ keepAspect: false });
    expect(source.style.cssText).toBe(originalStyle);
    expect(source.parentElement).toBe(document.body);
  });

  it('restore removes the mirror', () => {
    engine.maximize({ keepAspect: false });
    expect(engine.getMirror()).not.toBe(null);
    engine.restore();
    expect(engine.getMirror()).toBe(null);
  });

  it('setSize applies dimensions to the mirror', () => {
    engine.maximize({ keepAspect: false });
    engine.setSize({ width: 800, height: 600, x: 100, y: 50 });
    const mirror = engine.getMirror()!;
    expect(mirror.style.width).toBe('800px');
    expect(mirror.style.height).toBe('600px');
    expect(mirror.style.left).toBe('100px');
    expect(mirror.style.top).toBe('50px');
  });

  it('applyAspectToMirror sets scale and object-fit on mirror', () => {
    engine.maximize({ keepAspect: false });
    engine.applyAspectToMirror(1.3, 1, 'fill');
    const mirror = engine.getMirror()!;
    expect(mirror.style.transform).toContain('scale(1.3, 1)');
    expect(mirror.style.objectFit).toBe('fill');
  });

  it('isMaximized reflects state', () => {
    expect(engine.isMaximized()).toBe(false);
    engine.maximize({ keepAspect: false });
    expect(engine.isMaximized()).toBe(true);
    engine.restore();
    expect(engine.isMaximized()).toBe(false);
  });
});
