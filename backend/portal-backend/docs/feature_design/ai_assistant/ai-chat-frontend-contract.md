# AI Chat — Frontend Contract

Audience: the frontend engineer integrating the new full-featured AI chat into the APIHUB portal.

Scope: REST/SSE contract, data model, request/response flow, error handling. UI design is **out of scope** — this document does not prescribe layout, components or interaction design beyond what is needed to implement the contract correctly.

The authoritative machine-readable contract lives in [`docs/api/APIHUB_API.yaml`](../../api/APIHUB_API.yaml), tag **AI Chat**. This document explains the *intent* behind the contract and how to use it end-to-end.

---

## 1. High-level mental model

* A **chat** is a container of messages that belongs to exactly one user. Other users' chats are invisible and inaccessible (enforced by the server via the session/JWT).
* A **message** has a role (`user` or `assistant`), server-assigned `messageId`, creation timestamp, and Markdown-formatted `content` (plain text for `user`, Markdown for `assistant`).
* The **full history is stored on the server**, not in the browser. The FE only keeps a sliding window of the chat it currently renders. On refresh it re-fetches from the API.
* Each turn (user message → assistant response) is processed by the server against an LLM backend, with MCP tools available to the model. The FE does not see tool calls directly — it receives UI-facing hints via the stream.
* Some assistant answers contain **backend-generated files** rendered as regular Markdown links inside the assistant's reply. Links are signed and short-lived; that's fine — when they expire the user can just ask again.

## 2. Traffic model: what goes over the wire

The contract is designed so that the frontend **never uploads the full conversation history**. Only deltas flow:

| Direction | Payload |
| --- | --- |
| FE → BE on send | New user message text + optional idempotency key. |
| BE → FE on send | Only the new assistant message (streamed chunks + final Markdown). |
| FE → BE on open chat | `GET /chats/{id}/messages?limit=...` once; then `?before=<cursor>` for older pages as the user scrolls up. |

Implications for the FE state management:

1. Keep an in-memory list of messages per opened chat, filled lazily via paginated GETs.
2. When sending a message, append it optimistically with a client-generated `clientMessageId` (UUID). The client-side copy is the source of truth for rendering until the next `GET /messages` refresh — matching a persisted user message back to the optimistic one is only needed if the FE wants to surface the server `messageId`, which is not required by any other API surface.
3. Never store assistant context on the FE and never re-send it back on follow-up turns.

## 3. Endpoints at a glance

