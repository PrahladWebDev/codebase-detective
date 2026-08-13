let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `problem-${idCounter}`;
}

/**
 * Normalizes every detector's findings into one flat, severity-graded list
 * so the Problems page and the health score agree on the same source of truth.
 */
function buildProblems({ circularDependencies, godObjects, largeFiles, complexFiles, unusedFiles, duplicates, parseErrorFiles }) {
  const problems = [];

  for (const cycle of circularDependencies) {
    problems.push({
      id: nextId(),
      type: 'circular-dependency',
      title: 'Circular Dependency',
      severity: cycle.severity,
      description: cycle.files.join(' -> '),
      why: 'Circular dependencies can make module initialization and maintenance harder.',
      filesAffected: cycle.files.length,
      files: cycle.files,
    });
  }

  for (const god of godObjects) {
    problems.push({
      id: nextId(),
      type: 'god-object',
      title: 'Potential God Object',
      severity: god.score >= 4 ? 'HIGH' : 'MEDIUM',
      description: god.path,
      why: 'This module shows several signals of unusually high complexity and may have too many responsibilities. Consider reviewing.',
      filesAffected: 1,
      files: [god.path],
      details: god.reasons,
    });
  }

  for (const large of largeFiles.filter((f) => f.classification === 'Very Large')) {
    problems.push({
      id: nextId(),
      type: 'large-file',
      title: 'Potentially Large File',
      severity: 'MEDIUM',
      description: `${large.path} (${large.lines.toLocaleString()} lines)`,
      why: 'Consider reviewing whether responsibilities can be split into smaller modules.',
      filesAffected: 1,
      files: [large.path],
    });
  }

  for (const complex of complexFiles) {
    problems.push({
      id: nextId(),
      type: 'complexity',
      title: `${complex.bucket} Complexity`,
      severity: complex.bucket === 'Very High' ? 'HIGH' : 'MEDIUM',
      description: `${complex.path} (complexity score ${complex.complexity})`,
      why: 'High branching complexity can make a file harder to test and reason about.',
      filesAffected: 1,
      files: [complex.path],
    });
  }

  for (const dup of duplicates) {
    problems.push({
      id: nextId(),
      type: 'duplicate-code',
      title: 'Possible Duplicate Code',
      severity: 'LOW',
      description: dup.locations.map((l) => `${l.path}:${l.startLine}`).join(', '),
      why: 'Review whether this logic should be extracted into a shared function.',
      filesAffected: new Set(dup.locations.map((l) => l.path)).size,
      files: dup.locations.map((l) => l.path),
      similarity: dup.similarity,
    });
  }

  for (const unused of unusedFiles) {
    problems.push({
      id: nextId(),
      type: 'unused-file',
      title: 'Possibly Unused File',
      severity: 'LOW',
      description: unused.path,
      why: 'No internal file imports this module. It may be an entry point, dynamically loaded, or genuinely unused — worth a look.',
      filesAffected: 1,
      files: [unused.path],
    });
  }

  for (const path of parseErrorFiles) {
    problems.push({
      id: nextId(),
      type: 'parse-error',
      title: 'File Could Not Be Parsed',
      severity: 'LOW',
      description: path,
      why: 'This file was skipped for AST-based analysis (imports, complexity, etc.), so related numbers may be incomplete.',
      filesAffected: 1,
      files: [path],
    });
  }

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  problems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const p of problems) counts[p.severity] = (counts[p.severity] || 0) + 1;

  return { problems, counts };
}

module.exports = { buildProblems };
