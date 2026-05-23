# Helios

> A multi-agent system that audits, rewrites, and verifies its own fixes
> against synthesized tests before showing them to you.

Scientific Python is full of **silent bugs** — numerical cancellation,
off-by-one in loops, unit mismatches, broken boundary conditions. They
don't crash. They produce results that look right and are wrong. The
Reinhart-Rogoff Excel error influenced global austerity policy. Helios
catches bugs like that one.

```
[10:23:01] auditor  · scanning mc_2deg_thermo_init.py (196 LOC)…
[10:23:03] auditor  ! LLM pass: 3 silent bugs (numerical cancellation,
                      hardcoded factor, no tests)
[10:23:06] fixer    · fix #1 · extracting MetropolisSampler class…
[10:23:09] verifier · synthesizing 12 test inputs from issue specs…
[10:23:12] verifier ✗ 8/12 passed → 4 boundary failures
[10:23:13] verifier ! rejecting fix #1 · regenerating with hint
[10:23:14] fixer    · fix #2 · applying Kahan compensated summation
[10:23:17] verifier ✓ 12/12 passed (rtol=1e-9) · analytical match
[10:23:19] router   ✓ GPU candidate: inner Metropolis loop (60-180×)
```

## The agents

| Agent | Role |
|---|---|
| **Auditor** | Static pass (`ast` / `libcst`) + Gemini LLM pass for silent scientific bugs. Output: ranked issue list. |
| **Fixer** | Regenerates the file applying one bug fix at a time. Returns full new source + diff summary. |
| **Verifier** | Synthesizes 12 test inputs from each issue spec, runs original vs. fix in a sandbox (or via the managed-agent backend), compares at `rtol=1e-9`. **Rejects bad fixes and signals the Fixer to regenerate** — the differentiating moment. |
| **Router** | Pattern-matches hot loops to GPU and (forecast) quantum candidates. |

## Repo layout

```
.
├── backend/    FastAPI service: audit / fix / verify / route / live / demo
├── web/        Next.js 14 reviewer app (App Router, static export)
└── Dockerfile  Single-service build that bundles backend + exported frontend
```

## The demo

```bash
# Backend (terminal 1)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # set GEMINI_API_KEY
uvicorn helios.main:app --reload

# Frontend (terminal 2)
cd web
npm install
npm run dev
```

Open <http://localhost:3000/app/demo>. The six-act walkthrough runs
against a Monte Carlo 2D-electron-gas simulator with a known silent bug
(catastrophic cancellation in the variance reduction biases the heat
capacity ~0.3% against the analytical Fermi-Dirac solution). The agent
activity panel on the right streams the multi-agent flow in real time.

The demo is **deterministic** — payloads + timing are canned (`backend/
helios/demo/fixtures/payloads.py`) so the live demo doesn't depend on
LLM latency or network conditions.

## Highlights

**Verifier-catches-bad-fix.** The Verifier rejects the Fixer's first
attempt (8/12 passing) and asks for a regeneration with a compensation
hint. The second attempt passes 12/12. Both attempts render side-by-side
in the demo's verify act — the single most differentiating moment.

**Wrong-vs-correct visualization.** `backend/helios/demo/fixtures/
wrong_vs_correct_viz.py` renders the silent ~0.3% Cv bias against the
analytical curve. ASCII by default (no deps); `python -m
helios.demo.fixtures.wrong_vs_correct_viz out.png` for matplotlib.

**Two Verifier backends.** `VERIFIER_BACKEND=subprocess` runs the
sandboxed local path (`RLIMIT_*`, wall-clock cap, `numpy.allclose`
compare). `VERIFIER_BACKEND=managed_agent` (default) delegates to a
Gemini managed-agent (`gemini-3.5-flash`) that runs both implementations
and returns a structured JSON verdict. Subprocess is the automatic
fallback on any managed-agent failure.

**Live coding endpoint.** Stateless interactive audit: per-token rate
limit, in-flight dedup so duplicate keystrokes share one LLM call,
response cache.

## Status

| Component | State |
|---|---|
| Backend API | implemented, tests pass |
| Sandboxed verification | implemented (Linux supported, macOS best-effort) |
| Managed-agent verifier | implemented (`google-genai`, default backend) |
| Frontend reviewer UI | implemented (`/`, `/session`, `/sessions`) |
| Guided demo (`/app/demo`) | implemented — six-act walkthrough |
| Agent activity panel | implemented — deterministic SSE, color-coded |
| Verifier-catches-bad-fix moment | implemented — side-by-side diff render |
| Live coding (`/app/live`) | implemented — stateless SSE audit |
| GPU routing | implemented — pattern-based candidate detection |
| Quantum routing | scheduling demo (immune filter + ATC) |
| Deploy | single Railway service serving `/api/*`, `/`, and `/app/*` |

## Tests

```bash
cd backend && pytest
```

End-to-end smoke (Playwright):

```bash
cd web && npm run smoke
```

## API

`backend/helios/schemas.py` (Pydantic) is the source of truth. The
frontend mirrors these in `web/lib/types.ts` and `web/lib/demo.ts`.
Detailed endpoint docs live in `backend/README.md`.

Demo-mode endpoints (canned, deterministic, no LLM/sandbox):

| Path | Returns |
|---|---|
| `POST /api/demo/sessions` | session metadata |
| `GET  /api/demo/audit` | 7-issue audit |
| `GET  /api/demo/fix/attempts` | both fix attempts (v1 rejected, v2 accepted) |
| `GET  /api/demo/verify/stream` | two-attempt SSE: 8/12 → reject → 12/12 |
| `GET  /api/demo/agent_activity/stream` | full multi-agent event log (SSE) |
| `GET  /api/demo/intro` | hook + Reinhart-Rogoff reference |
| `GET  /api/demo/closing` | closing card text |
| `GET  /api/demo/route` | hardware routing recommendations |

## Stack

- **Backend.** Python 3.11+, FastAPI, Pydantic v2, SQLModel, Postgres
  (SQLite in dev), `google-genai`, sandboxed subprocess execution with
  `RLIMIT_*`.
- **Frontend.** Next.js 14 App Router (static export, `basePath="/app"`),
  TypeScript, Monaco editor, custom diff renderer. Single-accent
  (amber) dark palette; everything else monochrome.

## Deploy

Top-level `Dockerfile` builds the Next.js export and bundles it into the
backend image. One Railway service hosts everything; CORS is same-origin
in production. To run the frontend on a separate origin (e.g. Vercel),
broaden `allow_origins` in `backend/helios/main.py`.

## Out of scope (MVP)

Languages other than Python, multi-file projects, real on-hardware
quantum execution, auth / billing, GitHub PR integration, formal
verification.
