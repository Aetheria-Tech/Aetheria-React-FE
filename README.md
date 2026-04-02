# Aetheria Frontend

React + Vite frontend for Aetheria.

## What This README Covers

This guide is for local frontend startup after cloning the repository.
It is not a zero-config setup. You still need the backend server and its environment variables to be prepared separately.

## Prerequisites

- Node.js 20+
- npm
- Backend server running on `http://localhost:8080`

## Local Setup

1. Clone the repository and move into the frontend root.
2. Create the local frontend env file from the example.

```powershell
Copy-Item .env.example .env.local
```

3. Install packages.

```powershell
npm install
```

4. Start the frontend dev server.

```powershell
npm run dev
```

## Fixed Frontend Port

The Vite dev server is fixed to `http://localhost:5173`.

- `strictPort: true` is enabled.
- If port `5173` is already in use, Vite will fail immediately.
- Vite will not silently move to `5174`, `5175`, or another port.

This is required because the OAuth login callback depends on the frontend origin staying stable.

## Required Frontend Env

The frontend reads values from `.env.local`.

Current minimum example:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK_API=false
VITE_DEV_BYPASS_AUTH=false
```

## Backend Alignment

For OAuth login to work, the backend must use the same frontend origin:

```env
FRONTEND_DOMAIN=http://localhost:5173
```

If the backend redirects to a different port, the login callback can land on:

- a missing page
- another local app
- a frontend server that is not running

That usually appears as a `404` after login or as a broken callback flow.

## Common Problems

### 1. Login redirects to the wrong local port

Cause:
- The frontend is not running on `5173`
- or the backend `FRONTEND_DOMAIN` does not match `http://localhost:5173`

Fix:
- Make sure `npm run dev` starts on `5173`
- Make sure the backend env uses `FRONTEND_DOMAIN=http://localhost:5173`

### 2. Port 5173 is already in use

Symptom:
- Vite fails to start instead of choosing another port

Why:
- This is expected because `strictPort: true` is enabled

Fix:
- Stop the process using `5173`
- then run `npm run dev` again

### 3. API requests fail immediately

Check these first:
- the backend server is running on `http://localhost:8080`
- `.env.local` contains `VITE_API_BASE_URL=http://localhost:8080`
- the backend CORS/env settings still match the frontend origin

## Preview

The preview server is fixed to `http://localhost:4173`.

## Related Docs

- [BACKEND_INTEGRATION_PREP.md](./BACKEND_INTEGRATION_PREP.md)
