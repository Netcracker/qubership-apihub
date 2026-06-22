# Local development

Node.js **>= 24** is required (`engines` in the repository root `package.json`).

## Recommended: proxy mode (real APIHUB)

**Default setup for Portal UI work.** Vite serves the frontend with HMR and forwards `/api`, `/playground`, and `/ws/v1` to a real APIHUB instance.

1. Set `proxyServer` in `packages/portal/vite.config.ts` to your APIHUB URL (default: `https://qubership-apihub.localtest.me`).
2. From `packages/portal`: `npm run proxy`.
3. Open the Vite URL from the terminal (typically `http://localhost:5173`, opens `/login`).

No local mock server is required for this workflow.

## Optional: mixed mode (proxy + local mock)

Use when you develop or test **mock-only** API routes while the rest of the Portal talks to the real backend.

1. Configure `proxyServer` as in proxy mode.
2. `npm run dev:backend` (mock on `http://localhost:3003`; override port with `NODEJS_PORT`).
3. `npm run proxy` in a second terminal.
4. For each prefix that should hit the mock, add a `server.proxy` entry with `target: devServer` **before** the catch-all `/api` rule. See [portal-mock-server.md](./portal-mock-server.md#vite-proxy-viteconfigts) for the Vite example and mock API reference.

## Full mock mode (not supported for Portal today)

`npm run dev:portal`, or `dev:backend` + `dev:frontend` with all `/api` traffic pointed at the mock, **does not yield a working Portal** at the moment. Most product flows need a real APIHUB backend.

## Preview mode (production build + proxy)

From `packages/portal`:

```bash
npm run preview
```

Builds the Portal and serves the production bundle via `vite preview` in proxy mode (same `proxyServer` as `npm run proxy`).

## Portal scripts

| Script (in `packages/portal`)  | Typical use                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `proxy`                        | **Recommended** - real APIHUB (incl. AI Assistant)                  |
| `dev:backend` + `proxy`        | Mixed mode - mock for selected `/api` prefixes only                 |
| `dev:backend` + `dev:frontend` | Full mock - **not supported** for Portal                            |
| `preview`                      | Production build + proxy                                            |
| `test:server`                  | Jest + supertest against in-process `createApp()` (no running mock) |

## Agent UI

From the repository root:

```bash
npm run dev:agents
```

Starts the Agent package mock backend and frontend (Lerna scope `@netcracker/qubership-apihub-ui-agents`).

## Building locally

Add a GitHub PAT with `read:packages` to `.npmrc` (private `@netcracker` packages):

```ini
@netcracker:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=ghp_XYZ
always-auth=true
```

```bash
npm install
npm run build
podman build -f Dockerfile.local .
```
