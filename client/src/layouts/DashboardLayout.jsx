import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid, FileCode2, GitBranch, Building2, AlertTriangle, Gauge, Package, Menu, X, Search, History, Plus,
} from 'lucide-react';

const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'files', label: 'Files', icon: FileCode2 },
  { key: 'dependencies', label: 'Dependencies', icon: GitBranch },
  { key: 'architecture', label: 'Architecture', icon: Building2 },
  { key: 'problems', label: 'Problems', icon: AlertTriangle },
  { key: 'metrics', label: 'Code Metrics', icon: Gauge },
  { key: 'githistory', label: 'Git History', icon: History },
  { key: 'techstack', label: 'Tech Stack', icon: Package },
];

export default function DashboardLayout({ projectName, active, onNavigate, children, problemCount }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950 text-paper-100">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between border-b border-ink-700 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display font-semibold min-w-0 hover:text-spotlight transition">
          <span>🕵️</span>
          <span className="mono text-paper-300 truncate">{projectName}</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="text-paper-300 shrink-0">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="md:flex">
        {/* Sidebar */}
        <aside
          className={`${open ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0 border-r border-ink-700 bg-ink-900 md:min-h-screen`}
        >
          <Link to="/" className="hidden md:flex items-center gap-2 px-5 py-6 font-display font-semibold hover:text-spotlight transition">
            <span className="text-xl">🕵️</span>
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-paper-500 font-body">CODEBASE DETECTIVE</span>
              <span className="mono text-paper-100 truncate max-w-[160px]">{projectName}</span>
            </div>
          </Link>
          <nav className="px-3 py-2 md:py-0 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onNavigate(item.key);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive ? 'bg-spotlight/10 text-spotlight border border-spotlight/30' : 'text-paper-300 hover:bg-ink-800 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} />
                    {item.label}
                  </span>
                  {item.key === 'problems' && problemCount > 0 && (
                    <span className="text-xs mono text-paper-500">{problemCount}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="px-3 py-3 mt-2 border-t border-ink-800">
            <Link
              to="/analyze"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-paper-300 hover:bg-ink-800 hover:text-spotlight transition border border-transparent"
            >
              <Plus size={16} />
              New Analysis
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function SectionHeader({ title, description, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-paper-100">{title}</h2>
        {description && <p className="text-sm text-paper-500 mt-1">{description}</p>}
      </div>
      {right}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-500" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-ink-800 border border-ink-600 rounded-lg pl-9 pr-3 py-2 text-sm text-paper-100 placeholder:text-paper-500 focus:border-spotlight/60 outline-none w-full sm:w-64"
      />
    </div>
  );
}
