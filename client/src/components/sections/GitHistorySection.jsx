import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GitCommitHorizontal, Users, History } from 'lucide-react';
import { SectionHeader } from '../../layouts/DashboardLayout.jsx';
import StatCard from '../StatCard.jsx';
import { formatNumber } from '../../utils/format.js';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function GitHistorySection({ report }) {
  const history = report.gitHistory;

  if (!history || !history.available) {
    return (
      <div>
        <SectionHeader title="Git History" description="Churn, most-changed files, and contributor activity" />
        <div className="card p-10 flex flex-col items-center text-center text-paper-500">
          <History size={28} className="mb-3 text-paper-500" />
          <p className="font-display text-paper-100 mb-1">No git history available</p>
          <p className="text-sm max-w-md">
            {history?.reason || 'This source has no .git directory to analyze.'} Analyze a GitHub repository URL instead of a ZIP to see churn and contributor activity.
          </p>
        </div>
      </div>
    );
  }

  const churnData = history.mostChanged.slice(0, 10).map((f) => ({
    path: f.path.length > 28 ? `…${f.path.slice(-27)}` : f.path,
    fullPath: f.path,
    commits: f.commits,
  }));

  return (
    <div>
      <SectionHeader
        title="Git History"
        description={
          history.truncated
            ? `Based on the ${formatNumber(history.totalCommitsAnalyzed)} most recent commits (history is longer than this)`
            : `Based on ${formatNumber(history.totalCommitsAnalyzed)} commits`
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Commits Analyzed" value={formatNumber(history.totalCommitsAnalyzed)} />
        <StatCard label="Contributors" value={formatNumber(history.contributors.length)} />
        <StatCard label="Active Period" value={history.dateRange ? `${formatDate(history.dateRange.from)} – ${formatDate(history.dateRange.to)}` : '—'} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display font-semibold mb-1 flex items-center gap-2">
            <GitCommitHorizontal size={16} className="text-spotlight" /> Most-Changed Files
          </h3>
          <p className="text-xs text-paper-500 mb-4">Files touched by the most commits — often a signal of hot spots or shared responsibility.</p>
          {churnData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2530" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8891A3', fontSize: 12 }} axisLine={{ stroke: '#2A313F' }} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="path" width={140} tick={{ fill: '#8891A3', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#161B24', border: '1px solid #2A313F', borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [`${value} commits`, '']}
                    labelFormatter={(_, entry) => entry?.[0]?.payload?.fullPath || ''}
                  />
                  <Bar dataKey="commits" fill="#5B8DEF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-paper-500">No file changes recorded.</p>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold mb-1 flex items-center gap-2">
            <Users size={16} className="text-spotlight" /> Contributors
          </h3>
          <p className="text-xs text-paper-500 mb-4">Commit counts by author, over the analyzed history.</p>
          <ul className="space-y-2">
            {history.contributors.slice(0, 10).map((c) => (
              <li key={c.email || c.name} className="flex items-center justify-between text-sm">
                <span className="truncate text-paper-300">{c.name}</span>
                <span className="mono text-xs text-paper-500 shrink-0 ml-3">{formatNumber(c.commits)} commits</span>
              </li>
            ))}
            {history.contributors.length === 0 && <li className="text-sm text-paper-500">No contributor data.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
