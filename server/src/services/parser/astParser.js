const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { PARSEABLE_EXTENSIONS } = require('../../config/constants');

function isParseable(ext) {
  return PARSEABLE_EXTENSIONS.includes(ext);
}

function getPlugins(ext) {
  const plugins = ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport', 'decorators-legacy'];
  if (ext === '.ts' || ext === '.tsx') plugins.push('typescript');
  return plugins;
}

/**
 * Parses a single source file into an AST and extracts the facts every
 * downstream analyzer/detector needs: imports, exports, function/class
 * counts, and a rough cyclomatic-complexity signal.
 * Never throws — parse failures are reported back as `{ error }` so one
 * unparseable file cannot take down the whole analysis.
 */
function parseFile(record) {
  const { ext, content, path: relPath } = record;
  if (!isParseable(ext) || content == null) {
    return { skipped: true };
  }

  let ast;
  try {
    ast = parse(content, {
      sourceType: 'unambiguous',
      plugins: getPlugins(ext),
      errorRecovery: true,
    });
  } catch (err) {
    return { error: err.message };
  }

  const facts = {
    imports: [], // { source, specifiers }
    exports: [],
    functionCount: 0,
    classCount: 0,
    methodCount: 0,
    callCount: 0,
    cyclomaticComplexity: 1, // baseline
  };

  try {
    traverse(ast, {
      ImportDeclaration(p) {
        facts.imports.push({
          source: p.node.source.value,
          specifiers: p.node.specifiers.map((s) => s.local.name),
        });
      },
      CallExpression(p) {
        facts.callCount += 1;
        const callee = p.node.callee;
        if (callee.type === 'Identifier' && callee.name === 'require' && p.node.arguments[0] && p.node.arguments[0].type === 'StringLiteral') {
          facts.imports.push({ source: p.node.arguments[0].value, specifiers: [] });
        }
      },
      ExportNamedDeclaration() {
        facts.exports.push('named');
      },
      ExportDefaultDeclaration() {
        facts.exports.push('default');
      },
      FunctionDeclaration() {
        facts.functionCount += 1;
      },
      FunctionExpression() {
        facts.functionCount += 1;
      },
      ArrowFunctionExpression() {
        facts.functionCount += 1;
      },
      ClassDeclaration() {
        facts.classCount += 1;
      },
      ClassExpression() {
        facts.classCount += 1;
      },
      ClassMethod() {
        facts.methodCount += 1;
      },
      ObjectMethod() {
        facts.methodCount += 1;
      },
      // Rough cyclomatic complexity: count decision points.
      IfStatement() {
        facts.cyclomaticComplexity += 1;
      },
      ForStatement() {
        facts.cyclomaticComplexity += 1;
      },
      ForInStatement() {
        facts.cyclomaticComplexity += 1;
      },
      ForOfStatement() {
        facts.cyclomaticComplexity += 1;
      },
      WhileStatement() {
        facts.cyclomaticComplexity += 1;
      },
      DoWhileStatement() {
        facts.cyclomaticComplexity += 1;
      },
      CatchClause() {
        facts.cyclomaticComplexity += 1;
      },
      ConditionalExpression() {
        facts.cyclomaticComplexity += 1;
      },
      SwitchCase(p) {
        if (p.node.test) facts.cyclomaticComplexity += 1;
      },
      LogicalExpression(p) {
        if (p.node.operator === '&&' || p.node.operator === '||') {
          facts.cyclomaticComplexity += 1;
        }
      },
    });
  } catch (err) {
    return { error: `traverse failed: ${err.message}` };
  }

  return { facts };
}

module.exports = { parseFile, isParseable };
