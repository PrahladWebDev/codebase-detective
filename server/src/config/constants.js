// Central configuration for scanning, security limits and thresholds.
// Keeping these in one place means every analyzer/detector agrees on the same rules.

module.exports = {
  UPLOAD: {
    MAX_ZIP_BYTES: 2 * 1024 * 1024 * 1024, // 2 GB, matches the uploader UI copy
    MAX_EXTRACTED_BYTES: 6 * 1024 * 1024 * 1024, // guard against zip bombs; headroom above MAX_ZIP_BYTES for decompression
    MAX_FILE_COUNT: 20000,
    MAX_SINGLE_FILE_BYTES: 5 * 1024 * 1024,
  },

  GITHUB: {
    CLONE_TIMEOUT_MS: 120 * 1000, // kill a hung/oversized clone (bumped alongside the size ceiling)
    MAX_REPO_BYTES: 2 * 1024 * 1024 * 1024, // same ceiling as an uploaded ZIP, post-clone
    ALLOWED_HOSTS: ['github.com'],
    // Deep enough to give git-history analysis (churn, contributors) real
    // signal, shallow enough to stay fast on large repos. A full clone
    // isn't needed since gitHistoryAnalyzer itself caps at 500 commits.
    CLONE_DEPTH: 300,
  },

  IGNORE_DIRS: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.turbo',
    '.cache',
    '.vscode',
    '.idea',
    'vendor',
    '__pycache__',
    '.venv',
    'venv',
  ],

  // Files we never treat as "unused" candidates even with zero inbound references,
  // because they are conventional entry points or config files.
  ENTRY_FILE_PATTERNS: [
    /(^|\/)index\.(js|jsx|ts|tsx|mjs|cjs)$/,
    /(^|\/)main\.(js|jsx|ts|tsx|mjs|cjs)$/,
    /(^|\/)server\.(js|ts|mjs|cjs)$/,
    /(^|\/)app\.(js|jsx|ts|tsx|mjs|cjs)$/,
    /vite\.config\.[jt]s$/,
    /webpack\.config\.[jt]s$/,
    /next\.config\.[jt]s$/,
    /babel\.config\.[jt]s$/,
    /jest\.config\.[jt]s$/,
    /\.d\.ts$/,
  ],

  PARSEABLE_EXTENSIONS: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],

  LANGUAGE_BY_EXT: {
    '.js': 'JavaScript',
    '.mjs': 'JavaScript',
    '.cjs': 'JavaScript',
    '.jsx': 'JSX',
    '.ts': 'TypeScript',
    '.tsx': 'TSX',
    '.json': 'JSON',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'LESS',
    '.html': 'HTML',
    '.md': 'Markdown',
    '.py': 'Python',
    '.go': 'Go',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.yml': 'YAML',
    '.yaml': 'YAML',
  },

  BINARY_EXTENSIONS: [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.bmp',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.mov', '.avi', '.mp3', '.wav',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.pdf', '.exe', '.dll', '.so', '.dylib',
    '.node', '.wasm', '.db', '.sqlite',
  ],

  THRESHOLDS: {
    LARGE_FILE: { HEALTHY: 300, NORMAL: 500, LARGE: 1000 },
    COMPLEXITY: { LOW: 5, MODERATE: 10, HIGH: 20 },
    GOD_OBJECT: {
      MIN_LINES: 600,
      MIN_FUNCTIONS: 20,
      MIN_IMPORTS: 12,
      MIN_SCORE: 3, // number of red-flag signals that must fire
    },
  },

  HEALTH_PENALTIES: {
    LARGE_FILE_VERY_LARGE: 2, // per file, capped
    CIRCULAR_DEPENDENCY: 7, // per cycle, capped
    GOD_OBJECT: 6, // per god object, capped
    HIGH_COMPLEXITY: 1, // per high-complexity file, capped
    UNUSED_FILE: 0.5, // per unused file, capped
    UNPARSED_FILE: 1, // per file that failed to parse, capped
  },

  ANALYSIS_TTL_MS: 1000 * 60 * 60 * 2, // in-memory reports expire after 2 hours
};
