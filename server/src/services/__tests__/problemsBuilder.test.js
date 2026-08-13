const { buildProblems } = require('../problemsBuilder');

function emptyDetectors(overrides = {}) {
  return {
    circularDependencies: [],
    godObjects: [],
    largeFiles: [],
    complexFiles: [],
    unusedFiles: [],
    duplicates: [],
    parseErrorFiles: [],
    ...overrides,
  };
}

describe('buildProblems', () => {
  it('returns no problems and zeroed counts for a clean project', () => {
    const { problems, counts } = buildProblems(emptyDetectors());
    expect(problems).toEqual([]);
    expect(counts).toEqual({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  });

  it('gives every problem a unique id', () => {
    const { problems } = buildProblems(
      emptyDetectors({
        unusedFiles: [{ path: 'a.js' }, { path: 'b.js' }],
      })
    );
    const ids = new Set(problems.map((p) => p.id));
    expect(ids.size).toBe(problems.length);
  });

  it('sorts problems by severity, most severe first', () => {
    const { problems } = buildProblems(
      emptyDetectors({
        unusedFiles: [{ path: 'unused.js' }], // LOW
        circularDependencies: [{ files: ['a.js', 'b.js'], severity: 'HIGH' }], // HIGH
        largeFiles: [{ path: 'huge.js', lines: 5000, classification: 'Very Large' }], // MEDIUM
      })
    );
    const severities = problems.map((p) => p.severity);
    expect(severities).toEqual(['HIGH', 'MEDIUM', 'LOW']);
  });

  it('only reports Very Large files as large-file problems, not Large ones', () => {
    const { problems } = buildProblems(
      emptyDetectors({
        largeFiles: [
          { path: 'a.js', lines: 600, classification: 'Large' },
          { path: 'b.js', lines: 1200, classification: 'Very Large' },
        ],
      })
    );
    expect(problems).toHaveLength(1);
    expect(problems[0].files).toEqual(['b.js']);
  });

  it('rates god objects HIGH or MEDIUM depending on score', () => {
    const { problems } = buildProblems(
      emptyDetectors({
        godObjects: [
          { path: 'strong.js', score: 4, reasons: ['x'] },
          { path: 'weak.js', score: 3, reasons: ['y'] },
        ],
      })
    );
    const strong = problems.find((p) => p.description === 'strong.js');
    const weak = problems.find((p) => p.description === 'weak.js');
    expect(strong.severity).toBe('HIGH');
    expect(weak.severity).toBe('MEDIUM');
  });

  it('computes filesAffected for duplicate-code findings from unique file paths', () => {
    const { problems } = buildProblems(
      emptyDetectors({
        duplicates: [
          {
            locations: [
              { path: 'a.js', startLine: 1 },
              { path: 'a.js', startLine: 20 },
              { path: 'b.js', startLine: 5 },
            ],
            similarity: 100,
          },
        ],
      })
    );
    expect(problems[0].filesAffected).toBe(2);
  });

  it('tallies counts per severity correctly', () => {
    const { counts } = buildProblems(
      emptyDetectors({
        parseErrorFiles: ['a.js', 'b.js'], // LOW, LOW
        complexFiles: [{ path: 'c.js', bucket: 'Very High', complexity: 30 }], // HIGH
      })
    );
    expect(counts).toEqual({ CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 2 });
  });
});
