---
description: Backend API error code conventions in ErrorCodes.go
applyTo: qubership-apihub-service/**/*.go
---

# Backend API Errors

- Error codes and messages returned in HTTP responses must be constants in `exception/ErrorCodes.go`.
- **Legacy errors:** numeric string codes (`"9"`, `"22"`) with a paired `*Msg`; blank line between pairs.
- **AI Chat errors:** `APIHUB-AI-*` codes with the same pairing rules.
- **Variant messages** (same code, different text): declare only `*Msg` next to the parent code block — reuse the parent `Code` at call sites (see `InvalidParameterValue` + `InvalidLimitMsg`, or `AiChatValidationFailed` + `AiChatMessageTooLongMsg`). Do not add orphan `*Msg` constants without documenting which code they belong to.
- Do not use inline `Message:` strings for client-facing errors in new code.
