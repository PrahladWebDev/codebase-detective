const { buildProject } = require('../../__tests__/helpers/buildProject');

describe('analyzeFiles', () => {
  it('computes totals and language distribution', () => {
    const { fileRows, summary } = buildProject({
      'a.js': 'const a = 1;\nconst b = 2;\n',
      'b.py': 'x = 1\ny = 2\nz = 3\n',
    });

    expect(fileRows).toHaveLength(2);
    expect(summary.totalFiles).toBe(2);
    expect(summary.totalLines).toBe(fileRows[0].lines + fileRows[1].lines);

    const langs = summary.languageDistribution.map((l) => l.language).sort();
    expect(langs).toEqual(['JavaScript', 'Python']);
  });

  it('identifies the largest file by line count', () => {
    const { summary } = buildProject({
      'small.js': 'const a = 1;\n',
      'big.js': Array.from({ length: 50 }, (_, i) => `const x${i} = ${i};`).join('\n'),
    });
    expect(summary.largestFile.path).toBe('big.js');
  });

  it('carries parse errors through to the file row and summary count', () => {
    const { fileRows, summary } = buildProject({
      'broken.js': 'function ( { totally not valid +++',
    });
    expect(fileRows[0].parseError).toBeTruthy();
    expect(summary.parseErrors).toBe(1);
  });

  it('derives imports/exports/functions/complexity from parsed facts', () => {
    const { fileRows } = buildProject({
      'helper.js': `
        export function add(a, b) {
          if (a > 0) return a + b;
          return b;
        }
      `,
    });
    const row = fileRows[0];
    expect(row.exports).toBe(1);
    expect(row.functions).toBe(1);
    expect(row.complexity).toBeGreaterThan(1);
  });
});
