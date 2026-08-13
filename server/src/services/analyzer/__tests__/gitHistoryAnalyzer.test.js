const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { analyzeGitHistory } = require('../gitHistoryAnalyzer');

function git(dir, args) {
  execFileSync('git', args, { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' } });
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-history-test-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  return dir;
}

function commitFile(dir, relPath, content, author) {
  const abs = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  execFileSync('git', ['add', relPath], { cwd: dir });
  const env = author
    ? { ...process.env, GIT_AUTHOR_NAME: author.name, GIT_AUTHOR_EMAIL: author.email, GIT_COMMITTER_NAME: author.name, GIT_COMMITTER_EMAIL: author.email }
    : process.env;
  execFileSync('git', ['commit', '-q', '-m', `update ${relPath}`], { cwd: dir, env });
}

describe('analyzeGitHistory', () => {
  let dir;
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports unavailable when there is no .git directory', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'));
    fs.writeFileSync(path.join(dir, 'a.js'), 'const a = 1;');
    const result = await analyzeGitHistory(dir);
    expect(result.available).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('counts commits and per-file churn across multiple commits', async () => {
    dir = makeRepo();
    commitFile(dir, 'a.js', 'const a = 1;\n');
    commitFile(dir, 'a.js', 'const a = 1;\nconst b = 2;\n');
    commitFile(dir, 'b.js', 'const c = 3;\n');

    const result = await analyzeGitHistory(dir);
    expect(result.available).toBe(true);
    expect(result.totalCommitsAnalyzed).toBe(3);

    const aFile = result.mostChanged.find((f) => f.path === 'a.js');
    const bFile = result.mostChanged.find((f) => f.path === 'b.js');
    expect(aFile.commits).toBe(2);
    expect(bFile.commits).toBe(1);
  });

  it('ranks mostChanged by commit count, descending', async () => {
    dir = makeRepo();
    commitFile(dir, 'hot.js', '1');
    commitFile(dir, 'hot.js', '2');
    commitFile(dir, 'hot.js', '3');
    commitFile(dir, 'cold.js', '1');

    const result = await analyzeGitHistory(dir);
    expect(result.mostChanged[0].path).toBe('hot.js');
    expect(result.mostChanged[0].commits).toBe(3);
  });

  it('aggregates contributor commit counts by author', async () => {
    dir = makeRepo();
    commitFile(dir, 'a.js', '1', { name: 'Alice', email: 'alice@example.com' });
    commitFile(dir, 'a.js', '2', { name: 'Alice', email: 'alice@example.com' });
    commitFile(dir, 'b.js', '1', { name: 'Bob', email: 'bob@example.com' });

    const result = await analyzeGitHistory(dir);
    const alice = result.contributors.find((c) => c.email === 'alice@example.com');
    const bob = result.contributors.find((c) => c.email === 'bob@example.com');
    expect(alice.commits).toBe(2);
    expect(bob.commits).toBe(1);
  });

  it('reports a date range spanning the oldest and newest commit', async () => {
    dir = makeRepo();
    commitFile(dir, 'a.js', '1');
    commitFile(dir, 'a.js', '2');
    const result = await analyzeGitHistory(dir);
    expect(result.dateRange).not.toBeNull();
    expect(new Date(result.dateRange.from).getTime()).toBeLessThanOrEqual(new Date(result.dateRange.to).getTime());
  });

  it('reports unavailable (not a crash) for a freshly-initialized repo with zero commits', async () => {
    // `git log` itself errors on a repo with no commits yet ("does not have
    // any commits yet") — analyzeGitHistory should surface that as
    // unavailable rather than throwing.
    dir = makeRepo();
    const result = await analyzeGitHistory(dir);
    expect(result.available).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});
