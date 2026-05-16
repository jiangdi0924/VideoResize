import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PopOutEngine } from '@content/modules/PopOutEngine';

describe('PopOutEngine', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    video = document.createElement('video');
    document.body.appendChild(video);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers Document PiP when available', async () => {
    const requestWindow = vi.fn(async () => ({
      document: document.implementation.createHTMLDocument(),
      addEventListener: vi.fn(),
    }));
    vi.stubGlobal('documentPictureInPicture', { requestWindow });

    const engine = new PopOutEngine(video);
    const result = await engine.popOut();
    expect(result.strategy).toBe('document-pip');
    expect(requestWindow).toHaveBeenCalled();
  });

  it('falls back to native PiP when Document PiP unavailable', async () => {
    vi.stubGlobal('documentPictureInPicture', undefined);
    const mockPiP = vi.fn(async () => ({}) as PictureInPictureWindow);
    Object.defineProperty(video, 'requestPictureInPicture', {
      value: mockPiP,
      configurable: true,
    });

    const engine = new PopOutEngine(video);
    const result = await engine.popOut();
    expect(result.strategy).toBe('native-pip');
    expect(mockPiP).toHaveBeenCalled();
  });

  it('openStandaloneWindow sends move-tab message to background', async () => {
    const engine = new PopOutEngine(video);
    await engine.openStandaloneWindow();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'move-tab-to-window' });
  });
});
