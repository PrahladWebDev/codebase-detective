const { EventEmitter } = require('events');

/**
 * Tracks in-flight analysis jobs so progress can be pushed over SSE.
 * Each job keeps a small replay log so a client that subscribes a moment
 * after the job started (or reconnects) still sees every stage in order,
 * not just whatever fires after it connects.
 */
const jobs = new Map();
const JOB_TTL_MS = 10 * 60 * 1000; // jobs are cheap; sweep anything stale

function createJob(jobId) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  const job = {
    id: jobId,
    status: 'running', // running | done | error
    log: [], // ordered list of { type: 'stage'|'done'|'error', ...payload, ts }
    analysisId: null,
    error: null,
    createdAt: Date.now(),
    emitter,
  };
  jobs.set(jobId, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function emitStage(jobId, stage) {
  const job = jobs.get(jobId);
  if (!job || job.status !== 'running') return;
  const event = { type: 'stage', stage, ts: Date.now() };
  job.log.push(event);
  job.emitter.emit('event', event);
}

function completeJob(jobId, analysisId) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'done';
  job.analysisId = analysisId;
  const event = { type: 'done', analysisId, ts: Date.now() };
  job.log.push(event);
  job.emitter.emit('event', event);
  scheduleCleanup(jobId);
}

function failJob(jobId, message) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'error';
  job.error = message;
  const event = { type: 'error', error: message, ts: Date.now() };
  job.log.push(event);
  job.emitter.emit('event', event);
  scheduleCleanup(jobId);
}

function scheduleCleanup(jobId) {
  setTimeout(() => jobs.delete(jobId), JOB_TTL_MS).unref();
}

module.exports = { createJob, getJob, emitStage, completeJob, failJob };
