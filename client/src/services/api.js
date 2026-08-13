import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export async function uploadProject(file, onUploadProgress) {
  const form = new FormData();
  form.append('project', file);
  const { data } = await client.post('/analysis/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data; // { success, jobId }
}

export async function analyzeGithubRepo(url) {
  const { data } = await client.post('/analysis/github', { url });
  return data; // { success, jobId, repo }
}

/**
 * Subscribes to real analysis progress over Server-Sent Events. Returns an
 * unsubscribe function. Stage events arrive as they actually happen on the
 * server (the engine yields the event loop between stages), so this is not
 * a client-side timer standing in for progress.
 */
export function subscribeToProgress(jobId, { onStage, onDone, onError }) {
  const source = new EventSource(`/api/analysis/progress/${jobId}`);

  source.onmessage = (msg) => {
    let event;
    try {
      event = JSON.parse(msg.data);
    } catch {
      return;
    }
    if (event.type === 'stage') onStage?.(event.stage);
    else if (event.type === 'done') {
      onDone?.(event.analysisId);
      source.close();
    } else if (event.type === 'error') {
      onError?.(event.error);
      source.close();
    }
  };

  source.onerror = () => {
    // EventSource retries automatically on transient network errors; if the
    // job/stream is genuinely gone the server has already closed the
    // connection with a 404 before this fires, in which case give up.
    if (source.readyState === EventSource.CLOSED) {
      onError?.('Lost connection while analyzing this project.');
    }
  };

  return () => source.close();
}

export async function getReport(id) {
  const { data } = await client.get(`/analysis/${id}`);
  return data.report;
}

export default client;
