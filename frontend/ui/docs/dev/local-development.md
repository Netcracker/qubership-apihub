# Local development

Node.js **>= 24** is required (`engines` in the repository root `package.json`).

## Recommended: proxy mode (real APIHUB)

**Default setup for Portal UI work.** Vite serves the frontend with HMR and forwards `/api`, `/playground`, and `/ws/v1` to a real APIHUB instance.

1. Set `proxyServer` in `packages/portal/vite.config.ts` to your APIHUB URL (default: `https://qubership-apihub.localtest.me`).
2. From the workspace root, build the Portal once: `pnpm install`, then `pnpm exec nx build ui-portal`. The dev
   server loads the other workspace packages, such as api-processor, from their `dist/` directories.
3. From `packages/portal`: `pnpm dev:proxy`.
4. Open the Vite URL from the terminal (typically `http://localhost:5173`, opens `/login`).

No local mock server is required for this workflow.

## Proxy mode with MSW mocks

`pnpm dev:proxy:msw` starts proxy mode with the [MSW mocks](./msw-mocks.md): handlers in the browser change or
replace selected backend responses, and every other request reaches the real APIHUB. MSW is the main way to mock the
backend; add new mocks there.

## Deprecated: mixed mode (proxy + Express mock)

The Express mock server is deprecated, and its routes will move to [MSW](./msw-mocks.md). Use it only for a route
that MSW does not mock yet, while the rest of the Portal talks to the real backend.

1. Configure `proxyServer` as in proxy mode.
2. `pnpm dev:backend` (mock on `http://localhost:3003`; override port with `NODEJS_PORT`).
3. `pnpm dev:proxy` in a second terminal.
4. For each prefix that should hit the mock, add a `server.proxy` entry with `target: devServer` **before** the catch-all `/api` rule. See [portal-mock-server.md](./portal-mock-server.md#vite-proxy-viteconfigts) for the Vite example and mock API reference.

## Deprecated: full mock mode (not supported for Portal)

`dev:backend` + `dev:frontend` with all `/api` traffic pointed at the Express mock **does not yield a working Portal**.
Most product flows need a real APIHUB backend.

## Preview mode (production build + proxy)

From `packages/portal`:

```bash
pnpm preview
```

Builds the Portal and serves the production bundle via `vite preview` in proxy mode (same `proxyServer` as
`pnpm dev:proxy`).

## Portal scripts

| Script (in `packages/portal`)  | Typical use                                                         |
| ------------------------------ | ------------------------------------------------------------------- |
| `dev:proxy`                    | **Recommended** - real APIHUB (incl. AI Assistant)                  |
| `dev:proxy:msw`                | Proxy mode with the [MSW mocks](./msw-mocks.md)                     |
| `dev:backend` + `dev:proxy`    | Deprecated mixed mode - Express mock for selected `/api` prefixes   |
| `dev:backend` + `dev:frontend` | Deprecated full Express mock - **not supported** for Portal         |
| `preview`                      | Production build + proxy                                            |
| `test:server`                  | Jest + supertest against in-process `createApp()` (no running mock) |

## Agent UI

From `packages/agents`, `pnpm dev:proxy` and `pnpm dev:proxy:msw` work as in the Portal, with the `proxyServer` of
`packages/agents/vite.config.ts`.

The deprecated Express mock backend of the Agent UI runs in two terminals:

```bash
pnpm dev:backend
```

```bash
pnpm dev:frontend
```

## Building locally

No `.npmrc` and no GitHub PAT are needed any more. The image is built from output you have
already built, not from packages fetched at image-build time, so nothing contacts a registry.

Install once at the workspace root, build the two apps, then build the image from this
directory:

```bash
pnpm install
pnpm exec nx run-many -t build --projects=ui-portal,ui-agents
cd frontend/ui && podman build -f Dockerfile.local .
```

Unchanged upstream projects are cache restores rather than rebuilds, so the second and later
builds are fast.

`Dockerfile.local` takes this directory as its context; `Dockerfile` takes the workspace root
and is what CI builds. They differ only in where the inputs come from.
