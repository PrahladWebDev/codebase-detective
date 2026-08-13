const { THRESHOLDS } = require('../../config/constants');

function complexityBucket(score) {
  const { LOW, MODERATE, HIGH } = THRESHOLDS.COMPLEXITY;
  if (score <= LOW) return 'Low';
  if (score <= MODERATE) return 'Moderate';
  if (score <= HIGH) return 'High';
  return 'Very High';
}

/**
 * Rolls per-file facts up into the project-wide "Code Metrics" numbers:
 * totals, complexity distribution, and the most-imported module.
 */
function analyzeMetrics(fileRows, dependencyGraph) {
  const parseable = fileRows.filter((f) => !f.isBinary && f.complexity > 0);

  const complexityDistribution = { Low: 0, Moderate: 0, High: 0, 'Very High': 0 };
  let totalFunctions = 0;
  let totalComplexity = 0;

  for (const f of parseable) {
    complexityDistribution[complexityBucket(f.complexity)] += 1;
    totalFunctions += f.functions;
    totalComplexity += f.complexity;
  }

  const mostImported = dependencyGraph.mostConnected[0] || null;

  return {
    filesAnalyzed: parseable.length,
    totalFunctions,
    averageComplexity: parseable.length ? Math.round((totalComplexity / parseable.length) * 10) / 10 : 0,
    complexityDistribution,
    mostImportedModule: mostImported ? mostImported.path : null,
    highComplexityFiles: parseable.filter((f) => complexityBucket(f.complexity) === 'High' || complexityBucket(f.complexity) === 'Very High').length,
  };
}

module.exports = { analyzeMetrics, complexityBucket };
