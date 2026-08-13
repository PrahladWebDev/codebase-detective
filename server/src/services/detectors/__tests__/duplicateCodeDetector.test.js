const { detectDuplicateCode } = require('../duplicateCodeDetector');

function makeInputs(sourceByPath) {
  const files = Object.entries(sourceByPath).map(([p, content]) => ({ path: p, content }));
  const fileRows = files.map((f) => ({ path: f.path, isBinary: false }));
  return { fileRows, files };
}

describe('detectDuplicateCode', () => {
  it('finds no duplicates when files are all unique', () => {
    const { fileRows, files } = makeInputs({
      'a.js': 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst e = 5;\nconst f = 6;\n',
      'b.js': 'let x = 10;\nlet y = 20;\nlet z = 30;\nlet w = 40;\nlet v = 50;\nlet u = 60;\n',
    });
    expect(detectDuplicateCode(fileRows, files)).toEqual([]);
  });

  it('flags an identical 6-line block repeated across two files', () => {
    // No trailing newline, so the content is exactly 6 lines -> exactly one window.
    const block = 'function process(x) {\n  const a = x + 1;\n  const b = a * 2;\n  const c = b - 3;\n  return c;\n}';
    const { fileRows, files } = makeInputs({
      'a.js': block,
      'b.js': block,
    });
    const findings = detectDuplicateCode(fileRows, files);
    expect(findings).toHaveLength(1);
    expect(findings[0].occurrences).toBe(2);
    expect(findings[0].similarity).toBe(100);
  });

  it('does not flag duplication that only occurs within a single file', () => {
    const block = 'function process(x) {\n  const a = x + 1;\n  const b = a * 2;\n  const c = b - 3;\n  return c;\n}\n';
    const { fileRows, files } = makeInputs({
      'a.js': block + '\n' + block,
    });
    expect(detectDuplicateCode(fileRows, files)).toEqual([]);
  });

  it('ignores whitespace-only differences when normalizing lines', () => {
    const { fileRows, files } = makeInputs({
      'a.js': 'if (x) {\n  doThing();\n  doOther();\n  doMore();\n  doFinal();\n  return 1;\n}\n',
      'b.js': 'if (x) {\n   doThing();\n doOther();\n    doMore();\n doFinal();\n   return 1;\n}\n',
    });
    const findings = detectDuplicateCode(fileRows, files);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('skips binary files', () => {
    const { fileRows, files } = makeInputs({ 'img.png': 'not real text' });
    fileRows[0].isBinary = true;
    expect(detectDuplicateCode(fileRows, files)).toEqual([]);
  });
});
