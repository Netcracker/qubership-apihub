# Portal mock server

Express-based mock backend that ships alongside the portal frontend so feature work can proceed without waiting on the real APIHUB backend. The server currently listens on `http://localhost:3003` (override via `NODEJS_PORT`).

## Commands

From `packages/portal`:

- `npm run dev:backend` - start the mock server with nodemon (auto-reloads on file changes).
- `npm run dev:frontend` - Vite dev server that proxies `/api` to the mock (full mock mode).
- `npm run proxy` - Vite dev server that proxies `/api` to the real backend, except **`/api/v1/ai-chat`** and **`/api/v1/ephemeral-files`**, which are always routed to the local mock (mixed mode; see AI Chat notes below).
- `npm run test:server` - Jest + supertest integration tests for the mock server.

## Two-process dev workflow (recommended during AI Chat development)

When you want a real backend for everything except AI chat and signed file downloads:

1. Start the mock server. It must run on `localhost:3003`:
   ```bash
   npm run dev:backend
   ```
2. In a second shell, start Vite in `proxy` mode:
   ```bash
   npm run proxy
   ```
3. Open the portal in your browser via Vite's address. Non-AI traffic hits the real backend you configured (e.g. `APIHUB_PROXY_URL` in `.env`), while **`/api/v1/ai-chat/**`** and **`/api/v1/ephemeral-files/**`** are intercepted by the Vite proxy and routed to the local mock (see `vite.config.ts`; both entries must appear **before** the generic `/api` rule).

To verify AI traffic is hitting the mock rather than the real backend:

```bash
curl http://<vite-port>/api/v1/ai-chat/chats?limit=1
# => JSON with seeded chats (not an upstream HTML error page)

curl "http://<vite-port>/api/v1/ephemeral-files/11111111-1111-4111-8111-111111111111?token=mock-dev-token"
# => Markdown sample body (debug:files fixture id)
```

If AI responses look like an APIHUB backend error envelope or HTML from the wrong host, the proxy rules for `/api/v1/ai-chat` and `/api/v1/ephemeral-files` are either missing or declared after the generic `/api` rule in `vite.config.ts` - Vite matches the first registered prefix.

## AI Chat endpoints (mock)

Under **`/api/v1/ai-chat/`** (mirrors backend contract). Pin limit (**3**) and max user message length (**32000**) are enforced server-side only (not exposed as a separate HTTP resource in OpenAPI).

- `GET /chats` - paginated chat list. Query: `search`, `limit` (default **100**), `before` (ISO date, keyset).
- `POST /chats` - create an empty chat.
- `GET /chats/:id` - fetch one chat.
- `PATCH /chats/:id` - rename (`title`) or pin/unpin (`pinned: boolean`). Pin limit returns `APIHUB-AI-4003`.
- `DELETE /chats/:id`.
- `GET /chats/:id/messages` - newest-first keyset page. Query: `limit` (default **100**), `before`.
- `POST /chats/:id/messages` - non-streaming send. Returns the assistant message directly.
- `POST /chats/:id/messages/stream` - Server-Sent Events stream of the assistant response.

## Generated files (mock)

OpenAPI path (not under `ai-chat`):

- **`GET /api/v1/ephemeral-files/:fileId?token=...`** - signed download mock. Returns a small CSV (or Markdown for the `debug:files` fixture UUID). Query token: use **`mock-dev-token`**, or any `mock-*` token for compatibility with older examples. Missing or invalid token returns `401`, matching the OpenAPI download contract.

### Scripted stream scenarios

`POST /chats/:id/messages/stream` picks a scripted scenario by substring match against the user's message (lower-cased). First match wins; the `debug:*` scenarios are matched before the default so `debug:error` doesn't fall through.

