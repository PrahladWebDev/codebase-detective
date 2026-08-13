import { Layers, Server, Database, Wrench } from 'lucide-react';
import { SectionHeader } from '../../layouts/DashboardLayout.jsx';

const CATEGORY_META = {
  Frontend: { icon: Layers },
  Backend: { icon: Server },
  Database: { icon: Database },
  Other: { icon: Wrench },
};

export default function TechStackSection({ report }) {
  const { techStack } = report;
  const hasAny = Object.values(techStack).some((list) => list.length > 0);

  return (
    <div>
      <SectionHeader title="Tech Stack" description="Detected from package.json and project manifests" />

      {!hasAny && (
        <div className="card p-10 text-center text-paper-500 text-sm">
          No recognizable manifest files (package.json, requirements.txt, go.mod, etc.) were found.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {Object.entries(techStack).map(([category, items]) => {
          if (items.length === 0) return null;
          const Icon = CATEGORY_META[category]?.icon || Wrench;
          return (
            <div key={category} className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Icon size={16} className="text-spotlight" />
                <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-paper-300">{category}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <span key={item} className="mono text-xs rounded-full border border-ink-600 bg-ink-800 px-3 py-1.5 text-paper-100">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
