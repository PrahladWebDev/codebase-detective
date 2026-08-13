import { useMemo, useState } from 'react';
import { SectionHeader } from '../../layouts/DashboardLayout.jsx';
import SeverityBadge from '../SeverityBadge.jsx';
import { SEVERITY_META } from '../../utils/format.js';

const FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function ProblemsSection({ report, onViewInGraph }) {
  const [filter, setFilter] = useState('ALL');
  const { problems, problemCounts } = report;

  const filtered = useMemo(
    () => (filter === 'ALL' ? problems : problems.filter((p) => p.severity === filter)),
    [problems, filter]
  );

  return (
    <div>
      <SectionHeader title="Problems" description="Every finding, in one place — ranked by severity" />

      <div className="flex flex-wrap gap-3 mb-6">
        {FILTERS.map((f) => {
          const meta = SEVERITY_META[f];
          const count = f === 'ALL' ? problems.length : problemCounts[f] || 0;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                filter === f ? 'border-spotlight bg-spotlight/10 text-spotlight' : 'border-ink-600 text-paper-300 hover:border-ink-500'
              }`}
            >
              {meta ? <span>{meta.emoji}</span> : null}
              {f === 'ALL' ? 'All' : meta.label} <span className="mono text-xs text-paper-500">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card p-10 text-center text-paper-500 text-sm">No problems in this category. Nice.</div>
      )}

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span>{SEVERITY_META[p.severity]?.emoji}</span>
                <h3 className="font-display font-semibold text-sm">{p.title}</h3>
              </div>
              <SeverityBadge severity={p.severity} />
            </div>
            <p className="mono text-xs text-paper-300 break-all mb-2">{p.description}</p>
            <p className="text-xs text-paper-500 mb-3">{p.why}</p>
            {p.details && (
              <ul className="text-xs mono text-paper-500 mb-3 list-disc list-inside">
                {p.details.map((d) => <li key={d}>{d}</li>)}
              </ul>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-paper-500">Files affected: {p.filesAffected}</span>
              {(p.type === 'circular-dependency' || p.type === 'god-object' || p.type === 'large-file') && (
                <button onClick={() => onViewInGraph(p.files[0])} className="text-xs text-spotlight hover:underline">
                  View in Graph →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
