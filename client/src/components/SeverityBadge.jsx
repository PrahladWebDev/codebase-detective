import { SEVERITY_META } from '../utils/format';

export default function SeverityBadge({ severity }) {
  const meta = SEVERITY_META[severity] || SEVERITY_META.LOW;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium font-mono"
      style={{ backgroundColor: `${meta.color}1A`, color: meta.color, border: `1px solid ${meta.color}44` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
