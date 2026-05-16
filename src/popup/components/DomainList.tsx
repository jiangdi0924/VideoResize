import type { Settings } from '@shared/types';

interface DomainListProps {
  domains: Settings['domains'];
  onToggleAutoApply: (domain: string, enabled: boolean) => void;
  onRemove: (domain: string) => void;
}

export function DomainList({ domains, onToggleAutoApply, onRemove }: DomainListProps) {
  const entries = Object.entries(domains);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">尚无按域名保存的设置</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map(([domain, ds]) => (
        <li key={domain} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex-1 truncate">{domain}</span>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={ds.enabledOnSiteLoad}
              onChange={(e) => onToggleAutoApply(domain, e.target.checked)}
            />
            <span className="text-xs">自动应用</span>
          </label>
          <button
            onClick={() => onRemove(domain)}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${domain}`}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