| Substring in `content`   | Scenario  | Purpose                                                                                                         |
| ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------- |
| `debug:http-500`         | (HTTP)    | `500` + `APIHUB-AI-5000` **before** the SSE stream starts (standard `ErrorResponse`, no frames).                |
| `debug:error`            | error     | ~3 deltas then an `error` SSE frame with code `APIHUB-AI-5001`. No `done` frame (per OpenAPI terminal rules).   |
| `debug:truncated-stream` | truncated | `start` + deltas, no `completed` / `done`; UI warning snackbar (incomplete reply). Not `debug:error`.           |
| `debug:links`            | links     | Markdown with internal `/portal/packages/...` package and operation links.                                      |
| `debug:longmd`           | longmd    | Markdown **>= 4000** chars: headings, table, bullets, blockquote, **YAML** + **json** fences.                   |
| `debug:json`             | json      | Default happy-path Markdown but the code block is a JSON snippet instead of YAML.                               |
| `debug:files`            | files     | Completed Markdown links to **`/api/v1/generated-files/{uuid}?token=mock-dev-token`** (Markdown download mock). |
| `debug:thinking`         | thinking  | Long idle gaps + tool frames + mid-answer pause (exercises the Thinking indicator during `started`).            |
| `debug:offtopic`         | offtopic  | Short polite refusal.                                                                                           |
| (none of the above)      | default   | Long Markdown with a YAML code block and a table.                                                               |

### Idempotent send

Pass a UUID `clientMessageId` on `POST /chats/:id/messages` or `POST /chats/:id/messages/stream`. A repeated request with the same ID replays the previously stored assistant response synchronously (no scripted delays). Used by the frontend to survive transient network failures without double-billing.

### Magic file IDs

`GET /api/v1/ephemeral-files/:ID` recognizes two magic IDs for exercising error paths:

- `00000000-0000-4000-8000-000000000404` - 404 with `APIHUB-EF-3001` (stands in for "file was cleaned up").
- `00000000-0000-4000-8000-000000000410` - 410 with `APIHUB-EF-4101` (stands in for "signed URL timed out").

Any other ID returns a small CSV, except `11111111-1111-4111-8111-111111111111`, which returns the Markdown report used by `debug:files`. All successful responses include `Content-Disposition: attachment`.

### Seed fixtures

On each router creation (i.e. on every `dev:backend` restart and every test setup), the store is reseeded with six deterministic chats:

- `fc000001-0000-4000-8000-0000000000b0` - **Pagination QA (Request/Response 1-120)**: 240 messages (120 user / 120 assistant), newest-first; **#1 is the oldest pair**, **#120 is the newest**. Use with default `limit=100` to force a second `before` page.
- `fc000001-0000-4000-8000-000000000001` - pinned, 2 messages.
- `fc000001-0000-4000-8000-000000000002` - 40 messages (pagination sample).
- `fc000001-0000-4000-8000-000000000003` - recent activity, 2 messages.
- `fc000001-0000-4000-8000-000000000004` - empty (no messages, no title).
- `fc000001-0000-4000-8000-000000000005` - archived/old, 2 messages.

### Exit check (from the Phase 1 plan)

```bash
curl -N -H 'Content-Type: application/json' \
  -d '{"content":"hello","clientMessageId":"10000000-0000-4000-8000-000000000001"}' \
  http://localhost:3003/api/v1/ai-chat/chats/fc000001-0000-4000-8000-000000000003/messages/stream
```

Expected: an SSE sequence starting with `event: message.assistant.start`, several `event: message.assistant.delta` frames, an `event: message.assistant.completed`, and finally `event: done`.

### Dev gotcha: `curl` vs nodemon restart

The `dev:backend` script scopes nodemon with `--watch server --ext ts,json`, so only changes under `server/` restart the process.

If you still need to manually exercise an SSE stream while you're actively editing server code, run it without the watcher: `npx ts-node server/index.ts` from `packages/portal` (no watcher). For regular mock-server development, use `npm run dev:backend` (nodemon + auto-reload). Tests are unaffected because supertest mounts the Express app in-process.

A restart mid-stream closes the TCP socket and `curl` reports `curl: (56) Recv failure: Connection was reset by peer`. The supertest suite (`npm run test:server`) is immune because it mounts the Express app in-process.

### Client disconnect detection: `res.on('close')` not `req.on('close')`

`stream.ts` wires its abort controller to `res.on('close')` rather than `req.on('close')`. On Node 16+ the request stream emits `close` the moment `body-parser` finishes reading the POST JSON body, which would abort every stream before a single frame went out. `res.on('close')` only fires when the response socket actually closes (client disconnect, timeout, server shutdown), which is what we want.
