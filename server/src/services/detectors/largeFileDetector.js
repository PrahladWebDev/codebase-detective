const { THRESHOLDS } = require('../../config/constants');

function classify(lines) {
  const { HEALTHY, NORMAL, LARGE } = THRESHOLDS.LARGE_FILE;
  if (lines < HEALTHY) return 'Healthy';
  if (lines < NORMAL) return 'Normal';
  if (lines < LARGE) return 'Large';
  return 'Very Large';
}

/**
 * Flags files by size only — never claims large automatically means bad,
 * just surfaces them as candidates worth a human look.
 */
function detectLargeFiles(fileRows) {
  const flagged = fileRows
    .filter((f) => !f.isBinary)
    .map((f) => ({ path: f.path, lines: f.lines, classification: classify(f.lines) }))
    .filter((f) => f.classification === 'Large' || f.classification === 'Very Large')
    .sort((a, b) => b.lines - a.lines);

  return { flagged, classify };
}

module.exports = { detectLargeFiles, classify };
