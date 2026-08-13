/**
 * Detects cycles in the directed import graph via DFS with a recursion
 * stack. Reports each distinct cycle once, with severity based on length
 * (shorter cycles are usually tighter coupling, so rated higher).
 */
function detectCircularDependencies(nodes, edges) {
  const adjacency = new Map();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const e of edges) {
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    adjacency.get(e.from).push(e.to);
  }

  const visited = new Set();
  const stack = [];
  const stackSet = new Set();
  const cycles = [];
  const seenCycleKeys = new Set();

  function normalizeCycleKey(cyclePath) {
    // Rotate so the smallest path string is first, so A->B->A and B->A->B
    // (same cycle, different start point) are treated as one finding.
    let minIdx = 0;
    for (let i = 1; i < cyclePath.length; i++) {
      if (cyclePath[i] < cyclePath[minIdx]) minIdx = i;
    }
    const rotated = [...cyclePath.slice(minIdx), ...cyclePath.slice(0, minIdx)];
    return rotated.join('->');
  }

  function dfs(node) {
    visited.add(node);
    stack.push(node);
    stackSet.add(node);

    for (const neighbor of adjacency.get(node) || []) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (stackSet.has(neighbor)) {
        const cycleStart = stack.indexOf(neighbor);
        const cyclePath = stack.slice(cycleStart);
        const key = normalizeCycleKey(cyclePath);
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          cycles.push({
            files: [...cyclePath, neighbor],
            length: cyclePath.length,
            severity: cyclePath.length <= 3 ? 'HIGH' : cyclePath.length <= 5 ? 'MEDIUM' : 'LOW',
          });
        }
      }
    }

    stack.pop();
    stackSet.delete(node);
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) dfs(node);
  }

  return cycles;
}

module.exports = { detectCircularDependencies };
