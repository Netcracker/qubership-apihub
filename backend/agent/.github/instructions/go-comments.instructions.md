---
description: Go comment policy and entity-to-view converter naming
applyTo: "**/*.go"
---

# Go Comments and Converters

## Comments

- Comment only when it materially helps understanding non-obvious logic.
- Do not comment obvious code.
- Do not add comments that map structs/functions to HTTP routes (e.g. `// AiChatsListResponse is GET /chats`).

## CI / EditorConfig in Go sources

- Raw string literals (system prompts, embedded templates): continuation lines that look indented must use **tabs**, not spaces — see CI linter rules.

## Entity → view converters

- Converters with **no dependencies** belong in the `entity` package next to the entity struct.
- Name them `Make{Name}View` (e.g. `MakePackageSearchResultView`).