Chat-management endpoints live under `/api/v1/ai-chat/*` and require the standard APIHUB session authentication (JWT / cookie). File downloads live on a deliberately generic path (`/api/v1/ephemeral-files/*`) and use a signed query-param token instead of session authentication.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/ai-chat/chats` | List the user's chats (paginated, pinned first). |
| `POST` | `/api/v1/ai-chat/chats` | Create a new (empty) chat. |
| `GET` | `/api/v1/ai-chat/chats/{chatId}` | Read chat metadata. |
| `PATCH` | `/api/v1/ai-chat/chats/{chatId}` | Rename, pin or unpin a chat. |
| `DELETE` | `/api/v1/ai-chat/chats/{chatId}` | Delete a chat. |
| `GET` | `/api/v1/ai-chat/chats/{chatId}/messages` | Paginated history (newest first). |
| `POST` | `/api/v1/ai-chat/chats/{chatId}/messages` | Send user message, non-streaming (scripts/tests only). |
| `POST` | `/api/v1/ai-chat/chats/{chatId}/messages/stream` | **Main flow:** send user message, receive SSE-streamed assistant response. |
| `GET` | `/api/v1/ephemeral-files/{fileId}?token=...` | Download a file produced by the backend (today — by the assistant). |

### 3.1 Idempotency

* `POST /messages/stream` and `POST /messages` both accept an optional `clientMessageId` (UUID). On retry, re-sending the same key for the same chat returns the previously produced assistant response instead of billing another LLM call.
* `POST /chats` is **not** idempotent — each call creates a fresh chat.

### 3.2 Pagination

Both list endpoints (`GET /chats` and `GET /chats/{id}/messages`) use **keyset pagination** based on RFC 3339 timestamps rather than a numeric `page` index. The reason is domain-specific: both lists are live views (new messages arrive, chats get pinned/unpinned and float to the top), and an offset-based second request would produce duplicates or gaps. A timestamp cursor is stable under these changes.

Usage from the FE perspective is intentionally simple:

1. **First request — no cursor.** Call `GET /chats` (or `GET /chats/{id}/messages`) with just `limit`. The server returns the newest page.
2. **Next page.** Pass `before = <oldest timestamp from the previous page>` back. The timestamp is always a value the server produced, so the client never has to deal with its own clock or timezone.
3. `hasMore: true` in the response indicates there is at least one more page.

`limit` defaults to `100` (matching the rest of APIHUB) and can be overridden up to `200`.

For `/chats` the sort is `pinned desc, lastMessageAt desc`. Pinned chats are always served before non-pinned ones regardless of the cursor. For `/messages` the sort is strictly `createdAt desc`.

### 3.3 Pinning

* Users may pin **at most 3 chats**. This limit is hardcoded identically on the client (UI should disable the "Pin" action when the count is already at 3) and on the server (pinning beyond the limit returns `400 APIHUB-AI-4003`). There is no `/config` endpoint — the value is a shared constant.
* In addition to user-driven pinning, the server keeps the **10 most recently active** chats of each user alive indefinitely as a server-only retention policy. These are **not** visually marked as pinned and the FE does not need to know about this — it only drives the "Pin" button. The value is server configuration and may change without a client update.

## 4. Sending a message (streaming) — the main flow

This is the most important endpoint. Everything else is plumbing.

### 4.1 Request

```http
POST /api/v1/ai-chat/chats/e1a9f6d2-4a17-4a3b-9b91-4d7e9e8a0f11/messages/stream
Content-Type: application/json
Authorization: Bearer <jwt>

{
  "content": "List all REST operations in package QS.QSS.PRG.APIHUB.",
  "clientMessageId": "9c8e9045-dd9c-4946-b9e4-e05e3f41c4cc"
}
```

### 4.2 Response

`Content-Type: text/event-stream; charset=utf-8` with standard SSE framing:

```text
event: <type>
data: <one-line JSON>

