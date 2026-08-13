# 🕵️ Codebase Detective

Analyze your codebase. Find hidden complexity. Understand your architecture.

Codebase Detective is a full-stack developer tool that takes a project — a
ZIP upload or a public GitHub repo URL — and
produces an interactive report: structure, dependencies, architectural
risks, suspicious files, git history, and codebase statistics — all computed
deterministically from the actual source, with no AI in the analysis loop.

---

## Features

- **File & language breakdown** — line counts, sizes, language distribution
- **Dependency graph** — real import resolution, visualized with React Flow (zoom, pan, minimap, search)
- **Most connected modules** — which files the rest of the project depends on most
- **Circular dependency detection** — DFS-based cycle detection over the import graph
- **Potential god object detection** — multi-signal heuristic (size + functions + imports + methods), never a single-number verdict
- **Large file detection** — configurable thresholds (Healthy / Normal / Large / Very Large)
- **Possibly-unused file detection** — files with zero internal references, excluding conventional entry points
- **Duplicate code detection (v1)** — normalized snippet matching across files; designed to be swapped for AST-based similarity later
- **Code complexity** — rough cyclomatic complexity per file, bucketed as an indicator, not a judgment
- **Architecture detection** — infers MVC / layered / feature-based / component patterns from folder structure
- **Tech stack detection** — parsed from `package.json`, `requirements.txt`, `go.mod`, `Dockerfile`, etc.
- **Git history** — churn, most-changed files, and contributor activity, whenever `.git` is present
- **Transparent health score** — starts at 100, itemized deductions, never a random number
- **Centralized Problems view** — every finding in one severity-graded list (Critical / High / Medium / Low)
- **Real progress, not a fake timer** — analysis stage updates stream over Server-Sent Events as each stage actually starts server-side
- **Two ways in** — ZIP upload or a public GitHub URL

## Architecture

```
codebase-detective/
├── client/              React + Vite + Tailwind dashboard
│   └── src/
│       ├── pages/        Landing, Upload (ZIP + GitHub tabs), Report, NotFound
│       ├── components/   shared UI + per-section report views (incl. Git History)
│       ├── layouts/       dashboard shell + sidebar nav
│       └── services/     API client (upload, GitHub, SSE progress subscription)
│
├── server/               Node + Express analysis engine
│   └── src/
│       ├── services/
│       │   ├── scanner/          walks the extracted project
│       │   ├── parser/           Babel AST parsing (imports, exports, complexity)
│       │   ├── analyzer/         files, imports, dependencies, architecture, tech stack, metrics, git history
│       │   ├── detectors/        circular deps, god objects, large files, unused files, complexity, duplicates
│       │   ├── engine.js         orchestrates the full pipeline
│       │   ├── githubCloner.js   validated, sandboxed shallow clone of a public repo
│       │   ├── healthScore.js
│       │   └── problemsBuilder.js
│       ├── middleware/upload.js  secure ZIP extraction (path-traversal/zip-bomb guarded)
│       ├── utils/jobStore.js     tracks in-flight analysis jobs for SSE progress
│       └── controllers / routes  REST API
```

The analysis engine is source-agnostic by design: it operates on an
extracted directory on disk and doesn't know or care whether that directory
came from a ZIP upload or a cloned GitHub repo.

### Pipeline

```
analyzeProject(rootDir)
  → scanFiles()
  → parseFiles()            (Babel AST, per file, never crashes the batch)
  → buildDependencyGraph()  (resolve relative imports to real files)
  → runAnalyzers()          (files, architecture, tech stack, metrics)
  → runDetectors()          (large files, circular deps, god objects, unused, complexity, duplicates)
  → calculateHealthScore()  (itemized deductions from the same findings shown in Problems)
  → analyzeGitHistory()     (opportunistic — runs only if rootDir has a .git dir)
  → report
```

Each stage is followed by an event-loop yield (`setImmediate`), so when a
web request calls `analyzeProject` with an `onStage` callback, progress
pushed over SSE reflects real stage transitions as they happen — not a
client-side timer standing in for them.

## Tech Stack

**Frontend:** React, Vite, React Router, Axios, Tailwind CSS, Lucide React, Recharts, React Flow, native EventSource for SSE
**Backend:** Node.js, Express, Multer, AdmZip, fast-glob, `@babel/parser` + `@babel/traverse`, `simple-git`, Helmet, CORS, express-rate-limit
**Testing:** Jest, Supertest
**Ops:** GitHub Actions CI

## Installation

Requires Node.js 18+ (20+ recommended) and `git` on `PATH` (needed for GitHub
repo analysis and git history — not required for plain ZIP analysis).

```bash
# Backend
cd server
npm install
npm run dev      # http://localhost:4005

# Frontend (separate terminal)
cd client
npm install
npm run dev       # http://localhost:5173 (proxies /api to :4005)
```

Open `http://localhost:5173`, choose ZIP Upload or GitHub URL, and the
report appears at `/report/:id`.

## Usage

**ZIP:** Zip a project (excluding `node_modules` is fine — it's ignored
either way), drop it on `/analyze`, max 50 MB.

