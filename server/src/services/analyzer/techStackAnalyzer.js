const PACKAGE_SIGNATURES = {
  Frontend: {
    React: ['react'],
    Vue: ['vue'],
    Angular: ['@angular/core'],
    Svelte: ['svelte'],
    'Next.js': ['next'],
    Vite: ['vite'],
    'Tailwind CSS': ['tailwindcss'],
    Redux: ['redux', '@reduxjs/toolkit'],
  },
  Backend: {
    Express: ['express'],
    NestJS: ['@nestjs/core'],
    Fastify: ['fastify'],
    Koa: ['koa'],
    'Node.js': ['*'], // implied by presence of package.json, added separately
  },
  Database: {
    MongoDB: ['mongodb'],
    Mongoose: ['mongoose'],
    PostgreSQL: ['pg', 'postgres'],
    MySQL: ['mysql', 'mysql2'],
    SQLite: ['sqlite3', 'better-sqlite3'],
    Prisma: ['@prisma/client', 'prisma'],
    Redis: ['redis', 'ioredis'],
  },
  Other: {
    TypeScript: ['typescript'],
    'Socket.io': ['socket.io'],
    JWT: ['jsonwebtoken'],
    GraphQL: ['graphql'],
    Jest: ['jest'],
    Docker: [],
  },
};

function findPackageJsonFiles(files) {
  return files.filter((f) => f.path.split('/').pop() === 'package.json' && !f.path.includes('node_modules') && f.content);
}

/**
 * Detects technologies primarily from package.json dependencies, plus a
 * few file-presence signals (Dockerfile, requirements.txt, go.mod, etc.).
 */
function analyzeTechStack(files) {
  const detected = { Frontend: new Set(), Backend: new Set(), Database: new Set(), Other: new Set() };
  const allDeps = new Set();

  for (const pkgFile of findPackageJsonFiles(files)) {
    try {
      const json = JSON.parse(pkgFile.content);
      const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
      Object.keys(deps).forEach((d) => allDeps.add(d));
    } catch {
      // malformed package.json — skip without crashing the analysis
    }
  }

  for (const [category, entries] of Object.entries(PACKAGE_SIGNATURES)) {
    for (const [name, pkgNames] of Object.entries(entries)) {
      if (pkgNames.some((p) => allDeps.has(p))) {
        detected[category].add(name);
      }
    }
  }

  if (findPackageJsonFiles(files).length > 0) {
    detected.Backend.add('Node.js');
  }

  const presenceChecks = [
    { pattern: /(^|\/)Dockerfile$/, label: ['Other', 'Docker'] },
    { pattern: /(^|\/)docker-compose\.ya?ml$/, label: ['Other', 'Docker Compose'] },
    { pattern: /(^|\/)requirements\.txt$/, label: ['Backend', 'Python'] },
    { pattern: /(^|\/)go\.mod$/, label: ['Backend', 'Go'] },
    { pattern: /(^|\/)pom\.xml$/, label: ['Backend', 'Java / Maven'] },
    { pattern: /(^|\/)composer\.json$/, label: ['Backend', 'PHP / Composer'] },
    { pattern: /\.tsx?$/, label: ['Other', 'TypeScript'] },
  ];
  for (const check of presenceChecks) {
    if (files.some((f) => check.pattern.test(f.path))) {
      detected[check.label[0]].add(check.label[1]);
    }
  }

  const result = {};
  for (const [category, set] of Object.entries(detected)) {
    result[category] = Array.from(set).sort();
  }
  return result;
}

module.exports = { analyzeTechStack };
