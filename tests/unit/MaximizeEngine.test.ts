import { describe, it, expect, beforeEach } from 'vitest';
import { MaximizeEngine } from '@content/modules/MaximizeEngine';
import { VideoController } from '@content/modules/VideoController';

describe('MaximizeEngine', () => {
  let video: HTMLVideoElement;
  let ctrl: VideoController;

  beforeEach(() => {
    document.body.innerHTML = '';
    video = document.createElement('video');
    document.body.appendChild(video);
    ctrl = new VideoController(video);
    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
  });

  it('maximize applies fixed positioning filling viewport', () => {
    const engine = new MaximizeEngine(ctrl);
    engine.maximize({ keepAspect: false });
    expect(video.style.position).toBe('fixed');
    expect(video.style.top).toBe('0px');
    expect(video.style.left).toBe('0px');
    expect(video.style.width).toBe('1920px');
    expect(video.style.height).toBe('1080px');
  });

  it('restore undoes maximize', () => {
    const engine = new MaximizeEngine(ctrl);
    engine.maximize({ keepAspect: false });
    engine.restore();
    expect(video.style.position).not.toBe('fixed');
  });

  it('setSize applies arbitrary dimensions', () => {
    const engine = new MaximizeEngine(ctrl);
    engine.maximize({ keepAspect: false });
    engine.setSize({ width: 800, height: 600, x: 100, y: 50 });
    expect(video.style.width).toBe('800px');
    expect(video.style.height).toBe('600px');
    expect(video.style.left).toBe('100px');
    expect(video.style.top).toBe('50px');
  });

  it('isMaximized reflects state', () => {
    const engine = new MaximizeEngine(ctrl);
    expect(engine.isMaximized()).toBe(false);
    engine.maximize({ keepAspect: false });
    expect(engine.isMaximized()).toBe(true);
    engine.restore();
    expect(engine.isMaximized()).toBe(false);
  });
});
