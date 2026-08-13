const { scanFiles } = require('./scanner/fileScanner');
const { parseFile } = require('./parser/astParser');
const { analyzeFiles } = require('./analyzer/fileAnalyzer');
const { analyzeImports } = require('./analyzer/importAnalyzer');
const { analyzeDependencies } = require('./analyzer/dependencyAnalyzer');
const { analyzeArchitecture } = require('./analyzer/architectureAnalyzer');
const { analyzeTechStack } = require('./analyzer/techStackAnalyzer');
const { analyzeMetrics } = require('./analyzer/metricsAnalyzer');
const { analyzeGitHistory } = require('./analyzer/gitHistoryAnalyzer');

const { detectLargeFiles } = require('./detectors/largeFileDetector');
const { detectCircularDependencies } = require('./detectors/circularDependencyDetector');
const { detectGodObjects } = require('./detectors/godObjectDetector');
const { detectUnusedFiles } = require('./detectors/unusedFileDetector');
const { detectComplexFiles } = require('./detectors/complexityDetector');
const { detectDuplicateCode } = require('./detectors/duplicateCodeDetector');

const { buildProblems } = require('./problemsBuilder');
const { calculateHealthScore } = require('./healthScore');

/**
 * The single entry point every project source (ZIP or GitHub)
 * eventually funnels through. Nothing in here cares where the files came
 * from — only that `rootDir` holds an extracted, untrusted source tree.
 *
 *   scanFiles -> parseFiles -> buildDependencyGraph -> runAnalyzers
 *             -> runDetectors -> calculateHealthScore -> report
 */
async function analyzeProject(rootDir, { projectName, onStage } = {}) {
  // Each stage callback is followed by a setImmediate yield. analyzeProject
  // is otherwise a long run of synchronous CPU work, so without yielding,
  // an SSE `onStage` push would sit buffered behind that work and arrive
  // all at once at the end — indistinguishable from fake progress. Yielding
  // here lets Node flush the response chunk before the next stage runs.
  const stage = async (name) => {
    if (onStage) onStage(name);
    await new Promise((resolve) => setImmediate(resolve));
  };

  await stage('Scanning files...');
  const files = await scanFiles(rootDir);

  await stage('Parsing source files...');
  const parsedByPath = new Map();
  for (const f of files) {
    parsedByPath.set(f.path, parseFile(f));
  }

  await stage('Calculating metrics...');
  const { fileRows, summary } = analyzeFiles(files, parsedByPath);

  await stage('Building dependency graph...');
  const { edges } = analyzeImports(fileRows, parsedByPath);
  const dependencyGraph = analyzeDependencies(fileRows, edges);

  const architecture = analyzeArchitecture(fileRows);
  const techStack = analyzeTechStack(files);
  const metrics = analyzeMetrics(fileRows, dependencyGraph);

  await stage('Running detectors...');
  const largeFileResult = detectLargeFiles(fileRows);
  const circularDependencies = detectCircularDependencies(dependencyGraph.nodes, edges);
  const godObjects = detectGodObjects(fileRows, dependencyGraph);
  const unusedFiles = detectUnusedFiles(fileRows, dependencyGraph);
  const complexFiles = detectComplexFiles(fileRows);
  const duplicates = detectDuplicateCode(fileRows, files);
  const parseErrorFiles = fileRows.filter((f) => f.parseError).map((f) => f.path);

  await stage('Generating report...');
  const { problems, counts } = buildProblems({
    circularDependencies,
    godObjects,
    largeFiles: largeFileResult.flagged,
    complexFiles,
    unusedFiles,
    duplicates,
    parseErrorFiles,
  });

  const health = calculateHealthScore({
    largeFiles: largeFileResult.flagged,
    circularDependencies,
    godObjects,
    complexFiles,
    unusedFiles,
    parseErrors: parseErrorFiles.length,
  });

  await stage('Analyzing git history...');
  // Opportunistic: only produces data when the source tree actually has a
  // .git directory (GitHub clones do; plain ZIP exports usually don't).
  const gitHistory = await analyzeGitHistory(rootDir);

  return {
    projectName: projectName || 'project',
    generatedAt: new Date().toISOString(),
    summary,
    healthScore: health,
    files: fileRows,
    dependencies: {
      nodes: dependencyGraph.nodes,
      edges: dependencyGraph.edges,
      mostConnected: dependencyGraph.mostConnected,
    },
    architecture,
    techStack,
    metrics,
    gitHistory,
    problems,
    problemCounts: counts,
    detectors: {
      largeFiles: largeFileResult.flagged,
      circularDependencies,
      godObjects,
      unusedFiles,
      complexFiles,
      duplicates,
    },
    warnings: parseErrorFiles.length > 0 ? [`${parseErrorFiles.length} file(s) could not be parsed. Analysis completed with warnings.`] : [],
  };
}

module.exports = { analyzeProject };
