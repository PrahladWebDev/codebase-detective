import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { getReport } from '../services/api.js';
import Overview from '../components/sections/Overview.jsx';
import FilesSection from '../components/sections/FilesSection.jsx';
import DependenciesSection from '../components/sections/DependenciesSection.jsx';
import ArchitectureSection from '../components/sections/ArchitectureSection.jsx';
import ProblemsSection from '../components/sections/ProblemsSection.jsx';
import MetricsSection from '../components/sections/MetricsSection.jsx';
import TechStackSection from '../components/sections/TechStackSection.jsx';
import GitHistorySection from '../components/sections/GitHistorySection.jsx';

export default function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [active, setActive] = useState('overview');
  const [highlightPath, setHighlightPath] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getReport(id)
      .then((r) => !cancelled && setReport(r))
      .catch((err) => !cancelled && setError(err.response?.data?.error || 'This analysis could not be found. It may have expired.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 text-paper-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-display text-xl">Analysis unavailable</p>
        <p className="text-paper-500 text-sm max-w-sm">{error}</p>
        <Link to="/analyze" className="btn-primary">Analyze another project</Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-ink-950 text-paper-100 flex items-center justify-center">
        <p className="mono text-sm text-paper-500">Loading report…</p>
      </div>
    );
  }

  const jumpTo = (section, path) => {
    setHighlightPath(path || null);
    setActive(section);
  };

  const renderSection = () => {
    switch (active) {
      case 'files':
        return <FilesSection report={report} highlightPath={highlightPath} />;
      case 'dependencies':
        return <DependenciesSection report={report} highlightPath={highlightPath} />;
      case 'architecture':
        return <ArchitectureSection report={report} />;
      case 'problems':
        return <ProblemsSection report={report} onViewInGraph={(path) => jumpTo('dependencies', path)} />;
      case 'metrics':
        return <MetricsSection report={report} />;
      case 'techstack':
        return <TechStackSection report={report} />;
      case 'githistory':
        return <GitHistorySection report={report} />;
      case 'overview':
      default:
        return <Overview report={report} onNavigate={jumpTo} />;
    }
  };

  return (
    <DashboardLayout
      projectName={report.projectName}
      active={active}
      onNavigate={(key) => jumpTo(key, null)}
      problemCount={report.problems.length}
    >
      {renderSection()}
    </DashboardLayout>
  );
}
