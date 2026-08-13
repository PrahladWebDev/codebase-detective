const fs = require('fs');
const os = require('os');
const path = require('path');
const { analyzeProject } = require('../engine');

function writeProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

describe('analyzeProject (end-to-end)', () => {
  let dir;
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('produces a complete, internally-consistent report for a small real project', async () => {
    dir = writeProject({
      'package.json': JSON.stringify({ name: 'sample', dependencies: { react: '^18.0.0' } }),
      'src/index.js': `
        import { helper } from './utils/helper';
        import { Button } from './components/Button';
        helper(1, 2);
      `,
      'src/utils/helper.js': `
        export function helper(a, b) {
          if (a > 0) { return a + b; }
          return b;
        }
        export function unusedHelper() { return 42; }
      `,
      'src/components/Button.jsx': `
        import { helper } from '../utils/helper';
        export function Button() { return null; }
      `,
    });

    const report = await analyzeProject(dir, { projectName: 'sample' });

    expect(report.projectName).toBe('sample');
    expect(report.summary.totalFiles).toBe(4);
    expect(report.summary.parseErrors).toBe(0);
    expect(report.healthScore.score).toBeGreaterThanOrEqual(0);
    expect(report.healthScore.score).toBeLessThanOrEqual(100);

    // dependency graph should reflect the real import chain
    const edgeSet = new Set(report.dependencies.edges.map((e) => `${e.from}->${e.to}`));
    expect(edgeSet.has('src/index.js->src/utils/helper.js')).toBe(true);
    expect(edgeSet.has('src/index.js->src/components/Button.jsx')).toBe(true);

    // no .git directory in this fixture, so history is opportunistically unavailable
    expect(report.gitHistory.available).toBe(false);

    // problems and healthScore must agree with the same detector findings
    const totalProblemCount = Object.values(report.problemCounts).reduce((a, b) => a + b, 0);
    expect(totalProblemCount).toBe(report.problems.length);
  });

  it('completes without throwing on a project containing an unparseable file', async () => {
    dir = writeProject({
      'good.js': 'export const x = 1;',
      'broken.js': 'function ( totally invalid +++',
    });

    const report = await analyzeProject(dir, { projectName: 'broken-project' });
    expect(report.summary.parseErrors).toBe(1);
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it('reports every declared analysis stage through onStage, in order', async () => {
    dir = writeProject({ 'a.js': 'export const a = 1;' });
    const seen = [];
    await analyzeProject(dir, { projectName: 'stages', onStage: (s) => seen.push(s) });
    expect(seen).toEqual([
      'Scanning files...',
      'Parsing source files...',
      'Calculating metrics...',
      'Building dependency graph...',
      'Running detectors...',
      'Generating report...',
      'Analyzing git history...',
    ]);
  });

  it('handles an empty project directory without crashing', async () => {
    dir = writeProject({});
    const report = await analyzeProject(dir, { projectName: 'empty' });
    expect(report.summary.totalFiles).toBe(0);
    expect(report.healthScore.score).toBe(100);
  });
});
