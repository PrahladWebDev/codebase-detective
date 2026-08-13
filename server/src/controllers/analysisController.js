const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { safeExtractZip, cleanupDir } = require('../middleware/upload');
const { analyzeProject } = require('../services/engine');
const { validateGithubUrl, cloneRepo, GithubValidationError } = require('../services/githubCloner');
const reportStore = require('../utils/reportStore');
const jobStore = require('../utils/jobStore');

/**
 * Extraction is fast and happens synchronously so we can fail fast on a bad
 * ZIP. The actual analysis (which can take real wall-clock time on a large
 * project) runs afterwards without the client waiting on this response —
 * the client instead subscribes to /api/analysis/:jobId/progress over SSE
 * and gets a real analysisId once analyzeProject resolves.
 */
async function uploadProject(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No project ZIP was uploaded.' });
  }

  let extractedDir = null;
  try {
    extractedDir = safeExtractZip(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || 'Could not extract ZIP file.' });
  }

  const projectName = path.basename(req.file.originalname, '.zip');
  const jobId = uuidv4();
  jobStore.createJob(jobId);
  res.json({ success: true, jobId });

  runAnalysisJob(jobId, extractedDir, projectName);
}

/**
 * Same shape as uploadProject, but the source directory comes from a
 * shallow git clone of a validated public GitHub URL instead of an
 * uploaded ZIP. Everything downstream of "we have a directory of source
 * on disk" is identical — it funnels into the same analyzeProject engine.
 */
async function analyzeGithubRepo(req, res) {
  let target;
  try {
    target = validateGithubUrl(req.body && req.body.url);
  } catch (err) {
    if (err instanceof GithubValidationError) {
      return res.status(400).json({ success: false, error: err.message });
    }
    throw err;
  }

  const jobId = uuidv4();
  jobStore.createJob(jobId);
  res.json({ success: true, jobId, repo: target.displayName });

  let extractedDir = null;
  try {
    jobStore.emitStage(jobId, 'Cloning repository...');
    extractedDir = await cloneRepo(target);
  } catch (err) {
    const message = err instanceof GithubValidationError ? err.message : `Could not clone the repository: ${err.message}`;
    jobStore.failJob(jobId, message);
    return;
  }

  runAnalysisJob(jobId, extractedDir, target.repo);
}

async function runAnalysisJob(jobId, extractedDir, projectName) {
  try {
    const report = await analyzeProject(extractedDir, {
      projectName,
      onStage: (stage) => jobStore.emitStage(jobId, stage),
    });
    const analysisId = uuidv4();
    reportStore.save(analysisId, report);
    jobStore.completeJob(jobId, analysisId);
  } catch (err) {
    jobStore.failJob(jobId, `Analysis failed: ${err.message}`);
  } finally {
    // Uploaded/extracted/cloned source is deleted immediately after analysis completes.
    cleanupDir(extractedDir);
  }
}

/**
 * SSE stream of stage progress for a running (or just-finished) job.
 * Replays any stages that already happened before this client connected,
 * then streams live events until the job reaches done/error.
 */
function streamProgress(req, res) {
  const job = jobStore.getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found or expired.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Replay history so a client connecting mid-job doesn't miss stages.
  for (const event of job.log) send(event);
  if (job.status !== 'running') {
    res.end();
    return;
  }

  const onEvent = (event) => {
    send(event);
    if (event.type === 'done' || event.type === 'error') {
      cleanup();
      res.end();
    }
  };

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);

  function cleanup() {
    clearInterval(heartbeat);
    job.emitter.off('event', onEvent);
  }

  job.emitter.on('event', onEvent);
  req.on('close', cleanup);
}

function getReport(req, res) {
  const report = reportStore.get(req.params.id);
  if (!report) return res.status(404).json({ success: false, error: 'Analysis not found or expired.' });
  res.json({ success: true, report });
}

function getSection(section) {
  return (req, res) => {
    const report = reportStore.get(req.params.id);
    if (!report) return res.status(404).json({ success: false, error: 'Analysis not found or expired.' });
    res.json({ success: true, [section]: report[section] });
  };
}

module.exports = {
  uploadProject,
  analyzeGithubRepo,
  streamProgress,
  getReport,
  getFiles: getSection('files'),
  getDependencies: getSection('dependencies'),
  getProblems: getSection('problems'),
  getMetrics: getSection('metrics'),
};
