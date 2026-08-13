const { detectComplexFiles } = require('../complexityDetector');

function row(path, complexity, overrides = {}) {
  return { path, complexity, isBinary: false, ...overrides };
}

describe('detectComplexFiles', () => {
  it('excludes Low and Moderate complexity files', () => {
    const result = detectComplexFiles([row('a.js', 3), row('b.js', 8)]);
    expect(result).toEqual([]);
  });

  it('flags High and Very High complexity files', () => {
    const result = detectComplexFiles([row('a.js', 15), row('b.js', 25)]);
    expect(result.map((r) => r.path).sort()).toEqual(['a.js', 'b.js']);
  });

  it('sorts flagged files by descending complexity', () => {
    const result = detectComplexFiles([row('low-high.js', 12), row('very-high.js', 30)]);
    expect(result[0].path).toBe('very-high.js');
  });

  it('skips binary files and zero-complexity files', () => {
    const result = detectComplexFiles([row('img.png', 25, { isBinary: true }), row('empty.js', 0)]);
    expect(result).toEqual([]);
  });
});
