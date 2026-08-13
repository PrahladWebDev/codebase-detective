const { resolveImport } = require('../importAnalyzer');
const { buildProject } = require('../../__tests__/helpers/buildProject');

describe('resolveImport', () => {
  const knownPaths = new Set(['src/index.js', 'src/utils/helper.js', 'src/components/Button/index.jsx']);

  it('returns null for external (non-relative) packages', () => {
    expect(resolveImport('src/index.js', 'react', knownPaths)).toBeNull();
    expect(resolveImport('src/index.js', 'lodash/debounce', knownPaths)).toBeNull();
  });

  it('resolves a relative import to an exact existing path', () => {
    expect(resolveImport('src/other.js', './index.js', knownPaths)).toBe('src/index.js');
  });

  it('resolves a relative import missing its extension', () => {
    expect(resolveImport('src/index.js', './utils/helper', knownPaths)).toBe('src/utils/helper.js');
  });

  it('resolves a relative import to a directory index file', () => {
    expect(resolveImport('src/index.js', './components/Button', knownPaths)).toBe('src/components/Button/index.jsx');
  });

  it('returns null when nothing matches', () => {
    expect(resolveImport('src/index.js', './does/not/exist', knownPaths)).toBeNull();
  });
});

describe('analyzeImports', () => {
  it('builds edges only for resolvable internal imports', () => {
    const { edges } = buildProject({
      'src/index.js': `
        import React from 'react';
        import { helper } from './utils/helper';
      `,
      'src/utils/helper.js': `export function helper() { return 1; }`,
    });

    expect(edges).toEqual([{ from: 'src/index.js', to: 'src/utils/helper.js' }]);
  });

  it('de-duplicates repeated imports of the same module', () => {
    const { edges } = buildProject({
      'a.js': `
        import { x } from './b';
        import { y } from './b';
      `,
      'b.js': `export const x = 1; export const y = 2;`,
    });
    expect(edges).toHaveLength(1);
  });

  it('does not create a self-referencing edge', () => {
    // A file that (unusually) "imports" its own path should not create a self-loop.
    const { edges } = buildProject({
      'a.js': `import './a';`,
    });
    expect(edges).toHaveLength(0);
  });
});
