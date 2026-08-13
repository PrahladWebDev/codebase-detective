const { calculateHealthScore } = require('../healthScore');

function emptyFindings(overrides = {}) {
  return {
    largeFiles: [],
    circularDependencies: [],
    godObjects: [],
    complexFiles: [],
    unusedFiles: [],
    parseErrors: 0,
    ...overrides,
  };
}

describe('calculateHealthScore', () => {
  it('scores a perfectly clean project at 100', () => {
    const health = calculateHealthScore(emptyFindings());
    expect(health.score).toBe(100);
    expect(health.finalScore).toBe(100);
    expect(health.deductions.every((d) => d.points === 0)).toBe(true);
  });

  it('deducts points per finding, itemized by category', () => {
    const health = calculateHealthScore(
      emptyFindings({
        circularDependencies: [{}, {}],
        godObjects: [{}],
      })
    );
    const cycles = health.deductions.find((d) => d.label === 'Circular dependencies');
    const gods = health.deductions.find((d) => d.label === 'Potential god objects');
    expect(cycles.points).toBe(14); // 2 * 7
    expect(gods.points).toBe(6); // 1 * 6
    expect(health.score).toBe(100 - 14 - 6);
  });

  it('never drops the score below 0, and is capped by the sum of per-category caps', () => {
    const health = calculateHealthScore(
      emptyFindings({
        circularDependencies: Array.from({ length: 50 }, () => ({})),
        godObjects: Array.from({ length: 50 }, () => ({})),
        largeFiles: Array.from({ length: 50 }, () => ({ classification: 'Very Large' })),
        complexFiles: Array.from({ length: 50 }, () => ({})),
        unusedFiles: Array.from({ length: 50 }, () => ({})),
        parseErrors: 50,
      })
    );
    // Every category caps out, so the floor here is 100 minus the sum of all
    // category caps (16+21+18+10+6+5=76) = 24, and the score must never go negative.
    expect(health.score).toBe(24);
    expect(health.score).toBeGreaterThanOrEqual(0);
  });

  it('caps each category so one problem type cannot dominate the score', () => {
    const health = calculateHealthScore(emptyFindings({ unusedFiles: Array.from({ length: 100 }, () => ({})) }));
    const unused = health.deductions.find((d) => d.label === 'Possibly unused files');
    expect(unused.points).toBe(6); // capped, not 0.5 * 100 = 50
  });

  it('always derives the score from the sum of itemized deductions', () => {
    const health = calculateHealthScore(
      emptyFindings({ complexFiles: [{}, {}], parseErrors: 1 })
    );
    const total = health.deductions.reduce((sum, d) => sum + d.points, 0);
    expect(health.score).toBe(Math.round(100 - total));
  });
});
