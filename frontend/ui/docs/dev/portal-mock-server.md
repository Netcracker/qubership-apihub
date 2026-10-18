# Portal mock server

Express app under `packages/portal/server/`. Default listen URL: `http://localhost:3003` (`NODEJS_PORT` to override).

Use it in **mixed mode** ([local-development.md](./local-development.md#optional-mixed-mode-proxy--local-mock)) or with `dev:frontend`. Default **proxy mode** does not use this server; `/api` goes to the real APIHUB.

## Vite proxy (`vite.config.ts`)

Add mock prefixes **before** the catch-all `/api` entry (Vite matches in declaration order). Example (not enabled in the repository by default):

```ts
const devServer = 'http://localhost:3003'

// server.proxy - before '/api':
'/api/v1/ai-chat': {
  target: devServer,
  changeOrigin: true,
  secure: false,
},
'/api/v1/ephemeral-files': {
  target: devServer,
  changeOrigin: true,
  secure: false,
},
```

When you add a route under `packages/portal/server/`, add a matching prefix here for mixed mode.

### Verify via Vite (mixed mode)

With `dev:backend` running and mock prefixes configured:

```bash
curl "http://localhost:5173/api/v1/ai-chat/chats?limit=1"
curl "http://localhost:5173/api/v1/ephemeral-files/11111111-1111-4111-8111-111111111111?token=mock-dev-token"
```

Replace `5173` with your Vite port. Expect JSON from the mock.

## AI Chat (`/api/v1/ai-chat`)

Mock limits: pin **3** per user, max message length **32000**.

| Method   | Path                         | Notes                                                                                                                |
| -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/chats`                     | Query: `search`, `limit` (default **100**, max **200**), `before` (ISO `lastMessageAt`, keyset). Pinned chats first. |
| `POST`   | `/chats`                     | Create chat (`title` optional).                                                                                      |
| `GET`    | `/chats/:id`                 |                                                                                                                      |
| `PATCH`  | `/chats/:id`                 | `title`, `pinned`. Pin limit: `APIHUB-AI-4003`.                                                                      |
| `DELETE` | `/chats/:id`                 |                                                                                                                      |
| `GET`    | `/chats/:id/messages`        | Newest first. Query: `limit`, `before`.                                                                              |
| `POST`   | `/chats/:id/messages`        | Non-streaming.                                                                                                       |
| `POST`   | `/chats/:id/messages/stream` | SSE assistant stream.                                                                                                |

### Stream scenarios (mock)

`POST .../messages/stream` picks a script by **substring** on lower-cased `content` (first match wins).

| Substring                | Behavior                                  |
| ------------------------ | ----------------------------------------- |
| `debug:http-500`         | HTTP `500` + `APIHUB-AI-5000` before SSE. |
| `debug:error`            | Deltas, then SSE `error`; no `done`.      |
| `debug:truncated-stream` | `start` + deltas only.                    |
| `debug:links`            | Portal package/operation Markdown links.  |
| `debug:longmd`           | Large Markdown sample.                    |
| `debug:json`             | JSON code block gallery.                  |
| `debug:files`            | Ephemeral file download links.            |
| `debug:thinking`         | Long pauses + tool frames.                |
| `debug:offtopic`         | Short refusal.                            |
| (else)                   | Default Markdown gallery.                 |

### SSE smoke test (in-process)

`npm run test:server` exercises the app via supertest without a listening port. To hit a running mock:

```bash
curl -N -H 'Content-Type: application/json' \
  -d '{"content":"hello"}' \
  http://localhost:3003/api/v1/ai-chat/chats/fc000001-0000-4000-8000-000000000003/messages/stream
```
