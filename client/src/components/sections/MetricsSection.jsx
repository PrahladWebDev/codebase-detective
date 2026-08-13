import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { SectionHeader } from '../../layouts/DashboardLayout.jsx';
import StatCard from '../StatCard.jsx';
import { formatNumber } from '../../utils/format.js';

const BUCKET_COLORS = { Low: '#4ADE80', Moderate: '#5B8DEF', High: '#F2C94C', 'Very High': '#E5484D' };

export default function MetricsSection({ report }) {
  const { metrics, detectors } = report;

  const complexityData = Object.entries(metrics.complexityDistribution).map(([bucket, count]) => ({ bucket, count }));

  return (
    <div>
      <SectionHeader title="Code Metrics" description="Indicators to guide review — not absolute quality judgments" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Files Analyzed" value={formatNumber(metrics.filesAnalyzed)} />
        <StatCard label="Total Functions" value={formatNumber(metrics.totalFunctions)} />
        <StatCard label="Avg Complexity" value={metrics.averageComplexity} />
        <StatCard label="High Complexity Files" value={formatNumber(metrics.highComplexityFiles)} accent={metrics.highComplexityFiles > 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display font-semibold mb-1">Complexity Distribution</h3>
          <p className="text-xs text-paper-500 mb-4">Low 0–5 · Moderate 6–10 · High 11–20 · Very High 20+</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complexityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2530" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: '#8891A3', fontSize: 12 }} axisLine={{ stroke: '#2A313F' }} tickLine={false} />
                <YAxis tick={{ fill: '#8891A3', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#161B24', border: '1px solid #2A313F', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {complexityData.map((d) => <Cell key={d.bucket} fill={BUCKET_COLORS[d.bucket]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold mb-4">Most Imported Module</h3>
          <p className="mono text-spotlight text-sm break-all">{metrics.mostImportedModule || '—'}</p>
          <p className="text-xs text-paper-500 mt-2">
            {report.dependencies.mostConnected[0]
              ? `${report.dependencies.mostConnected[0].dependents} files depend on this module.`
              : 'No internal dependency data available.'}
          </p>

          <h3 className="font-display font-semibold mt-6 mb-3">High Complexity Files</h3>
          <ul className="space-y-2 text-xs">
            {detectors.complexFiles.slice(0, 8).map((f) => (
              <li key={f.path} className="flex justify-between mono">
                <span className="truncate text-paper-300">{f.path}</span>
                <span style={{ color: BUCKET_COLORS[f.bucket] }}>{f.complexity}</span>
              </li>
            ))}
            {detectors.complexFiles.length === 0 && <li className="text-paper-500">None flagged.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
