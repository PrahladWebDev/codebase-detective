const { detectLargeFiles, classify } = require('../largeFileDetector');

describe('classify', () => {
  it('buckets line counts against the configured thresholds', () => {
    expect(classify(50)).toBe('Healthy');
    expect(classify(299)).toBe('Healthy');
    expect(classify(300)).toBe('Normal');
    expect(classify(499)).toBe('Normal');
    expect(classify(500)).toBe('Large');
    expect(classify(999)).toBe('Large');
    expect(classify(1000)).toBe('Very Large');
  });
});

describe('detectLargeFiles', () => {
  it('only flags Large and Very Large files', () => {
    const { flagged } = detectLargeFiles([
      { path: 'small.js', lines: 50, isBinary: false },
      { path: 'medium.js', lines: 350, isBinary: false },
      { path: 'large.js', lines: 700, isBinary: false },
      { path: 'huge.js', lines: 2000, isBinary: false },
    ]);
    expect(flagged.map((f) => f.path)).toEqual(['huge.js', 'large.js']);
  });

  it('skips binary files regardless of size', () => {
    const { flagged } = detectLargeFiles([{ path: 'huge.bin', lines: 5000, isBinary: true }]);
    expect(flagged).toEqual([]);
  });

  it('sorts flagged files by descending line count', () => {
    const { flagged } = detectLargeFiles([
      { path: 'a.js', lines: 1500, isBinary: false },
      { path: 'b.js', lines: 3000, isBinary: false },
    ]);
    expect(flagged[0].path).toBe('b.js');
  });
});
