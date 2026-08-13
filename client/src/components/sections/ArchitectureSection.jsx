import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { SectionHeader } from '../../layouts/DashboardLayout.jsx';

const LAYER_LABELS = {
  controllers: 'Controllers',
  services: 'Services',
  models: 'Models',
  routes: 'Routes',
  middleware: 'Middleware',
  components: 'Components',
  views: 'Views',
};

export default function ArchitectureSection({ report }) {
  const { architecture } = report;

  return (
    <div>
      <SectionHeader title="Architecture" description="Inferred from directory structure, not file contents" />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider text-paper-500 mb-2">Detected</p>
          <p className="font-display text-2xl font-semibold text-spotlight mb-6">{architecture.detected}</p>
          <div className="space-y-2">
            {Object.entries(architecture.layers).map(([key, present]) => (
              <div key={key} className="flex items-center justify-between border-b border-ink-800 pb-2 text-sm">
                <span className="text-paper-300">{LAYER_LABELS[key] || key}</span>
                {present ? <CheckCircle2 size={16} className="text-sev-low" /> : <XCircle size={16} className="text-paper-500" />}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider text-paper-500 mb-4">Observations</p>
          {architecture.observations.length === 0 && (
            <p className="text-sm text-paper-500">No structural concerns detected at this level.</p>
          )}
          <div className="space-y-4">
            {architecture.observations.map((obs, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-sev-medium/30 bg-sev-medium/5 p-4">
                <Info size={16} className="text-sev-medium shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-paper-100">Architecture Observation</p>
                  <p className="text-sm text-paper-300 mt-1">{obs.title}</p>
                  <p className="text-xs text-paper-500 mt-1">{obs.detail}</p>
                  <p className="text-xs mono text-paper-500 mt-2">{obs.files.length} file(s) affected</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
