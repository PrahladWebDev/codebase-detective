const { parseFile, isParseable } = require('../astParser');

describe('isParseable', () => {
  it('accepts JS/TS family extensions', () => {
    expect(isParseable('.js')).toBe(true);
    expect(isParseable('.jsx')).toBe(true);
    expect(isParseable('.ts')).toBe(true);
    expect(isParseable('.tsx')).toBe(true);
    expect(isParseable('.mjs')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isParseable('.py')).toBe(false);
    expect(isParseable('.json')).toBe(false);
    expect(isParseable('.md')).toBe(false);
  });
});

describe('parseFile', () => {
  it('skips non-parseable extensions', () => {
    const result = parseFile({ ext: '.json', content: '{}', path: 'a.json' });
    expect(result.skipped).toBe(true);
  });

  it('skips files with null content (binary)', () => {
    const result = parseFile({ ext: '.js', content: null, path: 'a.js' });
    expect(result.skipped).toBe(true);
  });

  it('extracts named and default exports', () => {
    const src = `export const a = 1;\nexport default function foo() {}`;
    const { facts } = parseFile({ ext: '.js', content: src, path: 'a.js' });
    expect(facts.exports).toEqual(['named', 'default']);
  });

  it('extracts ES import sources and require() calls', () => {
    const src = `
      import React from 'react';
      import { helper } from './utils/helper';
      const fs = require('fs');
    `;
    const { facts } = parseFile({ ext: '.js', content: src, path: 'a.js' });
    const sources = facts.imports.map((i) => i.source).sort();
    expect(sources).toEqual(['./utils/helper', 'fs', 'react']);
  });

  it('counts function declarations, expressions, and arrow functions', () => {
    const src = `
      function a() {}
      const b = function () {};
      const c = () => {};
    `;
    const { facts } = parseFile({ ext: '.js', content: src, path: 'a.js' });
    expect(facts.functionCount).toBe(3);
  });

  it('counts classes and methods', () => {
    const src = `
      class Foo {
        method1() {}
        method2() {}
      }
    `;
    const { facts } = parseFile({ ext: '.js', content: src, path: 'a.js' });
    expect(facts.classCount).toBe(1);
    expect(facts.methodCount).toBe(2);
  });

  it('computes cyclomatic complexity from decision points', () => {
    const src = `
      function f(a, b) {
        if (a) {
          return 1;
        } else if (b) {
          return 2;
        }
        for (let i = 0; i < 10; i++) {}
        return a && b ? 1 : 0;
      }
    `;
    const { facts } = parseFile({ ext: '.js', content: src, path: 'a.js' });
    // baseline(1) + if(1) + if(else-if)(1) + for(1) + &&(1) + ternary(1) = 6
    expect(facts.cyclomaticComplexity).toBe(6);
  });

  it('parses TSX with type annotations without throwing', () => {
    const src = `
      interface Props { label: string }
      export const Button: React.FC<Props> = ({ label }) => <button>{label}</button>;
    `;
    const result = parseFile({ ext: '.tsx', content: src, path: 'a.tsx' });
    expect(result.error).toBeUndefined();
    expect(result.facts.exports).toEqual(['named']);
  });

  it('reports a parse error instead of throwing on invalid syntax', () => {
    const src = `function ( { this is not valid javascript +++ `;
    const result = parseFile({ ext: '.js', content: src, path: 'broken.js' });
    expect(result.error).toBeDefined();
    expect(result.facts).toBeUndefined();
  });
});
