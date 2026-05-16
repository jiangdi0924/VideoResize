type Listener = () => void;

export class VideoDetector {
  private target: HTMLVideoElement | null = null;
  private listeners = new Map<'videochange', Set<Listener>>();
  private observer: MutationObserver | null = null;
  private rescanScheduled = false;

  constructor() {
    this.rescan();
    this.observer = new MutationObserver(() => this.scheduleRescan());
    if (typeof document !== 'undefined') {
      this.observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  private scheduleRescan(): void {
    if (this.rescanScheduled) return;
    this.rescanScheduled = true;
    if (typeof requestAnimationFrame === 'undefined') {
      this.rescanScheduled = false;
      this.rescan();
      return;
    }
    requestAnimationFrame(() => {
      this.rescanScheduled = false;
      this.rescan();
    });
  }

  getTargetVideo(): HTMLVideoElement | null {
    return this.target;
  }

  rescan(): void {
    const all = this.collectAllVideos();
    const played = all.filter((v) => v.played.length > 0);
    const candidates = played.length > 0 ? played : [];
    const best = this.pickLargestVisible(candidates);
    if (best !== this.target) {
      this.target = best;
      this.emit('videochange');
    }
  }

  on(event: 'videochange', cb: Listener): void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(cb);
    this.listeners.set(event, set);
  }

  off(event: 'videochange', cb: Listener): void {
    this.listeners.get(event)?.delete(cb);
  }

  destroy(): void {
    this.observer?.disconnect();
    this.listeners.clear();
  }

  private emit(event: 'videochange'): void {
    this.listeners.get(event)?.forEach((cb) => cb());
  }

  private collectAllVideos(): HTMLVideoElement[] {
    if (typeof document === 'undefined') return [];
    const out: HTMLVideoElement[] = [];
    const walk = (root: Document | ShadowRoot) => {
      out.push(...Array.from(root.querySelectorAll('video')));
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) walk(el.shadowRoot);
      });
    };
    walk(document);
    return out;
  }

  private pickLargestVisible(videos: HTMLVideoElement[]): HTMLVideoElement | null {
    let best: HTMLVideoElement | null = null;
    let bestArea = 0;
    for (const v of videos) {
      if (v.offsetParent === null) continue;
      const rect = v.getBoundingClientRect();
      const visW = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const visH = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      const area = visW * visH;
      if (area > bestArea) {
        bestArea = area;
        best = v;
      }
    }
    return best;
  }
}
