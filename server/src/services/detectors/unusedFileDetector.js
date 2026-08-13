const { ENTRY_FILE_PATTERNS, PARSEABLE_EXTENSIONS } = require('../../config/constants');

function isEntryFile(filePath) {
  return ENTRY_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Files with zero incoming internal references *might* be dead code, but
 * could just as easily be entry points, dynamic imports, or files invoked
 * externally (npm scripts, CLIs) — so this is always framed as "possibly
 * unused", never a definitive verdict.
 */
function detectUnusedFiles(fileRows, dependencyGraph) {
  return fileRows
    .filter((f) => !f.isBinary && PARSEABLE_EXTENSIONS.includes(f.ext))
    .filter((f) => !isEntryFile(f.path))
    .filter((f) => (dependencyGraph.incoming.get(f.path) || 0) === 0)
    .map((f) => ({ path: f.path, lines: f.lines }))
    .sort((a, b) => b.lines - a.lines);
}

module.exports = { detectUnusedFiles, isEntryFile };
