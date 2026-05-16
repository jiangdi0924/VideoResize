import { describe, it, expect, beforeEach } from 'vitest';
import { VideoController } from '@content/modules/VideoController';

describe('VideoController', () => {
  let video: HTMLVideoElement;
  let parent: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    parent = document.createElement('div');
    parent.id = 'host';
    video = document.createElement('video');
    video.style.cssText = 'width: 640px; height: 360px; border: 1px solid red;';
    parent.appendChild(video);
    document.body.appendChild(parent);
  });

  it('attach captures original style and parent', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    expect(ctrl.isAttached()).toBe(true);
  });

  it('detach restores original style and parent', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    video.style.cssText = 'position: fixed; inset: 0;';
    ctrl.detach();
    expect(video.style.cssText).toBe('width: 640px; height: 360px; border: 1px solid red;');
    expect(video.parentElement).toBe(parent);
  });

  it('applyTransform sets transform and aspect ratio', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    ctrl.applyTransform({ scaleX: 1.2, scaleY: 0.8, objectFit: 'cover' });
    expect(video.style.transform).toContain('scale(1.2, 0.8)');
    expect(video.style.objectFit).toBe('cover');
  });

  it('throws on applyTransform when not attached', () => {
    const ctrl = new VideoController(video);
    expect(() => ctrl.applyTransform({ scaleX: 1, scaleY: 1 })).toThrow();
  });

  it('detach is idempotent', () => {
    const ctrl = new VideoController(video);
    ctrl.attach();
    ctrl.detach();
    expect(() => ctrl.detach()).not.toThrow();
  });
});
