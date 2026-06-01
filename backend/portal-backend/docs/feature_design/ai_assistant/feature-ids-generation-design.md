# IDS Generation — Feature Design

Audience: backend engineers extending the MCP-side authoring kits, operators who need to update the IDS
template by rebuilding the image, anyone debugging an end-to-end "the chat produced a broken IDS doc"
report.

Scope: how the AI chat assistant generates Integration Design Specification (IDS) documents on demand and
delivers them to the user as downloadable Markdown files; where the template and generation prompt live;
how MCP resources/prompts and chat-side tools collaborate; how to add new authoring kits in the future.

Prerequisite: this feature builds on the [AI chat assistant](./feature-ai-chat-design.md). Familiarity
with the streaming flow, the Chat Completions tool loop in `AiChatTurnService`, and `EphemeralFileService`
is assumed.

---

## 1. User story

> **As an integration architect**, when I describe a 3rd-party integration scenario in the chat
> (e.g. "Create a design based on this text — CIP should call API Reserve_SIM_Profiles from
> TelCoopStock, version 2025.2 …"),
> I want the assistant to produce a complete Integration Design Specification document, look up the real
> API specs in APIHub for every operation I mention, and hand me back a downloadable `.md` file I can
> attach to a Jira ticket.

The expected interaction shape:

1. The user types a natural-language scenario into the chat.
2. The assistant streams a short progress narrative with live tool pills.
3. The assistant's final reply is one paragraph + a Markdown link of the form
   `[IDS_TCS.md](/api/v1/ephemeral-files/<id>?token=...)`.
4. The user clicks the link; the browser downloads the rendered IDS document.

The same flow works for external MCP clients (Claude Desktop, Continue, etc.) via the public MCP
**prompt** + **resource** on `/api/v2/mcp`.

## 2. Where the assets live

Static, image-bundled assets — **rebuild the image** to ship template or rule changes.

```text
qubership-apihub-service/
└── resources/
    └── mcp/
        ├── prompts/
        │   └── ids_generation_prompt.md      ← step-by-step authoring rules
        └── resources/
            └── ids_template.md               ← canonical IDS markdown template
```

* `resources/mcp/resources/` → MCP **resources** (static data);
* `resources/mcp/prompts/` → MCP **prompts** (templated instructions).

## 3. Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       qubership-apihub-service (BE)                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  MCPService (MCPService.go + MCPAssets.go)                            │  │
│  │  • loadMCPAssets("./resources/mcp") at startup                       │  │
│  │  • Auto-registers files under resources/ as MCP resources             │  │
│  │  • Registers `generate_ids_document` MCP prompt (user_input arg)    │  │
│  │  • IDSAuthoringKit(userInput) → template + rules + input blob         │  │
│  └────────────┬──────────────────────────────────────────────────────────┘  │
│               │                                                             │
│               ▼                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  AiChatTurnService (AiChatTurnService.go + AiChatIdsTools.go)         │  │
│  │  • Two extra tools when assets + EphemeralFileService are wired:     │  │
│  │    – start_ids_generation(user_input)  → IDSAuthoringKit              │  │
│  │    – save_generated_file(filename, content) → EphemeralFileService   │  │
│  │  • Handled in executeToolCalls inside runToolLoop                     │  │
│  └────────────┬──────────────────────────────────────────────────────────┘  │
│               ▼                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  EphemeralFileService → temp/<userId>/<fileId> + ephemeral_file row   │  │
│  │  + security.MintEphemeralFileToken (RS256, TTL = file.expires_at)     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

Two consumption paths:

* **AI chat** — in-process `IDSAuthoringKit` via `start_ids_generation`;
* **External MCP** — `generate_ids_document` prompt + `apihub://mcp/resources/ids_template.md` resource.

## 4. Implementation walkthrough

### 4.1 Asset loader (`MCPAssets.go`)

`loadMCPAssets(rootDir)` reads `prompts/*` and `resources/*` at startup into in-memory maps. Eager load,
no live reload. `IDSAssetsAvailable()` requires both template and prompt. `IDSAuthoringKit(userInput)`
assembles the LLM instruction blob (§4.4).

### 4.2 MCP-side registration (`MCPService.MakeMCPServer`)

Auto-registers each `resources/mcp/resources/<file>` as `apihub://mcp/resources/<filename>`. When IDS
assets exist, registers prompt `generate_ids_document` with required `user_input`, returning the kit as a
single user-role message.

### 4.3 Chat-side tools (`AiChatIdsTools.go`)

Registered in `NewAiChatTurnService` when `IDSAssetsAvailable()` and `EphemeralFileService` + token minter
are present:

```go
mcpTools := mcp.MakeLLMTools()
if mcp.IDSAssetsAvailable() && generatedFiles != nil {
    mcpTools = append(mcpTools, makeIDSChatTools()...)
}
```

#### `start_ids_generation(user_input)`

Facade over `IDSAuthoringKit`. Input capped at 64 KiB.

#### `save_generated_file(filename, content)`

Persists Markdown via `EphemeralFileService`, mints JWT, returns JSON with `markdown` link for the model
to embed verbatim.

* **No `userID` / `chatID` in tool args** — read from `AiChatTurnFromContext`, set by
  `AiChatTurnService.runLLMTurn`.
* Body capped at 2 MiB; filename sanitised to ASCII `[A-Za-z0-9._-]`.

### 4.4 The authoring kit (`IDSAuthoringKit`)

Single string the model consumes after calling `start_ids_generation`: user request (verbatim), template,
rules, and an explicit hand-off to call `save_generated_file` with the full document body (not inline in
chat).

## 5. End-to-end flow

```mermaid
sequenceDiagram
    participant FE
    participant Svc as AiChatTurnService
    participant LLM as OpenAILlmClient
    participant MCP as MCPService
    participant EFS as EphemeralFileService
    participant OAI as OpenAI Chat Completions

    FE->>Svc: POST /messages/stream<br/>"Create a design based on this text..."
    Svc->>Svc: persist user message; ctx ← WithAiChatTurn(userID, chatID)
    Svc-->>FE: SSE message.assistant.start
    Svc->>Svc: runToolLoop(history, hooks)

    Svc->>LLM: ExecuteStreaming({messages, tools, correlationID})
    LLM->>OAI: POST /v1/chat/completions (stream)
    OAI-->>LLM: tool_call: start_ids_generation
    Svc-->>FE: SSE tool.started
    Svc->>MCP: IDSAuthoringKit(user_input)
    MCP-->>Svc: kit
    Svc-->>FE: SSE tool.completed

    note over Svc: append assistant+tool messages;<br/>next LLM round-trip
    Svc->>LLM: ExecuteStreaming(...)
    OAI-->>Svc: search_api_operations / get_api_operation_specification
    Svc->>MCP: ExecuteSearchTool / ExecuteGetSpecTool
    Svc-->>FE: SSE tool.started / tool.completed * N

    OAI-->>Svc: tool_call: save_generated_file
    Svc->>EFS: SaveFile + MintEphemeralFileToken
    Svc-->>FE: SSE tool.completed

    OAI-->>Svc: final text + [filename](url) link
    Svc-->>FE: SSE message.assistant.delta * N
    Svc-->>FE: SSE message.assistant.completed + done
```

One chat turn from the FE perspective — same SSE shape as any other turn.

## 6. Design rationale

* **Template + rules as separate files** — template is a public MCP resource; rules are prompt-only.
* **`start_ids_generation` is a chat tool, not an MCP tool** — instructional blob; MCP clients use the
  `generate_ids_document` prompt instead.
* **`save_generated_file` is chat-only** — download URLs are apihub-specific
  (`/api/v1/ephemeral-files/...`).
* **`EphemeralFileService` is chat-agnostic** — `ephemeral_file` table has no `chat_id` / `message_id`.
  The same service can support any other feature that needs short-lived server-side file storage.
* **Synchronous tool execution** — link is returned in the same turn for the model to embed.
* **No new DB tables** — reuses `ephemeral_file`; assets are image-bundled, not config/DB.

## 7. Operational notes

* Inherits `ai.chat.enabled` kill-switch for chat routes and tools.
* Update template/rules: edit files under `resources/mcp/`, rebuild image, redeploy.
* Remove feature: delete the two files → tools and prompt are not registered on next startup.

## 8. Limitations & known gaps

* **Single-shot generation** — no multi-pass draft/final mechanism yet.
* **No server-side enforcement** that every API in the IDS was looked up in APIHub.
* **ASCII filenames only** through `sanitizeChatToolFilename`.
* **File links in old messages** are stored as-is; expired files return 404 on download (no token
  re-signing on `ListMessages`).

## 9. References

* Implementation:
  * `resources/mcp/prompts/ids_generation_prompt.md`
  * `resources/mcp/resources/ids_template.md`
  * `service/MCPAssets.go`, `service/MCPService.go`
  * `service/AiChatIdsTools.go`
  * `service/AiChatObservability.go` (`WithAiChatTurn`)
  * `service/EphemeralFileService.go`, `security/EphemeralFileTokens.go`
* Companion docs:
  * [AI Chat — Feature Design](./feature-ai-chat-design.md)
  * [AI Chat — Frontend Contract](./ai-chat-frontend-contract.md)
