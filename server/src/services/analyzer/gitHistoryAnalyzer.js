const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');

const MAX_COMMITS = 500; // bounds analysis time on repos with very long histories
const RECORD_SEP = '\x1f';
const COMMIT_SEP = '\x01';

/**
 * Git history analysis (churn, most-changed files, contributor activity) is
 * opportunistic and source-agnostic: it runs whenever the extracted/cloned
 * project happens to contain a `.git` directory, regardless of whether the
 * project arrived as a ZIP or a GitHub clone. When there's no `.git`
 * present, this returns `{ available: false, reason }` rather than an
 * error — the rest of the report is unaffected either way.
 */
async function analyzeGitHistory(rootDir) {
  const gitDir = path.join(rootDir, '.git');
  if (!fs.existsSync(gitDir)) {
    return {
      available: false,
      reason: 'No .git history found in this source (a plain ZIP export or an already-flattened clone has none).',
    };
  }

  const git = simpleGit({ baseDir: rootDir, timeout: { block: 30000 } });

  let raw;
  try {
    raw = await git.raw([
      'log',
      `--max-count=${MAX_COMMITS}`,
      '--numstat',
      '--no-merges',
      `--pretty=format:${COMMIT_SEP}%H${RECORD_SEP}%an${RECORD_SEP}%ae${RECORD_SEP}%at`,
    ]);
  } catch (err) {
    return { available: false, reason: `Could not read git history: ${err.message}` };
  }

  const blocks = raw.split(COMMIT_SEP).filter((b) => b.trim().length > 0);
  const fileChurn = new Map(); // path -> { path, commits, additions, deletions }
  const authorCommits = new Map(); // email|name -> { name, email, commits }
  let totalCommits = 0;
  let oldestTs = null;
  let newestTs = null;

  for (const block of blocks) {
    const lines = block.split('\n');
    const header = lines[0];
    const [hash, name, email, ts] = header.split(RECORD_SEP);
    if (!hash) continue;

    totalCommits += 1;
    const timestamp = Number(ts) * 1000;
    if (Number.isFinite(timestamp)) {
      if (oldestTs === null || timestamp < oldestTs) oldestTs = timestamp;
      if (newestTs === null || timestamp > newestTs) newestTs = timestamp;
    }

    const authorKey = email || name || 'unknown';
    if (!authorCommits.has(authorKey)) authorCommits.set(authorKey, { name: name || 'Unknown', email: email || '', commits: 0 });
    authorCommits.get(authorKey).commits += 1;

    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const [addRaw, delRaw, ...pathParts] = line.split('\t');
      const filePath = pathParts.join('\t'); // filenames can rarely contain tabs; rejoin defensively
      if (!filePath) continue;

      const additions = addRaw === '-' ? 0 : Number(addRaw) || 0;
      const deletions = delRaw === '-' ? 0 : Number(delRaw) || 0;

      if (!fileChurn.has(filePath)) {
        fileChurn.set(filePath, { path: filePath, commits: 0, additions: 0, deletions: 0 });
      }
      const entry = fileChurn.get(filePath);
      entry.commits += 1;
      entry.additions += additions;
      entry.deletions += deletions;
    }
  }

  const mostChanged = [...fileChurn.values()]
    .sort((a, b) => b.commits - a.commits || b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, 20);

  const contributors = [...authorCommits.values()].sort((a, b) => b.commits - a.commits).slice(0, 20);

  return {
    available: true,
    totalCommitsAnalyzed: totalCommits,
    truncated: totalCommits >= MAX_COMMITS, // history is longer than what we scanned
    dateRange:
      oldestTs !== null && newestTs !== null
        ? { from: new Date(oldestTs).toISOString(), to: new Date(newestTs).toISOString() }
        : null,
    mostChanged,
    contributors,
  };
}

module.exports = { analyzeGitHistory };
