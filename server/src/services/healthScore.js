const { HEALTH_PENALTIES } = require('../config/constants');

const CAP = {
  LARGE_FILE_VERY_LARGE: 16,
  CIRCULAR_DEPENDENCY: 21,
  GOD_OBJECT: 18,
  HIGH_COMPLEXITY: 10,
  UNUSED_FILE: 6,
  UNPARSED_FILE: 5,
};

function penaltyFor(count, perItem, cap) {
  return Math.min(count * perItem, cap);
}

/**
 * Health score is always derived from the same findings shown elsewhere in
 * the report — never a random or hardcoded number. Every deduction is
 * itemized so the breakdown is fully transparent to the user.
 */
function calculateHealthScore({ largeFiles, circularDependencies, godObjects, complexFiles, unusedFiles, parseErrors }) {
  const veryLargeCount = largeFiles.filter((f) => f.classification === 'Very Large').length;

  const deductions = [
    { label: 'Very large files', count: veryLargeCount, points: penaltyFor(veryLargeCount, HEALTH_PENALTIES.LARGE_FILE_VERY_LARGE, CAP.LARGE_FILE_VERY_LARGE) },
    { label: 'Circular dependencies', count: circularDependencies.length, points: penaltyFor(circularDependencies.length, HEALTH_PENALTIES.CIRCULAR_DEPENDENCY, CAP.CIRCULAR_DEPENDENCY) },
    { label: 'Potential god objects', count: godObjects.length, points: penaltyFor(godObjects.length, HEALTH_PENALTIES.GOD_OBJECT, CAP.GOD_OBJECT) },
    { label: 'High complexity files', count: complexFiles.length, points: penaltyFor(complexFiles.length, HEALTH_PENALTIES.HIGH_COMPLEXITY, CAP.HIGH_COMPLEXITY) },
    { label: 'Possibly unused files', count: unusedFiles.length, points: penaltyFor(unusedFiles.length, HEALTH_PENALTIES.UNUSED_FILE, CAP.UNUSED_FILE) },
    { label: 'Files that failed to parse', count: parseErrors, points: penaltyFor(parseErrors, HEALTH_PENALTIES.UNPARSED_FILE, CAP.UNPARSED_FILE) },
  ];

  const totalDeduction = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, Math.round(100 - totalDeduction));

  return {
    score,
    startingScore: 100,
    deductions: deductions.map((d) => ({ ...d, points: Math.round(d.points * 10) / 10 })),
    finalScore: score,
  };
}

module.exports = { calculateHealthScore };
