const path = require('path');
const { parseFile } = require('../../parser/astParser');
const { analyzeFiles } = require('../../analyzer/fileAnalyzer');
const { analyzeImports } = require('../../analyzer/importAnalyzer');
const { analyzeDependencies } = require('../../analyzer/dependencyAnalyzer');
const { LANGUAGE_BY_EXT, BINARY_EXTENSIONS } = require('../../../config/constants');

/**
 * Builds the same intermediate shapes engine.js produces (fileRows,
 * parsedByPath, dependency graph) from an in-memory map of
 * { 'relative/path.js': 'source text' }, without touching disk or the
 * scanner. Lets analyzer/detector tests exercise the exact objects those
 * modules receive in production.
 */
function buildProject(sourceByPath) {
  const files = Object.entries(sourceByPath).map(([relPath, content]) => {
    const ext = path.extname(relPath).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.includes(ext);
    return {
      path: relPath,
      ext,
      language: LANGUAGE_BY_EXT[ext] || (isBinary ? 'Binary' : 'Other'),
      size: Buffer.byteLength(content, 'utf8'),
      isBinary,
      lines: content.length === 0 ? 0 : content.split('\n').length,
      content,
    };
  });

  const parsedByPath = new Map(files.map((f) => [f.path, parseFile(f)]));
  const { fileRows, summary } = analyzeFiles(files, parsedByPath);
  const { edges } = analyzeImports(fileRows, parsedByPath);
  const dependencyGraph = analyzeDependencies(fileRows, edges);

  return { files, fileRows, parsedByPath, edges, dependencyGraph, summary };
}

module.exports = { buildProject };
