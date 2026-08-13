const { detectUnusedFiles, isEntryFile } = require('../unusedFileDetector');

describe('isEntryFile', () => {
  it('recognizes conventional entry point filenames', () => {
    expect(isEntryFile('src/index.js')).toBe(true);
    expect(isEntryFile('server.js')).toBe(true);
    expect(isEntryFile('src/App.jsx')).toBe(false); // App.jsx is not a recognized entry pattern
    expect(isEntryFile('app.js')).toBe(true);
  });

  it('recognizes config files', () => {
    expect(isEntryFile('vite.config.js')).toBe(true);
    expect(isEntryFile('jest.config.ts')).toBe(true);
  });

  it('does not flag arbitrary files as entry points', () => {
    expect(isEntryFile('src/utils/helper.js')).toBe(false);
  });
});

describe('detectUnusedFiles', () => {
  function graph(incomingByPath) {
    return { incoming: new Map(Object.entries(incomingByPath)) };
  }

  it('flags a parseable file with zero incoming references', () => {
    const rows = [{ path: 'src/orphan.js', ext: '.js', isBinary: false, lines: 20 }];
    const result = detectUnusedFiles(rows, graph({ 'src/orphan.js': 0 }));
    expect(result).toEqual([{ path: 'src/orphan.js', lines: 20 }]);
  });

  it('does not flag a file that has at least one incoming reference', () => {
    const rows = [{ path: 'src/used.js', ext: '.js', isBinary: false, lines: 20 }];
    const result = detectUnusedFiles(rows, graph({ 'src/used.js': 1 }));
    expect(result).toEqual([]);
  });

  it('never flags recognized entry points even with zero references', () => {
    const rows = [{ path: 'src/index.js', ext: '.js', isBinary: false, lines: 20 }];
    const result = detectUnusedFiles(rows, graph({ 'src/index.js': 0 }));
    expect(result).toEqual([]);
  });

  it('skips binary and non-parseable-extension files', () => {
    const rows = [
      { path: 'logo.png', ext: '.png', isBinary: true, lines: 0 },
      { path: 'README.md', ext: '.md', isBinary: false, lines: 30 },
    ];
    const result = detectUnusedFiles(rows, graph({ 'logo.png': 0, 'README.md': 0 }));
    expect(result).toEqual([]);
  });
});
