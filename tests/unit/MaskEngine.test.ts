import { describe, it, expect } from 'vitest';
import { MaskEngine } from '@content/modules/MaskEngine';

describe('MaskEngine.computeClipPath', () => {
  it('returns clip path that excludes video rect', () => {
    const out = MaskEngine.computeClipPath(
      { left: 100, top: 50, right: 900, bottom: 550 },
      { width: 1000, height: 600 },
    );
    expect(out).toContain('polygon(');
    expect(out).toContain('0px 0px');
    expect(out).toContain('1000px 0px');
  });

  it('handles video at top-left corner', () => {
    const out = MaskEngine.computeClipPath(
      { left: 0, top: 0, right: 400, bottom: 300 },
      { width: 1000, height: 600 },
    );
    expect(out).toContain('polygon(');
  });

  it('clamps coords inside viewport', () => {
    const out = MaskEngine.computeClipPath(
      { left: -50, top: -50, right: 2000, bottom: 1000 },
      { width: 1000, height: 600 },
    );
    expect(out).not.toContain('-50px');
    expect(out).not.toContain('2000px');
  });
});

describe('MaskEngine.formatOpacityColor', () => {
  it('clamps opacity to 0-0.95', () => {
    expect(MaskEngine.formatOpacityColor(0.5)).toBe('rgba(0, 0, 0, 0.5)');
    expect(MaskEngine.formatOpacityColor(1.5)).toBe('rgba(0, 0, 0, 0.95)');
    expect(MaskEngine.formatOpacityColor(-0.1)).toBe('rgba(0, 0, 0, 0)');
  });
});
