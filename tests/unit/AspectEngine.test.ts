import { describe, it, expect } from 'vitest';
import { AspectEngine, parseAspectRatio } from '@content/modules/AspectEngine';

describe('parseAspectRatio', () => {
  it('parses preset 16:9', () => {
    expect(parseAspectRatio('16:9')).toEqual({ width: 16, height: 9 });
  });
  it('parses custom 2.39:1', () => {
    expect(parseAspectRatio('custom:2.39:1')).toEqual({ width: 2.39, height: 1 });
  });
  it('parses original as null', () => {
    expect(parseAspectRatio('original')).toBe(null);
  });
});

describe('AspectEngine.compute', () => {
  it('stretch: scaleX=1 scaleY=1 when target == source', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '16:9', mode: 'stretch' });
    expect(out).toEqual({ transform: { scaleX: 1, scaleY: 1 }, objectFit: 'fill' });
  });

  it('stretch: scale 16:9 source to 21:9 target', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '21:9', mode: 'stretch' });
    // 21/9 = 2.333..., 16/9 = 1.777...
    // scaleX = (21/9) / (16/9) = 21/16 = 1.3125
    expect(out.transform.scaleX).toBeCloseTo(1.3125, 4);
    expect(out.transform.scaleY).toBe(1);
    expect(out.objectFit).toBe('fill');
  });

  it('letterbox: object-fit contain, no scaling', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '4:3', mode: 'letterbox' });
    expect(out.objectFit).toBe('contain');
    expect(out.transform.scaleX).toBe(1);
    expect(out.transform.scaleY).toBe(1);
  });

  it('crop: object-fit cover', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: '4:3', mode: 'crop' });
    expect(out.objectFit).toBe('cover');
  });

  it('original returns identity', () => {
    const out = AspectEngine.compute({ sourceW: 1920, sourceH: 1080, target: 'original', mode: 'stretch' });
    expect(out).toEqual({ transform: { scaleX: 1, scaleY: 1 }, objectFit: 'fill' });
  });
});
