import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GitBranch, AlertTriangle, Building2, ScanSearch, X } from 'lucide-react';
import HealthGauge from '../components/HealthGauge.jsx';
import demoVideo from '../utils/Codebase Detective.mp4';

const FEATURES = [
  {
    icon: GitBranch,
    title: 'Map the dependency graph',
    body: 'See every import resolved into a live graph — trace how a change in one module ripples through the rest.',
  },
  {
    icon: AlertTriangle,
    title: 'Catch architectural risk early',
    body: 'Circular dependencies, potential god objects, and possibly unused files — surfaced as leads, not verdicts.',
  },
  {
    icon: Building2,
    title: 'Understand the architecture you inherited',
    body: 'Detect layered, MVC, feature-based, or component patterns from the actual folder structure.',
  },
];

export default function Landing() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950 bg-beam text-paper-100">
      {showDemo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={() => setShowDemo(false)}
        >
          <div
            className="relative w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDemo(false)}
              className="absolute -top-10 right-0 text-paper-300 hover:text-spotlight transition"
              aria-label="Close demo video"
            >
              <X size={24} />
            </button>
            <video
              src={demoVideo}
              controls
              autoPlay
              className="w-full rounded-lg shadow-glow"
            />
          </div>
        </div>
      )}

      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-semibold">
          <span className="text-xl">🕵️</span>
          <span>Codebase Detective</span>
        </div>
        <Link to="/analyze" className="text-sm text-paper-300 hover:text-spotlight transition">
          Open the analyzer →
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-600 px-3 py-1 text-xs mono text-paper-500 mb-6">
            <ScanSearch size={13} className="text-spotlight" />
            case file #001 — first read of any repo
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-tight text-paper-100">
            Understand your codebase <span className="text-spotlight">before you touch it.</span>
          </h1>
          <p className="mt-5 text-paper-300 text-lg leading-relaxed max-w-lg">
            Analyze dependencies, detect architectural risks, find suspicious files, and visualize how your project is connected — all before your first commit.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/analyze" className="btn-primary">
              Analyze Your Codebase <ArrowRight size={16} />
            </Link>
            <button onClick={() => setShowDemo(true)} className="btn-secondary">
              View Demo
            </button>
          </div>
          <p className="mt-4 text-xs text-paper-500">
            Findings are heuristics, not verdicts — every flag is a lead worth reviewing, not an automatic judgment.
          </p>
        </div>

        <div className="card p-6 shadow-glow" id="preview">
          <div className="flex items-center justify-between mb-6">
            <span className="mono text-xs text-paper-500">my-project / health report</span>
            <span className="text-xs text-paper-500">just now</span>
          </div>
          <div className="flex items-center justify-center py-4">
            <HealthGauge score={78} />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6 text-center">
            <div>
              <div className="font-display text-lg font-semibold">342</div>
              <div className="text-xs text-paper-500">Files</div>
            </div>
            <div>
              <div className="font-display text-lg font-semibold">48,291</div>
              <div className="text-xs text-paper-500">Lines</div>
            </div>
            <div>
              <div className="font-display text-lg font-semibold">127</div>
              <div className="text-xs text-paper-500">Dependencies</div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <f.icon size={20} className="text-spotlight mb-4" />
            <h3 className="font-display font-semibold text-paper-100 mb-2">{f.title}</h3>
            <p className="text-sm text-paper-500 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-ink-700">
        <div className="max-w-6xl mx-auto px-6 py-8 text-xs text-paper-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>Codebase Detective — deterministic, local, source stays yours.</span>
          <span>Every result comes from actual source analysis. Nothing is invented.</span>
        </div>
      </footer>
    </div>
  );
}
