export class VideoMirror {
  private clone: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  /**
   * Start mirroring `source` into `container`. Returns the created clone element.
   * Throws if captureStream is unavailable or fails.
   */
  start(source: HTMLVideoElement, container: HTMLElement): HTMLVideoElement {
    if (this.clone) return this.clone;
    type CaptureCapable = HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const cap = source as CaptureCapable;
    const stream = cap.captureStream?.() ?? cap.mozCaptureStream?.();
    if (!stream) throw new Error('captureStream not supported on this <video>');
    this.stream = stream;

    const clone = document.createElement('video');
    clone.srcObject = stream;
    clone.muted = true;
    clone.autoplay = true;
    clone.playsInline = true;
    clone.controls = false;
    // Avoid the clone trying to fight for itself
    clone.setAttribute('data-video-resize-mirror', '');
    container.appendChild(clone);
    void clone.play().catch(() => {
      // Autoplay rejection (without user gesture) is fine; the stream will still feed frames.
    });
    this.clone = clone;
    return clone;
  }

  /**
   * Stop mirroring and remove the clone. Idempotent.
   */
  stop(): void {
    if (this.clone) {
      this.clone.srcObject = null;
      this.clone.remove();
      this.clone = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  getClone(): HTMLVideoElement | null {
    return this.clone;
  }
}
