# Client (UI) — teamflow-ai

This folder contains a minimal React + Vite app intended as a starting point for the project's UI.

Prerequisites
- Node.js 16+ (use nvm to manage versions)
- npm or yarn

Quick start (development)

1. Change into the client folder:

```bash
cd client
```

2. Install dependencies:

```bash
npm install
# or
# yarn
```

3. Start the dev server (Vite):

```bash
npm run dev
```

The dev server runs on http://localhost:5173 by default. For local development you'll typically run the Django server (on 8000) and the client dev server (5173) concurrently. Configure API endpoints to point at `http://127.0.0.1:8000` or add proxy rules to Vite if needed.

Build for production

```bash
npm run build
```

This emits a production bundle under `client/dist/`. If you want Django to serve these built assets, copy the `dist/` files into your Django static files directory or configure `collectstatic` accordingly.

Notes
- This is a minimal scaffold to get started. Add routing, state management, API clients, and types as needed.
