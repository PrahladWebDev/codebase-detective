const fg = require('fast-glob');
const fs = require('fs');
const path = require('path');
const { IGNORE_DIRS, BINARY_EXTENSIONS, LANGUAGE_BY_EXT } = require('../../config/constants');

const ignorePatterns = IGNORE_DIRS.map((dir) => `**/${dir}/**`);

/**
 * Walks the extracted project directory and returns a lightweight record
 * per text file: relative path, size, line count and detected language.
 * Binary files are listed (for stats) but not read into memory.
 */
async function scanFiles(rootDir) {
  const entries = await fg('**/*', {
    cwd: rootDir,
    dot: false,
    onlyFiles: true,
    ignore: ignorePatterns,
    followSymbolicLinks: false,
  });

  const files = [];

  for (const relativePath of entries) {
    const absolutePath = path.join(rootDir, relativePath);
    let stat;
    try {
      stat = fs.statSync(absolutePath);
    } catch {
      continue;
    }

    const ext = path.extname(relativePath).toLowerCase();
    const isBinary = BINARY_EXTENSIONS.includes(ext);
    const language = LANGUAGE_BY_EXT[ext] || (isBinary ? 'Binary' : 'Other');

    const record = {
      path: relativePath.split(path.sep).join('/'),
      absolutePath,
      ext,
      size: stat.size,
      language,
      isBinary,
      lines: 0,
      content: null,
    };

    if (!isBinary) {
      try {
        const content = fs.readFileSync(absolutePath, 'utf8');
        record.content = content;
        record.lines = content.length === 0 ? 0 : content.split('\n').length;
      } catch {
        record.isBinary = true; // unreadable as text, treat like binary
      }
    }

    files.push(record);
  }

  return files;
}

module.exports = { scanFiles };
