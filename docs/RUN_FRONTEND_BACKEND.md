# Run Frontend and Backend Locally

This guide runs the **web frontend** and **backend API** together for local development.

## Prerequisites

- Node.js and npm installed
- PostgreSQL and Redis running locally (recommended for full backend behavior)
- From repo root: `D:\Dev\conspiracy\cyxtrade\cyxtrade`

## 1. Start Backend (port 3000)

```powershell
cd backend
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

Expected health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
```

You should get HTTP `200` and JSON like:

```json
{"status":"ok","timestamp":"..."}
```

### Notes from local run

- Backend dev server runs via `nodemon --exec ts-node src/index.ts`, so the `npm.cmd run dev` command spawns `ts-node`.
- Logs (stdout/stderr) were redirected to `.runlogs/backend-dev.{out,err}.log` so you can inspect failures; sandboxed runs may hit `spawn EPERM`, so run the command directly in a normal PowerShell session if that happens.
- If the health check fails, double-check `.env` values plus that local PostgreSQL/Redis are reachable.

## 2. Start Web Frontend (port 5173)

Open a second terminal:

```powershell
cd web
npm.cmd install
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

Open:

- `http://127.0.0.1:5173`

## How frontend connects to backend

- Vite proxy forwards `/api/*` to `http://localhost:3000` via `web/vite.config.ts`.
- Backend routes are served under `/api/*` (for example `/api/auth/challenge`).

## Common issue: "Server returned non-JSON response..."

This usually means backend is not running or not reachable on `http://localhost:3000`.

Quick checks:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173
```

If PowerShell blocks `npm` scripts (`npm.ps1` execution policy error), use `npm.cmd` as shown above.

### Notes from local run

- Vite loads `web/vite.config.ts`; sandboxed execution reported `spawn EPERM` from `esbuild`, so run the dev server in a normal shell when possible.
- Vite proxies `/api/*` to `http://localhost:3000`, so enable the backend before opening `http://127.0.0.1:5173`.

## Stop servers

- In each terminal, press `Ctrl+C`.
