const { complexityBucket, analyzeMetrics } = require('../metricsAnalyzer');
const { buildProject } = require('../../__tests__/helpers/buildProject');

describe('complexityBucket', () => {
  it('buckets scores against the configured thresholds', () => {
    expect(complexityBucket(1)).toBe('Low');
    expect(complexityBucket(5)).toBe('Low');
    expect(complexityBucket(6)).toBe('Moderate');
    expect(complexityBucket(10)).toBe('Moderate');
    expect(complexityBucket(11)).toBe('High');
    expect(complexityBucket(20)).toBe('High');
    expect(complexityBucket(21)).toBe('Very High');
  });
});

describe('analyzeMetrics', () => {
  it('summarizes function counts, complexity distribution, and most-imported module', () => {
    const { fileRows, dependencyGraph } = buildProject({
      'a.js': `import './b';\nfunction f() { if (true) {} }`,
      'b.js': `export function g() {}`,
    });

    const metrics = analyzeMetrics(fileRows, dependencyGraph);
    expect(metrics.filesAnalyzed).toBe(2);
    expect(metrics.totalFunctions).toBe(2);
    expect(metrics.mostImportedModule).toBe('b.js');
    expect(metrics.complexityDistribution.Low).toBe(2);
  });

  it('returns zeroed-out metrics for an empty project', () => {
    const { fileRows, dependencyGraph } = buildProject({});
    const metrics = analyzeMetrics(fileRows, dependencyGraph);
    expect(metrics.filesAnalyzed).toBe(0);
    expect(metrics.averageComplexity).toBe(0);
    expect(metrics.mostImportedModule).toBeNull();
  });
});