```

The connection stays open until the server emits a terminal event (`done` on success, `error` on failure) and closes the stream. **The browser's built-in `EventSource` cannot be used**, because it only supports `GET`. Use `fetch()` with `ReadableStream` instead and parse SSE frames manually (or via a small helper library).

### 4.3 Event sequence

A happy-path turn looks like this:

```text
[context.compacted]              → optional, at most once; emitted if older history was summarised
message.assistant.start          → assistant message created; got its id
[tool.started / tool.completed]  → zero or more MCP tool calls during the turn
message.assistant.delta * ...    → 1..N Markdown chunks — append in order
message.assistant.completed      → final full AiChatMessage (Markdown, toolInvocations)
done                             → terminal
```

Pre-stream guarantees:

* once the HTTP response reaches the client with a `200` status and any SSE frame written, the user message is already persisted on the server — validation and authorisation errors are returned as regular HTTP `4xx` **before** the stream starts;
* on failure after the stream has started the sequence is cut short at any point and terminated by a single `error` event (no `done` follows).

### 4.4 Event payload reference

See `AiChatStreamEvent` and its variants in the OpenAPI schema. Quick reference:

| `event` | `data` fields |
| --- | --- |
| `context.compacted` | `compactedUpTo`, `summaryPreview`, `messagesBefore`, `messagesKeptRaw` (compacted count ≈ `messagesBefore - messagesKeptRaw`) |
| `message.assistant.start` | `messageId` |
| `tool.started` | `toolCallId`, `name` |
| `tool.completed` | `toolCallId`, `name`, `status` (`ok`/`error`), `durationMs?` |
| `message.assistant.delta` | `delta` (string to concatenate) |
| `message.assistant.completed` | `message` (full `AiChatMessage`) |
| `error` | `code`, `message` |
| `done` | — |

### 4.5 Rendering guidance

* `message.assistant.delta.delta` values are safe to **concatenate naively** in the order received. Do not buffer for JSON — each chunk is already plain string content. Markdown may be rendered incrementally; tables and fenced code will simply "resolve" as more chunks arrive.
* `tool.started` / `tool.completed` events and the persisted `toolInvocations` field on `AiChatMessage` are both
  **optional UI sugar**. They exist mainly for transparency and for debugging chat behaviour. A client that doesn't
  care about tool pills can ignore them entirely. A client that does care should treat them as equivalent: live events
  let you render a pill in real time ("🔎 Searching API operations…" that turns static on `tool.completed`), while
  the persisted list lets the same pill reappear after a history reload.
* `context.compacted` is an informational signal. A lightweight indicator like "(earlier part of this conversation was summarised to fit the model's context window)" is sufficient. UIs may also simply ignore it.
* On `message.assistant.completed` replace the streamed-in content with the authoritative `message.content` (defensive against any formatting glitches from partial chunks) and use `toolInvocations` to reconcile any pills still in transit.

### 4.6 Cancellation

If the user navigates away or clicks "Stop", abort the underlying `fetch()` request. The server will stop the upstream LLM call best-effort. Any content the server already wrote to the database stays in history — this is intentional so that expensive partial answers are not lost.

## 5. Files generated by the assistant

Some turns produce downloadable files (CSV reports, generated docs, etc.). They appear **exclusively as ordinary Markdown links inside the assistant's `content`**, for example:

```Markdown
Here is the report you asked for: [operations-report.csv](/api/v1/ephemeral-files/7b6f4f87-4c8f-4d69-a66e-4a3c8a1b2c55?token=eyJhbGciOi...)
```

The Markdown renderer does not need any special handling — a regular `<a>` with `target="_blank"` / `download` is enough. There is **no separate `attachments` array** in the contract; the Markdown link is the single source of truth for both live and historical messages.

Behaviour guarantees:

* Every file has a server-controlled lifetime (order of tens of minutes — the exact value is a server-side concern and is not published to the client).
* When the user revisits an old chat via `GET /messages`, file links in `content` are returned **as stored** (the token embedded at generation time). The server does not re-mint tokens on history load.
* The download endpoint checks **file existence and expiration before validating the token**, so an expired or cleaned-up file returns **`404 Not Found`** rather than a misleading **`401`**.
* **`410 Gone`** is returned when the file row still exists but the signed token has expired.
  The client does not need special handling — the browser surfaces the failure as a standard download error and the user can re-ask the assistant.
* The download endpoint **does not** require a session cookie or Authorization header; the short-lived token in the query string is authorisation in itself. This means: opening the link in a new tab (or sharing it within the validity window) just works.

## 6. Chat CRUD flow

```text
Sidebar opens               →  GET /chats?limit=100
User clicks chat            →  GET /chats/{id}
                               GET /chats/{id}/messages?limit=100
