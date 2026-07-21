---
name: apihub-deployment-followup
description: Decide whether a backend change requires follow-up in the qubership-apihub deployment repo (Helm, Compose, configuration reference) and remind the developer with concrete actions. Use when editing backend config, env defaults, or deployment-facing behaviour — not when authoring chart changes inside qubership-apihub itself.
---

# Deployment follow-up (from backend)

**Do not edit** `qubership-apihub` unless that repository is open in the workspace.
Your job is to **remind** the developer when backend work likely needs a deployment
repo follow-up.

## Repository

| Field | Value |
|-------|--------|
| **Repo** | https://github.com/Netcracker/qubership-apihub |
| **Typical paths** | `helm-templates/qubership-apihub/values.yaml`, chart templates, `docker-compose/`, `docs/configuration-reference.md` |

## Remind when the backend change includes any of

- New or renamed **environment variables** or **secrets** (including defaults in
  `SystemInfoService` / `config/Config.go` or viper `SetDefault`).
- New **feature flags** or config keys loaded at startup.
- New **ports**, health/readiness probes, or resource limits implied by the service.
- New **background jobs**, cron schedules, or cleanup workers.
- New **volume mounts**, file paths, or object-storage settings.
- New **optional components** toggled at deploy time (extensions, AI chat, linter, agents-backend URLs).

## Reminder format

When criteria match, end your message with:

```markdown
### Related repositories (follow-up outside this repo)
- **Helm / deployment** ([qubership-apihub](https://github.com/Netcracker/qubership-apihub)): <concrete checks — env vars in values.yaml, Compose env files, configuration-reference.md, extension baseUrl, etc.>
```

Omit the section when no deployment impact is likely.

## For authors working inside qubership-apihub

Use the `apihub-deployment-authoring` skill in that repository instead — this skill
only covers **cross-repo reminders** from backend work.
