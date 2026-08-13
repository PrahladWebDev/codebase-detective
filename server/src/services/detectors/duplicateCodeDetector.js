const WINDOW = 6; // lines per snippet window
const MIN_MEANINGFUL_LINES = 3; // windows with fewer real code lines are skipped

function normalizeLine(line) {
  return line.trim().replace(/\s+/g, ' ');
}

/**
 * v1 duplicate detector: slides a fixed-size window over each file's
 * normalized lines and groups windows with identical normalized text.
 * This is intentionally simple (string equality, not AST similarity) —
 * the spec calls for this to be swapped for AST-based similarity later.
 */
function detectDuplicateCode(fileRows, files) {
  const contentByPath = new Map(files.map((f) => [f.path, f.content]));
  const windowIndex = new Map(); // normalized snippet -> [{ path, startLine }]

  for (const f of fileRows) {
    if (f.isBinary) continue;
    const content = contentByPath.get(f.path);
    if (!content) continue;

    const lines = content.split('\n').map(normalizeLine);
    for (let i = 0; i + WINDOW <= lines.length; i++) {
      const slice = lines.slice(i, i + WINDOW);
      const meaningful = slice.filter((l) => l.length > 0);
      if (meaningful.length < MIN_MEANINGFUL_LINES) continue;

      const key = slice.join('\n');
      if (!windowIndex.has(key)) windowIndex.set(key, []);
      windowIndex.get(key).push({ path: f.path, startLine: i + 1 });
    }
  }

  const findings = [];
  for (const [, locations] of windowIndex) {
    if (locations.length < 2) continue;
    // Only report cross-file duplication, not repeated boilerplate within one file.
    const uniqueFiles = new Set(locations.map((l) => l.path));
    if (uniqueFiles.size < 2) continue;

    findings.push({
      locations: locations.slice(0, 4),
      occurrences: locations.length,
      similarity: 100, // exact-match windows in this v1 detector
    });
  }

  return findings
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 25);
}

module.exports = { detectDuplicateCode };
