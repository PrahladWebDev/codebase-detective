/**
 * Turns the raw scanned file list into the "Files" table data and the
 * project-wide summary numbers (totals, language distribution, largest file).
 */
function analyzeFiles(files, parsedByPath) {
  const fileRows = files.map((f) => {
    const parsed = parsedByPath.get(f.path);
    const facts = parsed && parsed.facts ? parsed.facts : null;
    return {
      path: f.path,
      ext: f.ext,
      language: f.language,
      lines: f.lines,
      size: f.size,
      isBinary: f.isBinary,
      imports: facts ? facts.imports.length : 0,
      exports: facts ? facts.exports.length : 0,
      functions: facts ? facts.functionCount : 0,
      classes: facts ? facts.classCount : 0,
      methods: facts ? facts.methodCount : 0,
      complexity: facts ? facts.cyclomaticComplexity : 0,
      parseError: parsed && parsed.error ? parsed.error : null,
    };
  });

  const totalFiles = fileRows.length;
  const totalLines = fileRows.reduce((sum, f) => sum + f.lines, 0);
  const totalSize = fileRows.reduce((sum, f) => sum + f.size, 0);

  const languageCounts = {};
  for (const f of fileRows) {
    if (f.isBinary) continue;
    languageCounts[f.language] = (languageCounts[f.language] || 0) + f.lines;
  }
  const languageTotal = Object.values(languageCounts).reduce((a, b) => a + b, 0) || 1;
  const languageDistribution = Object.entries(languageCounts)
    .map(([language, lines]) => ({
      language,
      lines,
      percent: Math.round((lines / languageTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.lines - a.lines);

  const largestFile = fileRows.reduce(
    (max, f) => (f.lines > (max ? max.lines : -1) ? f : max),
    null
  );

  const parseErrors = fileRows.filter((f) => f.parseError).length;

  return {
    fileRows,
    summary: {
      totalFiles,
      totalLines,
      totalSize,
      largestFile: largestFile ? { path: largestFile.path, lines: largestFile.lines } : null,
      languageDistribution,
      parseErrors,
    },
  };
}

module.exports = { analyzeFiles };
