// 简化版 eTLD+1 提取：识别常见的多级 TLD，否则退化到 host 的最后两段
const MULTI_LEVEL_TLDS = new Set([
  'co.uk', 'co.jp', 'co.kr', 'com.cn', 'com.au', 'com.br',
  'co.nz', 'co.in', 'org.uk', 'gov.uk', 'ac.uk',
]);

export function extractDomain(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const parts = host.split('.');
  if (parts.length < 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  if (parts.length >= 3 && MULTI_LEVEL_TLDS.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}
