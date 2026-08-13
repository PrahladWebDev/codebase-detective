const { complexityBucket } = require('../analyzer/metricsAnalyzer');

/**
 * Surfaces the highest-complexity files as review candidates. Complexity
 * here is an indicator (rough decision-point count), not an absolute
 * quality judgment.
 */
function detectComplexFiles(fileRows) {
  return fileRows
    .filter((f) => !f.isBinary && f.complexity > 0)
    .map((f) => ({ path: f.path, complexity: f.complexity, bucket: complexityBucket(f.complexity) }))
    .filter((f) => f.bucket === 'High' || f.bucket === 'Very High')
    .sort((a, b) => b.complexity - a.complexity);
}

module.exports = { detectComplexFiles };