**GitHub:** Paste a public repo URL like `https://github.com/owner/repo` on
the GitHub tab of `/analyze`. The server does a validated, sandboxed shallow
clone (see [Security Model](#security-model)) — nothing from the repo is
ever executed.

In every case: the engine scans, parses, builds the dependency graph, runs
every detector, and (for GitHub-sourced or otherwise git-backed sources)
analyzes history. Reports live in memory for 2 hours; extracted/cloned
source is deleted immediately after analysis completes either way.

## Supported Languages

First-class (full AST analysis): **JavaScript, JSX, TypeScript, TSX**
Counted but not AST-parsed: JSON, CSS, and other text files (lines/size/language only)

The scanner and file model don't assume JS — Python, Go, Java, etc. support
can be added by plugging in additional parsers under `services/parser/`.

## Detection Methodology

Every detector in this tool produces a **heuristic**, not a verdict:

- **Large files** are classified by line count only (<300 Healthy, 300–500 Normal, 500–1000 Large, >1000 Very Large). Large is not automatically bad.
- **Potential god objects** require multiple independent red flags (size *and* function count *and* import/fan-out *and/or* method density) before being flagged at all.
- **Possibly unused files** are files with zero internal references, excluding conventional entry points (`index.*`, `main.*`, `server.*`, `app.*`, config files). They may still be real entry points, dynamically imported, or invoked externally.
- **Duplicate code** (v1) uses normalized 6-line sliding-window text matching across files — a fast, simple starting point that's meant to be replaced by AST-based similarity in a later pass.
- **Complexity** is a rough cyclomatic-complexity approximation (decision-point counting), bucketed as Low/Moderate/High/Very High.
- **Git history** (churn, most-changed files, contributors) is opportunistic: it only appears when the analyzed source actually has a `.git` directory, bounded to the 500 most recent commits.

No result is hardcoded. Nothing is generated by an AI model — the core
analysis is fully deterministic and runs entirely from parsed source.

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analysis/upload` | Upload a ZIP (`multipart/form-data`, field `project`) → `{ success, jobId }` |
| POST | `/api/analysis/github` | `{ url: "https://github.com/owner/repo" }` → `{ success, jobId, repo }` |
| GET | `/api/analysis/progress/:jobId` | SSE stream of real stage events; ends with a `done` event carrying `analysisId`, or an `error` event |
| GET | `/api/analysis/:id` | Full report |
| GET | `/api/analysis/:id/files` | File table data |
| GET | `/api/analysis/:id/dependencies` | Dependency graph + most-connected modules |
| GET | `/api/analysis/:id/problems` | Centralized problems list |
| GET | `/api/analysis/:id/metrics` | Code metrics summary |

Both upload paths return immediately after the source is extracted/cloned;
the client subscribes to `/api/analysis/progress/:jobId` for real stage
progress and receives the `analysisId` once analysis actually finishes.

## Security Model

Uploaded/cloned projects are treated as **strictly untrusted source**:

- 50 MB ZIP limit, 300 MB extracted-size limit, 20,000 entry-count limit
- Zip-slip / path-traversal protection on every ZIP entry
- Individual file size cap (5 MB) — oversized files are skipped, not fatal
- GitHub URLs are validated against a strict `github.com/owner/repo` pattern; the raw user string is **never** passed to `git` — only a URL reconstructed from the matched owner/repo, which closes off argument-injection strings like `--upload-pack=...`
- GitHub clones are `https`-only, depth-limited, single-branch, hook-disabled (`core.hooksPath=/dev/null`), credential-prompt-disabled (fail fast on private/nonexistent repos instead of hanging), size-capped post-clone, and time-boxed (SIGKILL on timeout)
- `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, and similar directories are never scanned
- Uploaded/cloned code is **never executed** — no `npm install`, no package scripts, no shell commands against project contents
- Extracted/cloned source is deleted immediately after analysis, success or failure
- Upload and GitHub endpoints are rate-limited

## Testing

```bash
cd server && npm test   # 102 tests: every analyzer, detector, health score,
                         # problems builder, the full engine against real temp
                         # directories, and the HTTP/SSE API via supertest
```

CI (`.github/workflows/ci.yml`) runs the server test suite and the client
build on every push and PR.

## Roadmap

Phases 1–4 from the original spec are complete. Ideas for what's next:

- AST-based duplicate-code similarity (replacing the v1 sliding-window text match)
- Additional language parsers (Python, Go, Java) plugged into `services/parser/`
- Rename-aware git churn (numstat currently treats a renamed file's old and new paths as separate entries)
- Bundle-size-aware code splitting for the client (the production JS bundle is ~240 KB gzipped, mostly React Flow + Recharts)

## Contributing

Each analyzer and detector lives in its own file under `services/analyzer/`
or `services/detectors/` and is independently testable — no analysis logic
lives inside Express controllers. PRs that add a new detector should follow
the existing pattern: take the parsed file rows (+ dependency graph where
relevant) as input, return plain data, stay conservative about what counts
as a "problem," and add a test file alongside it under `__tests__/`.

## License

MIT — see [LICENSE](./LICENSE).
