const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const AdmZip = require('adm-zip');
const { UPLOAD } = require('../config/constants');

// Uploaded ZIPs are held in memory only long enough to validate + extract them.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: UPLOAD.MAX_ZIP_BYTES },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.zip') {
      return cb(new Error('Only .zip files are supported.'));
    }
    cb(null, true);
  },
}).single('project');

/**
 * Extracts a ZIP buffer to a fresh temp directory, defending against:
 *  - zip-slip / path traversal (entries that escape the target dir)
 *  - zip bombs (too many files, or too much extracted data)
 *  - oversized individual files
 * Uploaded projects are treated as strictly untrusted: nothing is executed,
 * no install scripts run, no shell commands are issued against their contents.
 */
function safeExtractZip(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  if (entries.length > UPLOAD.MAX_FILE_COUNT) {
    throw new Error(`ZIP contains too many entries (${entries.length}). Limit is ${UPLOAD.MAX_FILE_COUNT}.`);
  }

  const targetRoot = path.join(os.tmpdir(), 'codebase-detective', uuidv4());
  fs.mkdirSync(targetRoot, { recursive: true });
  const resolvedRoot = fs.realpathSync(targetRoot);

  let totalBytes = 0;

  for (const entry of entries) {
    const entryName = entry.entryName;

    // Reject absolute paths and any path containing traversal segments.
    if (path.isAbsolute(entryName) || entryName.split(/[/\\]/).includes('..')) {
      continue; // skip silently rather than aborting the whole extraction
    }

    const destPath = path.resolve(resolvedRoot, entryName);
    if (!destPath.startsWith(resolvedRoot + path.sep) && destPath !== resolvedRoot) {
      continue; // zip-slip guard: resolved path escapes the target root
    }

    if (entry.isDirectory) {
      fs.mkdirSync(destPath, { recursive: true });
      continue;
    }

    const data = entry.getData();
    if (data.length > UPLOAD.MAX_SINGLE_FILE_BYTES) {
      continue; // skip absurdly large single files rather than failing the batch
    }

    totalBytes += data.length;
    if (totalBytes > UPLOAD.MAX_EXTRACTED_BYTES) {
      throw new Error('Extracted project exceeds the maximum allowed size.');
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, data);
  }

  return resolvedRoot;
}

function cleanupDir(dirPath) {
  fs.rm(dirPath, { recursive: true, force: true }, () => {});
}

module.exports = { upload, safeExtractZip, cleanupDir };
