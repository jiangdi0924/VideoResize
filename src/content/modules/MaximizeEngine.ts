import { VideoMirror } from './VideoMirror';

const HIGH_Z = 2147483646;

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
  private readonly mirror = new VideoMirror();

  constructor(
    private readonly source: HTMLVideoElement,
    private readonly mirrorContainer: HTMLElement,
  ) {}

  maximize(opts: MaximizeOptions): void {
    if (this.maximized) return;
    let clone: HTMLVideoElement;
    try {
      clone = this.mirror.start(this.source, this.mirrorContainer);
    } catch {
      // captureStream unavailable — gracefully do nothing rather than fight the DOM.
      return;
    }
    this.applyMirrorPosition(clone, opts);
    this.maximized = true;
  }

  setSize(size: Size): void {
    const clone = this.mirror.getClone();
    if (!clone) return;
    const s = clone.style;
    s.setProperty('top', `${size.y}px`, 'important');
    s.setProperty('left', `${size.x}px`, 'important');
    s.setProperty('width', `${size.width}px`, 'important');
    s.setProperty('height', `${size.height}px`, 'important');
  }

  /**
   * Apply aspect-ratio transforms to the mirror (used while maximized).
   * No-op if not maximized.
   */
  applyAspectToMirror(scaleX: number, scaleY: number, objectFit: 'fill' | 'contain' | 'cover'): void {
    const clone = this.mirror.getClone();
    if (!clone) return;
    const s = clone.style;
    s.setProperty('transform', `scale(${scaleX}, ${scaleY})`, 'important');
    s.setProperty('object-fit', objectFit, 'important');
  }

  restore(): void {
    if (!this.maximized) return;
    this.mirror.stop();
    this.maximized = false;
  }

  isMaximized(): boolean {
    return this.maximized;
  }

  /** Returns the mirror <video> element, or null if not maximized. */
  getMirror(): HTMLVideoElement | null {
    return this.mirror.getClone();
  }

  private applyMirrorPosition(clone: HTMLVideoElement, opts: MaximizeOptions): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let w = vw;
    let h = vh;
    let x = 0;
    let y = 0;

    if (opts.keepAspect) {
      const ratio = this.source.videoWidth / this.source.videoHeight || 16 / 9;
      const targetRatio = vw / vh;
      if (ratio > targetRatio) {
        h = Math.round(vw / ratio);
        y = Math.round((vh - h) / 2);
      } else {
        w = Math.round(vh * ratio);
        x = Math.round((vw - w) / 2);
      }
    }

    const s = clone.style;
    s.setProperty('position', 'fixed', 'important');
    s.setProperty('top', `${y}px`, 'important');
    s.setProperty('left', `${x}px`, 'important');
    s.setProperty('width', `${w}px`, 'important');
    s.setProperty('height', `${h}px`, 'important');
    s.setProperty('z-index', String(HIGH_Z), 'important');
    s.setProperty('background', '#000', 'important');
    s.setProperty('object-fit', 'contain', 'important');
    s.setProperty('display', 'block', 'important');
  }
}
