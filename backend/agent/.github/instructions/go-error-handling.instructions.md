---
description: Go error handling — fail fast and fix root cause
applyTo: "**/*.go"
---

# Go Error Handling

- **Bugfixes:** investigate and fix the **root cause**; do not patch symptoms by swallowing errors or forcing default behavior when something failed.
- **Do not:** `_ = err`; `return nil` / empty data after a failed DB or external call; `log` then continue as if success; catch-all `recover()` without re-panic or proper fatal handling; widen `if err != nil` to ignore and use a zero value unless product spec requires it.
- **Do:** return `error` from lower layers; handle once at the boundary (controller / job) with proper API error codes and ERROR-level logs.
- **Fail fast** on misconfiguration and fatal wiring (`log.Fatalf` in service entry files, config validation at startup).
- Intentional degradation only with explicit product requirement — log the failure and document the fallback.
