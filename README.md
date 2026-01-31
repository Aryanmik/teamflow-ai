# teamflow-ai

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