User scrolls history up     →  GET /chats/{id}/messages?limit=100&before=<oldest.createdAt>
User clicks "New chat"      →  POST /chats                → navigate to new chatId
User renames a chat         →  PATCH /chats/{id} { title }
User pins/unpins            →  PATCH /chats/{id} { pinned }
User deletes                →  DELETE /chats/{id}         → remove from sidebar
```

Useful details:

* A brand-new chat has `messagesCount = 0` and `title` equal to whatever was passed in the create request (or an empty string if omitted). `lastMessageAt` is always populated by the server; for an empty chat it equals `createdAt`. After the first user message the server will fill the title asynchronously; re-fetch the chat (or rely on the next `GET /chats` refresh) to pick up the auto-filled value.
* `pinned` is returned only when the chat is pinned; clients should treat a missing value as `false`.
* The server does **not** push updates over WebSocket. The FE either:
  * re-fetches on explicit user action (e.g. opening the sidebar), or
  * updates its local cache eagerly based on what it just sent/received (recommended for responsiveness).

## 7. Errors

Errors are returned as the standard APIHUB `ErrorResponse` body (`status`, `code`, `message`). AI-chat-specific codes:

| Code | Meaning |
| --- | --- |
| `APIHUB-AI-3001` | Chat not found (or belongs to another user; the server does not disclose the difference). |
| `APIHUB-AI-4001` | Message validation failed (length, empty content, invalid cursor, etc.). |
| `APIHUB-AI-4003` | Pinned-chats limit exceeded (3). |
| `APIHUB-AI-5000` | Generic internal server error while processing the chat. |
| `APIHUB-AI-5001` | Upstream LLM provider failure (SSE `error` event mid-turn). |

MCP tool failures are reported as `tool.completed` events with `status: error` and in persisted `toolInvocations`; they do not emit a dedicated stream error code.

Ephemeral file download errors (`GET /api/v1/ephemeral-files/{fileId}`) use a separate code namespace:

| Code | Meaning |
| --- | --- |
| `APIHUB-EF-3001` | Ephemeral file not found or already cleaned up. |
| `APIHUB-EF-3002` | Download token invalid or not valid for the requested file. |
| `APIHUB-EF-3003` | Download token query parameter missing. |
| `APIHUB-EF-4101` | Signed download token expired (`410 Gone`). |

Non-streaming endpoints return the error in the response body. The streaming endpoint returns validation/authz errors as a regular HTTP error *before* any SSE frame is written (same `APIHUB-AI-*` codes), and returns mid-turn failures via a single terminal `error` SSE event (see §4.3) with `APIHUB-AI-5001` or `APIHUB-AI-5000`.

## 8. Client implementation checklist

Minimum viable integration:

- [ ] Define two shared constants in the client codebase, identical to the server values:
  - [ ] `MAX_PINNED_PER_USER = 3` — used to disable the "Pin" action in the UI;
  - [ ] `MAX_USER_MESSAGE_LENGTH = 32000` — used to validate the compose input before sending.
  - There is **no** `/config` endpoint; any change of these constants has to be a coordinated FE+BE rollout.
- [ ] Implement chat sidebar with `GET /chats`, keyset pagination. Sorting comes from the server — do not re-sort client-side.
- [ ] Implement chat view with `GET /chats/{id}` + `GET /chats/{id}/messages` (newest first, paginated on scroll up). Use this endpoint **only** for historical display; the streaming endpoint is not usable for history replay.
- [ ] Implement compose → send via `POST /chats/{id}/messages/stream`:
  - [ ] generate a `clientMessageId` (UUID) per send;
  - [ ] append the user message optimistically — no server event needs to be waited for before rendering it;
  - [ ] parse SSE frames manually (fetch + `ReadableStream`); do **not** use `EventSource`;
  - [ ] concatenate `message.assistant.delta.delta` values in order;
  - [ ] replace the rendered content with `message.assistant.completed.message.content` on completion;
  - [ ] (optional) render live tool pills from `tool.started` / `tool.completed`; after a reload the same pills reappear from `toolInvocations` on the persisted message;
  - [ ] (optional) show the compaction indicator when `context.compacted` arrives.
- [ ] Handle the standard chat actions (create, rename, pin/unpin, delete). Surface the `APIHUB-AI-4003` error as a toast.
- [ ] Let the Markdown renderer handle file links — they are regular `<a>` elements pointing at `/api/v1/ephemeral-files/...`.

Non-essential but recommended:

- [ ] Graceful retry with the same `clientMessageId` on transient network errors.
- [ ] Abort the in-flight `fetch()` when the user navigates away, to free backend resources.

## 9. Versioning and compatibility

* The contract lives under `/api/v1/ai-chat/*` (chat CRUD + messaging) and `/api/v1/ephemeral-files/*` (downloads) and is considered stable going forward.
* Additions (new event types, new optional fields) are non-breaking. Consumers **must** ignore unknown `event` types gracefully and unknown JSON fields silently.
* The previous PoC endpoints (`POST /api/v1/ai-chat` and `POST /api/v1/ai-chat/stream` with the "full history" payload) are removed as part of this rollout. They existed only in non-production builds.
