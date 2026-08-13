const { detectCircularDependencies } = require('../circularDependencyDetector');

function graph(nodePaths, edgePairs) {
  return {
    nodes: nodePaths.map((id) => ({ id })),
    edges: edgePairs.map(([from, to]) => ({ from, to })),
  };
}

describe('detectCircularDependencies', () => {
  it('finds no cycles in a purely acyclic graph', () => {
    const { nodes, edges } = graph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]);
    expect(detectCircularDependencies(nodes, edges)).toEqual([]);
  });

  it('detects a direct 2-file cycle', () => {
    const { nodes, edges } = graph(['a', 'b'], [['a', 'b'], ['b', 'a']]);
    const cycles = detectCircularDependencies(nodes, edges);
    expect(cycles).toHaveLength(1);
    expect(cycles[0].severity).toBe('HIGH');
  });

  it('detects a longer indirect cycle', () => {
    const { nodes, edges } = graph(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']]);
    const cycles = detectCircularDependencies(nodes, edges);
    expect(cycles).toHaveLength(1);
  });

  it('reports the same cycle only once regardless of DFS start point', () => {
    // a->b->c->a and b->c->a->b describe the same cycle.
    const { nodes, edges } = graph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']]);
    const cycles = detectCircularDependencies(nodes, edges);
    expect(cycles).toHaveLength(1);
  });

  it('finds multiple distinct cycles independently', () => {
    const { nodes, edges } = graph(
      ['a', 'b', 'x', 'y'],
      [['a', 'b'], ['b', 'a'], ['x', 'y'], ['y', 'x']]
    );
    const cycles = detectCircularDependencies(nodes, edges);
    expect(cycles).toHaveLength(2);
  });

  it('ignores self-loops safely (does not throw) when present in edges', () => {
    const { nodes, edges } = graph(['a'], [['a', 'a']]);
    expect(() => detectCircularDependencies(nodes, edges)).not.toThrow();
  });
});
