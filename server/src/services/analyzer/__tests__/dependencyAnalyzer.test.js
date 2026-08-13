const { buildProject } = require('../../__tests__/helpers/buildProject');

describe('analyzeDependencies', () => {
  it('computes incoming/outgoing counts and most-connected ranking', () => {
    const { dependencyGraph } = buildProject({
      'a.js': `import './shared';`,
      'b.js': `import './shared';`,
      'c.js': `import './shared';`,
      'shared.js': `export const x = 1;`,
    });

    expect(dependencyGraph.incoming.get('shared.js')).toBe(3);
    expect(dependencyGraph.outgoing.get('a.js')).toBe(1);
    expect(dependencyGraph.mostConnected[0]).toEqual({ path: 'shared.js', dependents: 3 });
  });

  it('excludes files with zero incoming edges from mostConnected', () => {
    const { dependencyGraph } = buildProject({
      'a.js': `const x = 1;`,
    });
    expect(dependencyGraph.mostConnected).toHaveLength(0);
  });

  it('produces one graph node per file with a stable id/label/path', () => {
    const { dependencyGraph } = buildProject({
      'src/components/Button.jsx': `export function Button() { return null; }`,
    });
    const node = dependencyGraph.nodes.find((n) => n.id === 'src/components/Button.jsx');
    expect(node).toBeDefined();
    expect(node.label).toBe('Button.jsx');
    expect(node.path).toBe('src/components/Button.jsx');
  });
});
