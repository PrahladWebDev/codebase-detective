import { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SectionHeader, SearchInput } from '../../layouts/DashboardLayout.jsx';
import { formatBytes, formatNumber } from '../../utils/format.js';

const SORT_OPTIONS = [
  { key: 'lines', label: 'Lines' },
  { key: 'size', label: 'Size' },
  { key: 'imports', label: 'Imports' },
  { key: 'complexity', label: 'Complexity' },
];

export default function FilesSection({ report, highlightPath }) {
  const [query, setQuery] = useState('');
  const [ext, setExt] = useState('all');
  const [sortKey, setSortKey] = useState('lines');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (highlightPath) {
      const match = report.files.find((f) => f.path === highlightPath);
      if (match) setSelected(match);
    }
  }, [highlightPath, report.files]);

  const extensions = useMemo(() => Array.from(new Set(report.files.map((f) => f.ext).filter(Boolean))).sort(), [report.files]);

  const filtered = useMemo(() => {
    return report.files
      .filter((f) => (ext === 'all' ? true : f.ext === ext))
      .filter((f) => f.path.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
  }, [report.files, query, ext, sortKey]);

  const dependencyGraph = report.dependencies;
  const incomingFor = (path) => dependencyGraph.edges.filter((e) => e.to === path).length;

  return (
    <div>
      <SectionHeader
        title="Files"
        description={`${formatNumber(filtered.length)} of ${formatNumber(report.summary.totalFiles)} files`}
        right={
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={ext}
              onChange={(e) => setExt(e.target.value)}
              className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm text-paper-100 outline-none"
            >
              <option value="all">All extensions</option>
              {extensions.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm text-paper-100 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>Sort: {o.label}</option>
              ))}
            </select>
            <SearchInput value={query} onChange={setQuery} placeholder="Search files..." />
          </div>
        }
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-paper-500 border-b border-ink-700">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium text-right">Lines</th>
                <th className="px-4 py-3 font-medium text-right">Size</th>
                <th className="px-4 py-3 font-medium text-right">Imports</th>
                <th className="px-4 py-3 font-medium text-right">Complexity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 300).map((f) => (
                <tr
                  key={f.path}
                  onClick={() => setSelected(f)}
                  className="border-b border-ink-800 hover:bg-ink-800/60 cursor-pointer transition"
                >
                  <td className="px-4 py-2.5 mono text-paper-200 truncate max-w-xs">{f.path}</td>
                  <td className="px-4 py-2.5 text-right mono text-paper-300">{formatNumber(f.lines)}</td>
                  <td className="px-4 py-2.5 text-right mono text-paper-300">{formatBytes(f.size)}</td>
                  <td className="px-4 py-2.5 text-right mono text-paper-300">{f.imports}</td>
                  <td className="px-4 py-2.5 text-right mono text-paper-300">{f.complexity || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-paper-500 text-sm py-10">No files match your filters.</p>}
        {filtered.length > 300 && (
          <p className="text-center text-xs text-paper-500 py-3 border-t border-ink-800">Showing the top 300 of {filtered.length} matches — refine your search to narrow further.</p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/50" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md h-full bg-ink-900 border-l border-ink-700 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="mono text-sm text-spotlight break-all">{selected.path}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-paper-500 hover:text-paper-100">
                <X size={18} />
              </button>
            </div>
            {selected.parseError && (
              <p className="text-xs text-sev-medium mb-4">⚠ This file could not be fully parsed: {selected.parseError}</p>
            )}
            <dl className="space-y-3 text-sm">
              {[
                ['Language', selected.language],
                ['Lines', formatNumber(selected.lines)],
                ['Size', formatBytes(selected.size)],
                ['Imports', selected.imports],
                ['Exports', selected.exports],
                ['Functions', selected.functions],
                ['Classes', selected.classes],
                ['Complexity', selected.complexity || '—'],
                ['Imported by', `${incomingFor(selected.path)} file(s)`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-ink-800 pb-2">
                  <dt className="text-paper-500">{label}</dt>
                  <dd className="mono text-paper-100">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
