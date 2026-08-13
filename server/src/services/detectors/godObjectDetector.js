const { THRESHOLDS } = require('../../config/constants');

/**
 * A file is flagged as a *potential* god object only when several
 * independent signals fire together (size, function count, import count,
 * dependency fan-out). Any single high number is not enough — this avoids
 * shaming a long-but-simple config file, for example.
 */
function detectGodObjects(fileRows, dependencyGraph) {
  const { MIN_LINES, MIN_FUNCTIONS, MIN_IMPORTS, MIN_SCORE } = THRESHOLDS.GOD_OBJECT;
  const results = [];

  for (const f of fileRows) {
    if (f.isBinary || f.complexity === 0) continue;
    const outgoing = dependencyGraph.outgoing.get(f.path) || 0;

    let score = 0;
    const reasons = [];
    if (f.lines >= MIN_LINES) {
      score += 1;
      reasons.push(`${f.lines.toLocaleString()} lines`);
    }
    if (f.functions >= MIN_FUNCTIONS) {
      score += 1;
      reasons.push(`${f.functions} functions`);
    }
    if (f.imports >= MIN_IMPORTS || outgoing >= MIN_IMPORTS) {
      score += 1;
      reasons.push(`${Math.max(f.imports, outgoing)} imports`);
    }
    if (f.classes >= 1 && f.methods >= 15) {
      score += 1;
      reasons.push(`${f.methods} methods across ${f.classes} class(es)`);
    }

    if (score >= MIN_SCORE) {
      results.push({
        path: f.path,
        lines: f.lines,
        functions: f.functions,
        imports: f.imports,
        methods: f.methods,
        score,
        reasons,
        label: 'Potential God Object',
      });
    }
  }

  return results.sort((a, b) => b.score - a.score || b.lines - a.lines);
}

module.exports = { detectGodObjects };
