import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileCode2, Ruler, FileWarning, AlertTriangle } from 'lucide-react';
import StatCard from '../StatCard.jsx';
import HealthGauge from '../HealthGauge.jsx';
import { SectionHeader } from '../../layouts/DashboardLayout.jsx';
import { formatNumber } from '../../utils/format.js';

const CHART_COLORS = ['#F2A93B', '#5B8DEF', '#4ADE80', '#E5484D', '#B7BECC', '#8891A3'];

export default function Overview({ report, onNavigate }) {
  const { summary, healthScore, problems, problemCounts } = report;

  return (
    <div>
      <SectionHeader title={report.projectName} description={`Report generated ${new Date(report.generatedAt).toLocaleString()}`} />

      {report.warnings?.length > 0 && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-sev-medium/40 bg-sev-medium/10 px-4 py-3 text-sm text-sev-medium">
          <FileWarning size={16} /> {report.warnings[0]}
        </div>
      )}

      <div className="grid md:grid-cols-[auto_1fr] gap-6 mb-6">
        <div className="card p-6 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-wider text-paper-500 mb-4">Health Score</span>
          <HealthGauge score={healthScore.score} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Files" value={formatNumber(summary.totalFiles)} icon={FileCode2} />
          <StatCard label="Lines of Code" value={formatNumber(summary.totalLines)} icon={Ruler} />
          <StatCard
            label="Dependencies"
            value={formatNumber(report.dependencies.edges.length)}
            sub="internal import edges"
          />
          <StatCard
            label="Potential Problems"
            value={formatNumber(problems.length)}
            icon={AlertTriangle}
            accent={problems.length > 0}
            sub={`${problemCounts.HIGH || 0} high · ${problemCounts.MEDIUM || 0} medium`}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-display font-semibold mb-1">Language Distribution</h3>
          <p className="text-xs text-paper-500 mb-4">by lines of code</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.languageDistribution}
                  dataKey="lines"
                  nameKey="language"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {summary.languageDistribution.map((entry, i) => (
                    <Cell key={entry.language} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161B24', border: '1px solid #2A313F', borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) => [`${formatNumber(value)} lines`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#B7BECC' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold mb-1">Health Score Breakdown</h3>
          <p className="text-xs text-paper-500 mb-4">starting score 100, transparent deductions</p>
          <div className="space-y-2 mono text-sm">
            <div className="flex justify-between text-paper-300">
              <span>Starting score</span>
              <span>100</span>
            </div>
            {healthScore.deductions.filter((d) => d.points > 0).map((d) => (
              <div key={d.label} className="flex justify-between text-sev-high">
                <span className="font-body text-paper-300">{d.label} ({d.count})</span>
                <span>-{d.points}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-ink-700 pt-2 mt-2 font-semibold">
              <span>Final</span>
              <span>{healthScore.score}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h3 className="font-display font-semibold mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-paper-500 text-xs mb-1">Largest File</p>
            <button className="mono text-spotlight hover:underline" onClick={() => onNavigate('files', summary.largestFile?.path)}>
              {summary.largestFile ? `${summary.largestFile.lines.toLocaleString()} lines` : '—'}
            </button>
          </div>
          <div>
            <p className="text-paper-500 text-xs mb-1">Most Imported</p>
            <button className="mono text-spotlight hover:underline truncate" onClick={() => onNavigate('dependencies', report.metrics.mostImportedModule)}>
              {report.metrics.mostImportedModule?.split('/').pop() || '—'}
            </button>
          </div>
          <div>
            <p className="text-paper-500 text-xs mb-1">Detected Architecture</p>
            <button className="text-paper-100 hover:text-spotlight" onClick={() => onNavigate('architecture')}>
              {report.architecture.detected}
            </button>
          </div>
          <div>
            <p className="text-paper-500 text-xs mb-1">Tech Stack</p>
            <button className="text-paper-100 hover:text-spotlight" onClick={() => onNavigate('techstack')}>
              View stack →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
