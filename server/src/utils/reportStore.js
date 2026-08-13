const { ANALYSIS_TTL_MS } = require('../config/constants');

// Kept deliberately simple and in-memory: v1 is stateless by design (no DB).
// Reports expire on their own after ANALYSIS_TTL_MS so memory doesn't grow forever.
const store = new Map(); // id -> { report, expiresAt }

function save(id, report) {
  store.set(id, { report, expiresAt: Date.now() + ANALYSIS_TTL_MS });
}

function get(id) {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(id);
    return null;
  }
  return entry.report;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now > entry.expiresAt) store.delete(id);
  }
}, 1000 * 60 * 10).unref();

module.exports = { save, get };
