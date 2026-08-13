/**
 * Consumes the raw edge list and produces:
 *  - a React-Flow-friendly graph (nodes + edges, with fan-in used later for severity)
 *  - the "Most Connected Modules" ranking (highest incoming edge count)
 */
function analyzeDependencies(fileRows, edges) {
  const incoming = new Map();
  const outgoing = new Map();
  for (const f of fileRows) {
    incoming.set(f.path, 0);
    outgoing.set(f.path, 0);
  }
  for (const e of edges) {
    outgoing.set(e.from, (outgoing.get(e.from) || 0) + 1);
    incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
  }

  const mostConnected = fileRows
    .map((f) => ({ path: f.path, dependents: incoming.get(f.path) || 0 }))
    .filter((f) => f.dependents > 0)
    .sort((a, b) => b.dependents - a.dependents)
    .slice(0, 15);

  const nodes = fileRows.map((f) => ({
    id: f.path,
    label: f.path.split('/').pop(),
    path: f.path,
    incoming: incoming.get(f.path) || 0,
    outgoing: outgoing.get(f.path) || 0,
  }));

  return {
    nodes,
    edges,
    incoming,
    outgoing,
    mostConnected,
  };
}

module.exports = { analyzeDependencies };
