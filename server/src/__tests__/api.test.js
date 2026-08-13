const http = require('http');
const request = require('supertest');
const AdmZip = require('adm-zip');
const app = require('../app');

function zipBufferFrom(files) {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content, 'utf8'));
  }
  return zip.toBuffer();
}

/** Reads SSE events from a raw http response until it sees 'done' or 'error', or times out. */
function collectSSE(server, jobId) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.get(`http://127.0.0.1:${port}/api/analysis/progress/${jobId}`, (res) => {
      let buffer = '';
      const events = [];
      const timeout = setTimeout(() => {
        req.destroy();
        reject(new Error('SSE stream timed out'));
      }, 8000);

      res.on('data', (chunk) => {
        buffer += chunk.toString();
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = raw.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const event = JSON.parse(line.slice(6));
          events.push(event);
          if (event.type === 'done' || event.type === 'error') {
            clearTimeout(timeout);
            req.destroy();
            resolve(events);
          }
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('POST /api/analysis/upload', () => {
  it('rejects a request with no file', async () => {
    const res = await request(app).post('/api/analysis/upload');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a non-zip file', async () => {
    const res = await request(app)
      .post('/api/analysis/upload')
      .attach('project', Buffer.from('not a zip'), 'project.txt');
    expect(res.status).toBe(400);
  });

  it('accepts a valid zip and returns a jobId immediately', async () => {
    const buf = zipBufferFrom({ 'index.js': 'console.log(1);' });
    const res = await request(app).post('/api/analysis/upload').attach('project', buf, 'project.zip');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBeDefined();
  });
});

describe('full upload -> progress -> report flow', () => {
  let server;
  beforeAll((done) => {
    server = app.listen(0, done);
  });
  afterAll((done) => {
    server.close(done);
  });

  it('streams real stage events and yields a fetchable report', async () => {
    const buf = zipBufferFrom({
      'index.js': `import { helper } from './helper';\nhelper();`,
      'helper.js': `export function helper() { return 1; }`,
    });

    const uploadRes = await request(server).post('/api/analysis/upload').attach('project', buf, 'project.zip');
    expect(uploadRes.body.success).toBe(true);
    const { jobId } = uploadRes.body;

    const events = await collectSSE(server, jobId);
    const stageEvents = events.filter((e) => e.type === 'stage');
    expect(stageEvents.length).toBeGreaterThan(0);

    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent).toBeDefined();

    const reportRes = await request(server).get(`/api/analysis/${doneEvent.analysisId}`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.report.summary.totalFiles).toBe(2);
  });

  it('returns 404 for progress on an unknown job', async () => {
    const res = await request(server).get('/api/analysis/progress/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/analysis/:id', () => {
  it('returns 404 for an unknown analysis id', async () => {
    const res = await request(app).get('/api/analysis/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
