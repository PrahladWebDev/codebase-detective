import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UploadCloud, FileArchive, AlertCircle, Github, ArrowLeft } from 'lucide-react';
import { uploadProject, subscribeToProgress, analyzeGithubRepo } from '../services/api.js';

const ZIP_STAGES = [
  'Scanning files...',
  'Parsing source files...',
  'Calculating metrics...',
  'Building dependency graph...',
  'Running detectors...',
  'Generating report...',
  'Analyzing git history...',
];
const GITHUB_STAGES = ['Cloning repository...', ...ZIP_STAGES];

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/?$/;

export default function Upload() {
  const [source, setSource] = useState('zip'); // 'zip' | 'github'
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [error, setError] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [stageIndex, setStageIndex] = useState(-1);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const stages = source === 'github' ? GITHUB_STAGES : ZIP_STAGES;

  const validateAndSet = (f) => {
    setError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.zip')) {
      setError('Please choose a .zip file.');
      return;
    }
    if (f.size > 2 * 1024 * 1024 * 1024) {
      setError('That file is larger than the 2 GB limit.');
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    validateAndSet(f);
  }, []);

  /**
   * Shared by both sources once we have a jobId: subscribes to real SSE
   * stage progress (pushed live as each stage actually starts server-side)
   * and resolves with the analysisId once the job completes.
   */
  const trackJob = (jobId, activeStages) => {
    let unsubscribe = null;
    return new Promise((resolve, reject) => {
      unsubscribe = subscribeToProgress(jobId, {
        onStage: (stage) => {
          const idx = activeStages.indexOf(stage);
          if (idx >= 0) setStageIndex(idx);
        },
        onDone: (analysisId) => {
          setStageIndex(activeStages.length - 1);
          resolve(analysisId);
        },
        onError: (message) => reject(new Error(message)),
      });
    }).finally(() => unsubscribe?.());
  };

  const startZipAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setStageIndex(-1);

    try {
      // Upload returns as soon as the ZIP is extracted server-side — it does
      // not wait for analysis to finish. The upload progress bar reflects
      // real bytes transferred during this step only.
      const result = await uploadProject(file, (evt) => {
        if (evt.total) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
      });
      if (!result.success) throw new Error(result.error || 'Upload failed.');

      const analysisId = await trackJob(result.jobId, ZIP_STAGES);
      setTimeout(() => navigate(`/report/${analysisId}`), 300);
    } catch (err) {
      setAnalyzing(false);
      setStageIndex(-1);
      setError(err.response?.data?.error || err.message || 'Something went wrong analyzing this project.');
    }
  };

  const startGithubAnalysis = async () => {
    const url = githubUrl.trim();
    if (!url) return;
    if (!GITHUB_URL_PATTERN.test(url)) {
      setError('Expected a URL like https://github.com/owner/repo');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setStageIndex(-1);
    setUploadPct(100); // no upload step for this source; progress is stage-driven only

    try {
      const result = await analyzeGithubRepo(url);
      if (!result.success) throw new Error(result.error || 'Could not start analysis.');

      const analysisId = await trackJob(result.jobId, GITHUB_STAGES);
      setTimeout(() => navigate(`/report/${analysisId}`), 300);
    } catch (err) {
      setAnalyzing(false);
      setStageIndex(-1);
      setError(err.response?.data?.error || err.message || 'Something went wrong analyzing this repository.');
    }
  };

  const progressPct = analyzing
    ? Math.max(source === 'zip' ? uploadPct : 0, Math.round(((stageIndex + 1) / stages.length) * 100))
    : 0;

  const switchSource = (next) => {
    setSource(next);
    setError(null);
    setFile(null);
    setGithubUrl('');
  };

  return (
    <div className="min-h-screen bg-ink-950 bg-beam text-paper-100">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-semibold hover:text-spotlight transition">
          <span className="text-xl">🕵️</span>
          <span>Codebase Detective</span>
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-sm text-paper-300 hover:text-spotlight transition">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </header>

      <div className="flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-semibold">Analyze your project</h1>
          <p className="text-paper-500 text-sm mt-2">Upload a ZIP or point at a public GitHub repo. Nothing is executed — it's read-only, static analysis.</p>
        </div>

        {!analyzing && (
          <div className="mb-4 inline-flex w-full rounded-lg border border-ink-600 bg-ink-800 p-1">
            <button
              onClick={() => switchSource('zip')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm transition ${
                source === 'zip' ? 'bg-ink-700 text-paper-100' : 'text-paper-500 hover:text-paper-300'
              }`}
            >
              <FileArchive size={14} /> ZIP Upload
            </button>
            <button
              onClick={() => switchSource('github')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm transition ${
                source === 'github' ? 'bg-ink-700 text-paper-100' : 'text-paper-500 hover:text-paper-300'
              }`}
            >
              <Github size={14} /> GitHub URL
            </button>
          </div>
        )}

        {!analyzing && source === 'zip' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`card p-6 sm:p-10 flex flex-col items-center text-center transition ${
              dragActive ? 'border-spotlight bg-spotlight/5' : ''
            }`}
          >
            <UploadCloud size={32} className={dragActive ? 'text-spotlight' : 'text-paper-500'} />
            <p className="mt-4 font-display text-lg">Drop your project ZIP here</p>
            <p className="text-paper-500 text-sm mt-1">or</p>
            <button onClick={() => inputRef.current?.click()} className="btn-secondary mt-4">
              Browse Files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => validateAndSet(e.target.files?.[0])}
            />
            <p className="mt-6 text-xs text-paper-500">Maximum size: 2 GB &middot; Supported: ZIP</p>

            {file && (
              <div className="mt-6 w-full flex items-center gap-3 rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-left">
                <FileArchive size={18} className="text-spotlight shrink-0" />
                <div className="min-w-0">
                  <p className="mono text-sm truncate">{file.name}</p>
                  <p className="text-xs text-paper-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 w-full flex items-center gap-2 text-sm text-sev-high">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button onClick={startZipAnalysis} disabled={!file} className="btn-primary mt-6 w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed">
              Analyze Project
            </button>
          </div>
        )}

        {!analyzing && source === 'github' && (
          <div className="card p-6 sm:p-10 flex flex-col items-center text-center">
            <Github size={32} className="text-paper-500" />
            <p className="mt-4 font-display text-lg">Analyze a public GitHub repo</p>
            <p className="text-paper-500 text-sm mt-1">We shallow-clone it read-only — nothing is ever executed.</p>

            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startGithubAnalysis()}
              placeholder="https://github.com/owner/repo"
              className="mono mt-6 w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-paper-100 placeholder:text-paper-500 focus:outline-none focus:border-spotlight"
            />
            <p className="mt-2 text-xs text-paper-500 self-start">Public repositories only &middot; up to 2 GB</p>

            {error && (
              <div className="mt-4 w-full flex items-center gap-2 text-sm text-sev-high">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button onClick={startGithubAnalysis} disabled={!githubUrl.trim()} className="btn-primary mt-6 w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed">
              Analyze Repository
            </button>
          </div>
        )}

        {analyzing && (
          <div className="card p-6 sm:p-10">
            <p className="font-display text-lg mb-1">Analyzing {source === 'github' ? 'repository' : 'project'}...</p>
            <p className="mono text-sm text-spotlight mb-6">{stages[stageIndex] || 'Starting...'}</p>
            <div className="h-2 w-full rounded-full bg-ink-700 overflow-hidden">
              <div
                className="h-full bg-spotlight transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-right text-xs text-paper-500 mt-2">{progressPct}%</p>
            <ul className="mt-6 space-y-2">
              {stages.map((s, i) => (
                <li key={s} className={`text-sm flex items-center gap-2 ${i <= stageIndex ? 'text-paper-100' : 'text-paper-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${i <= stageIndex ? 'bg-spotlight' : 'bg-ink-600'}`} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
