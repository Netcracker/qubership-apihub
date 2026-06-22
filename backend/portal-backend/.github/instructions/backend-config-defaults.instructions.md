---
description: Backend config defaults and validation conventions
applyTo: qubership-apihub-service/**/*.go
---

# Backend Configuration Defaults

- **Single source of truth:** `viper.SetDefault` in `service/SystemInfoService.go` (`setDefaults`).
- **Validation:** `validate` tags on types in `config/Config.go` (mirror `BusinessParameters` size limits: `gt=0`, `lte=8796093022207` where MB→bytes conversion applies).
- **Startup:** invalid config fails fast in `SystemInfoService.Init()` via `utils.ValidateConfig`.
- **Services:** use `GetAiChatConfig()` / other getters after init; do not re-declare the same default as a Go constant.
