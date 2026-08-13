const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GITHUB } = require('../config/constants');

// Deliberately strict: only https://github.com/<owner>/<repo>[.git][/], no
// query strings, no credentials embedded in the URL, no branch/path suffix.
// Owner/repo characters match GitHub's own allowed set.
const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/;

class GithubValidationError extends Error {}

/**
 * Validates a user-supplied string and returns a canonical clone URL that
 * *we* construct from the matched owner/repo — the user's raw string is
 * never handed to git. This is the important part: it closes off argument
 * injection (a string like "--upload-pack=..." or "-oProxyCommand=...")
 * since only the owner/repo captured by the regex ever reaches git, and
 * even then only inside a URL we build ourselves.
 */
function validateGithubUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 300) {
    throw new GithubValidationError('Please provide a GitHub repository URL.');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new GithubValidationError('That does not look like a valid URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new GithubValidationError('Only https:// GitHub URLs are supported.');
  }
  if (!GITHUB.ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new GithubValidationError('Only public github.com repository URLs are supported.');
  }

  const match = GITHUB_URL_PATTERN.exec(`https://${parsed.hostname}${parsed.pathname}`);
  if (!match) {
    throw new GithubValidationError('Expected a URL like https://github.com/owner/repo.');
  }

  const [, owner, repo] = match;
  return {
    owner,
    repo,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    displayName: `${owner}/${repo}`,
  };
}

/**
 * Shallow-clones a validated public repo into a fresh temp dir.
 * - depth 1, single branch: fast, and enough for static analysis.
 * - GIT_TERMINAL_PROMPT=0 + a bogus GIT_ASKPASS: never hang waiting for
 *   credentials on a private/nonexistent repo — fail fast instead.
 * - a hard timeout kills a clone that hangs or is unexpectedly huge.
 * - nothing from the cloned repo is ever executed (no install, no hooks;
 *   git hooks are disabled for the clone itself via -c core.hooksPath=/dev/null
 *   equivalent — see the -c flags below).
 */
function cloneRepo({ cloneUrl, displayName }) {
  return new Promise((resolve, reject) => {
    const targetRoot = path.join(os.tmpdir(), 'codebase-detective-gh', uuidv4());
    fs.mkdirSync(targetRoot, { recursive: true });

    const args = [
      '-c', 'core.hooksPath=/dev/null',
      '-c', 'protocol.ext.allow=never',
      '-c', 'protocol.file.allow=never',
      'clone',
      '--depth', String(GITHUB.CLONE_DEPTH),
      '--single-branch',
      '--no-tags',
      cloneUrl,
      targetRoot,
    ];

    execFile('git', args, {
      timeout: GITHUB.CLONE_TIMEOUT_MS,
      killSignal: 'SIGKILL',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: 'echo' },
    }, (err) => {
      if (err) {
        fs.rm(targetRoot, { recursive: true, force: true }, () => {});
        if (err.killed) {
          return reject(new GithubValidationError(`Cloning ${displayName} took too long or the repo is too large.`));
        }
        return reject(new GithubValidationError(`Could not clone ${displayName}. It may be private, deleted, or the URL is wrong.`));
      }

      let totalBytes = 0;
      try {
        totalBytes = dirSize(targetRoot);
      } catch {
        // fall through with totalBytes 0; not worth failing the request over a stat error
      }
      if (totalBytes > GITHUB.MAX_REPO_BYTES) {
        fs.rm(targetRoot, { recursive: true, force: true }, () => {});
        return reject(new GithubValidationError(`${displayName} is larger than the ${Math.round(GITHUB.MAX_REPO_BYTES / (1024 * 1024))} MB analysis limit.`));
      }

      resolve(targetRoot);
    });
  });
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue; // never follow symlinks when sizing
    if (entry.isDirectory()) total += dirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

module.exports = { validateGithubUrl, cloneRepo, GithubValidationError };
