const path = require('path');

const RESOLVE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];

/**
 * Resolves an import source string (e.g. "./userService") to a project-relative
 * path that actually exists among the scanned files. Returns null for
 * external/npm packages, since those aren't part of the internal graph.
 */
function resolveImport(fromPath, source, knownPaths) {
  if (!source.startsWith('.')) return null; // external package

  const fromDir = path.posix.dirname(fromPath);
  const rawTarget = path.posix.normalize(path.posix.join(fromDir, source));

  if (knownPaths.has(rawTarget)) return rawTarget;

  for (const suffix of RESOLVE_EXTENSIONS) {
    const candidate = suffix.startsWith('/') ? rawTarget + suffix : `${rawTarget}${suffix}`;
    if (knownPaths.has(candidate)) return candidate;
  }
  return null;
}

/**
 * Builds a directed import graph: nodes are project files, edges point
 * from importer -> imported. Only internal (relative) imports become edges;
 * external packages are tallied separately per file.
 */
function analyzeImports(fileRows, parsedByPath) {
  const knownPaths = new Set(fileRows.map((f) => f.path));
  const edges = []; // { from, to }
  const externalByFile = new Map();

  for (const file of fileRows) {
    const parsed = parsedByPath.get(file.path);
    if (!parsed || !parsed.facts) continue;

    let externalCount = 0;
    for (const imp of parsed.facts.imports) {
      const resolved = resolveImport(file.path, imp.source, knownPaths);
      if (resolved && resolved !== file.path) {
        edges.push({ from: file.path, to: resolved });
      } else if (!imp.source.startsWith('.')) {
        externalCount += 1;
      }
    }
    externalByFile.set(file.path, externalCount);
  }

  // De-duplicate edges (a file might import the same module twice).
  const seen = new Set();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.from}=>${e.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { edges: uniqueEdges, externalByFile };
}

module.exports = { analyzeImports, resolveImport };
