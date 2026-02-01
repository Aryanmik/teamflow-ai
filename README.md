# TeamFlow AI

TeamFlow AI is a FastAPI + Celery + Redis + React (Vite) MVP that runs a multi-agent workflow (PM → Tech → QA → Principal Engineer → Reviewer) to produce exportable planning artifacts.

Notes:
- The repo also contains legacy Django files (`manage.py`, `teamflow_ai/`) but the **current MVP flow is the FastAPI app** under `teamflow_fastapi/`.
- Agent collaboration “back-and-forth” is visible in **server logs** (Celery worker logs), not via a transcript endpoint.

## Prerequisites

- Python (recommended: the version you use for `.venv/`; typically 3.9+)
- Redis running locally (or set `REDIS_URL`)
- Node.js + npm (for the UI under `client/`)

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configure Environment

This project reads environment variables from `.env` at repo root.

Required:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default in this repo: `gpt-5.2`)

Example `.env`:

```bash
REDIS_URL=redis://localhost:6379/0
REDIS_TTL_SECONDS=21600

OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-5.2
OPENAI_TEMPERATURE=0.2
OPENAI_AGENT_MAX_TURNS=12

# Orchestration
REVIEW_ENABLED=true
TEAMFLOW_REVISION_CYCLES=1

# SSE / UI
SSE_STREAM_TIMEOUT_SECONDS=60
SSE_POLL_INTERVAL_SECONDS=1.0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Logging (conversation visibility is in logs)
OPENAI_AGENTS_VERBOSE_LOGS=false
OPENAI_AGENTS_TRACE=false
TEAMFLOW_LOG_AGENT_PAYLOADS=true
TEAMFLOW_LOG_MAX_CHARS=4000
TEAMFLOW_AGENT_LOG_LEVEL=INFO

# Live workflow (SSE) agent metadata events (no transcript content by default)
TEAMFLOW_SSE_AGENT_EVENTS=true
TEAMFLOW_SSE_AGENT_PREVIEW_CHARS=0
```

## Run Redis

If you don’t already have Redis running, start it via your preferred method (Homebrew, Docker, etc.).

## Run the Backend (FastAPI)

```bash
source .venv/bin/activate
uvicorn teamflow_fastapi.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend health:

```bash
curl http://127.0.0.1:8000/health
```

## Run the Worker (Celery)

In another terminal (same venv):

```bash
source .venv/bin/activate
celery -A teamflow_fastapi.celery_app.celery_app worker --loglevel=INFO --concurrency=1
```

## Run the Frontend (React / Vite)

In another terminal:

```bash
cd client
npm install
npm run dev
```

UI:
- http://localhost:5173

The Workflow Runner can:
- Start a multi-agent run
- Regenerate steps
- Fetch Markdown export
- Download an `.ipynb` notebook export

## CLI (teamflow start)

There is a lightweight CLI script at the repo root named `teamflow`.

From the repo root:

```bash
./teamflow start --idea "Build a weather app for web and iOS."
```

Options:
- `--file path/to/idea.txt` (read idea from a file)
- `--no-wait` (return immediately after creating the run)
- `--export out.md` (save the final Markdown export)

To make `teamflow` available globally:

```bash
export PATH="$PATH:$(pwd)"
```

Or symlink it somewhere on your PATH:

```bash
ln -s "$(pwd)/teamflow" /usr/local/bin/teamflow
```

You can also point the CLI at a different API:

```bash
TEAMFLOW_API_URL=http://127.0.0.1:8000 ./teamflow start --idea "..."
```

## Smoke Test (API)

With the API + worker running:

```bash
.venv/bin/python scripts/smoke_api.py
```

Environment overrides:

```bash
TEAMFLOW_SMOKE_TIMEOUT_SECONDS=300 .venv/bin/python scripts/smoke_api.py
TEAMFLOW_API_URL=http://127.0.0.1:8000 .venv/bin/python scripts/smoke_api.py
```

## Where To See Agent Collaboration Logs

Agent back-and-forth (including revision cycles) is logged by the worker:

- `logs/celery.log`

Look for lines like:

```text
ORCH iteration=0 from=Orchestrator to=QA Engineer step=qa ...
ORCH iteration=0 from=Orchestrator to=Principal Engineer step=principal ...
ORCH iteration=1 from=Orchestrator to=Tech Lead step=tech reason=Revise ...
```

## Orchestration Design Doc

See `HUB_SPOKE_ORCHESTRATION.md` for the hub-and-spoke flow and revision loop details.
