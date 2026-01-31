# teamflow-ai

This repo currently contains a FastAPI + Celery + Redis MVP scaffold for TeamFlow AI. The Django files are present but not used for the FastAPI flow.

## Prerequisites
- Python 3.10+
- Redis running locally (or set `REDIS_URL`)

## Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run the API
```bash
uvicorn teamflow_fastapi.main:app --reload
```

## Run the worker
In another terminal (with the same venv activated):
```bash
celery -A teamflow_fastapi.celery_app.celery_app worker --loglevel=INFO
```

## Optional environment variables
```bash
export REDIS_URL=redis://localhost:6379/0
export REDIS_TTL_SECONDS=21600
export REVIEW_ENABLED=false
export SSE_STREAM_TIMEOUT_SECONDS=60
export SSE_POLL_INTERVAL_SECONDS=1.0
export OPENAI_API_KEY=your-key-here
export OPENAI_MODEL=gpt-4o-mini
export OPENAI_TEMPERATURE=0.2
export OPENAI_MAX_RETRIES=2
export OPENAI_RETRY_BACKOFF_SECONDS=2.0
```

## Test the flow
```bash
curl -X POST http://127.0.0.1:8000/runs \
  -H 'Content-Type: application/json' \
  -d '{"idea":"A multi-agent app that produces a PRD and architecture."}'
```

Then check status:
```bash
curl http://127.0.0.1:8000/runs/<run_id>
```

Export Markdown (after completion):
```bash
curl http://127.0.0.1:8000/runs/<run_id>/export?format=md
```

A small Django-based project providing AI-driven collaboration utilities.

## Table of contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick start (macOS / zsh)](#quick-start-macos--zsh)
- [Development workflow](#development-workflow)
- [Scripts](#scripts)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Overview

This repository contains a Django project called `teamflow_ai` (see `manage.py` and the `teamflow_ai/` package). The app uses SQLite by default and the project dependencies are pinned in `requirements.txt`.

This README focuses on setting up a Python virtual environment, installing dependencies, running migrations, and starting the development server on macOS with `zsh`.

## Prerequisites

- Python 3.8+ (install using your OS package manager or `pyenv` / `homebrew`)
- Git
- zsh (default on modern macOS)

The project includes `requirements.txt` with Django 4.2.x.

## Quick start (macOS / zsh)

1. Clone the repository and change into it:

```bash
git clone <repo url here>
cd teamflow-ai
```

2. Create and activate a virtual environment (recommended location: `.venv`):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Upgrade pip and install Python dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

4. Apply database migrations and create a superuser (optional):

```bash
python manage.py migrate
python manage.py createsuperuser  # optional
```

5. Run the development server:

```bash
python manage.py runserver
```

Open http://127.0.0.1:8000 in your browser.

If you prefer an automated helper, see `scripts/setup_venv.sh` for a small setup script.

## Development workflow

- Create feature branches from `main`: `git checkout -b feat/your-feature`
- Run linters and tests before opening PRs (add or adapt commands for your tooling)
- Keep secrets out of the repo: store API keys in a `.env` file or in your CI secrets

## Scripts

- `scripts/setup_venv.sh` — create `.venv` and install dependencies (run with `bash` or make executable)

## Client (UI) setup

The repository includes a minimal React frontend scaffold under `client/` to build the user interface.

Quick start for the client:

```bash
# from project root
cd client
npm install
npm run dev
```

Dev server: http://localhost:5173

For local development run the Django server (default: `127.0.0.1:8000`) and the Vite dev server concurrently. For production, run `npm run build` in `client/` and copy the resulting `dist/` files into your Django static files or configure your deployment to serve them.


## Testing

Add project tests as needed. Run tests with your test runner (e.g., `pytest` or Django's `manage.py test`) depending on which tooling you add.

## Contributing

Contributions are welcome. Please open issues for major proposals and submit focused PRs for changes.

## License

Add a `LICENSE` file to declare the project license (for example, MIT).

---

If anything in these instructions needs to be adapted to your preferred workflow (e.g., `pyenv`, `pipx`, or containerized setups), I can add alternate steps.
