import { describe, it, expect } from 'vitest';
import { extractDomain } from '@shared/domain';

describe('extractDomain', () => {
  it('returns hostname for plain domain', () => {
    expect(extractDomain('https://example.com/foo')).toBe('example.com');
  });

  it('returns eTLD+1 for subdomain', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=x')).toBe('youtube.com');
    expect(extractDomain('https://m.bilibili.com/video/x')).toBe('bilibili.com');
  });

  it('handles co.uk style TLD', () => {
    expect(extractDomain('https://www.bbc.co.uk/iplayer')).toBe('bbc.co.uk');
  });

  it('returns null for invalid URL', () => {
    expect(extractDomain('not a url')).toBe(null);
  });
});
