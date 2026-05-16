import type { VideoController } from './VideoController';

const HIGH_Z = 2147483646; // 比 Shadow DOM UI 低 1

export interface MaximizeOptions {
  keepAspect: boolean;
}

export interface Size {
  width: number;
  height: number;
  x: number;
  y: number;
}

export class MaximizeEngine {
  private maximized = false;

  constructor(private controller: VideoController) {}

  maximize(opts: MaximizeOptions): void {
    if (!this.controller.isAttached()) this.controller.attach();
    const video = this.controller.getElement();
    // Always lift to body for predictable position:fixed behavior across sites
    if (video.parentElement !== document.body) {
      document.body.appendChild(video);
    }
    const targetW = window.innerWidth;
    const targetH = window.innerHeight;
    let width = targetW;
    let height = targetH;
    let x = 0;
    let y = 0;

    if (opts.keepAspect) {
      const sourceRatio = video.videoWidth / video.videoHeight || 16 / 9;
      const targetRatio = targetW / targetH;
      if (sourceRatio > targetRatio) {
        width = targetW;
        height = Math.round(targetW / sourceRatio);
        y = Math.round((targetH - height) / 2);
      } else {
        height = targetH;
        width = Math.round(targetH * sourceRatio);
        x = Math.round((targetW - width) / 2);
      }
    }

    this.controller.applyTransform({
      position: 'fixed',
      top: `${y}px`,
      left: `${x}px`,
      width: `${width}px`,
      height: `${height}px`,
      zIndex: HIGH_Z,
    });
    this.maximized = true;
  }

  setSize(size: Size): void {
    const video = this.controller.getElement();
    if (video.parentElement !== document.body) {
      document.body.appendChild(video);
    }
    this.controller.applyTransform({
      position: 'fixed',
      top: `${size.y}px`,
      left: `${size.x}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      zIndex: HIGH_Z,
    });
  }

  restore(): void {
    if (!this.maximized) return;
    this.controller.detach();
    this.maximized = false;
  }

  isMaximized(): boolean {
    return this.maximized;
  }

}
