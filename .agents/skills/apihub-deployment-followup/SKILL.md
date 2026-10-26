---
name: apihub-deployment-followup
description: Decide whether a change to portal-backend (config, env defaults, ports, mounts, background jobs, extensions) needs updates in deploy/helm-templates/, deploy/docker-compose/, and docs/configuration-reference.md, and list the concrete edits. Use after editing backend config structs, defaults, startup wiring, or deployment-facing behaviour. For authoring chart or Compose changes themselves, use apihub-deployment-authoring.
---

# Deployment follow-up (from the backend)

The deployment assets live in this repository, so the follow-up is part of the same change, not a reminder for
another repository. Your job is to decide whether the backend change touches them and to name the edits.

## Where the assets are

| Asset | Path |
|-------|------|
| Helm values and templates | `deploy/helm-templates/qubership-apihub/values.yaml`, `templates/` |
| Compose stacks | `deploy/docker-compose/apihub-generic/`, `deploy/docker-compose/with-keycloak/` |
| Configuration map | `docs/configuration-reference.md` |
| Install guide | `docs/installation-guide.md` |

## Check these when the backend change includes any of

- New or renamed **environment variables** or **secrets** (including defaults in `SystemInfoService`,
  `config/Config.go`, or viper `SetDefault`).
- New **feature flags** or config keys loaded at startup (`config.template.yaml`).
- New **ports**, health or readiness probes, or resource limits implied by the service.
- New **background jobs**, cron schedules, or cleanup workers.
- New **volume mounts**, file paths, or object-storage settings.
- New **optional components** toggled at deploy time (extensions, AI chat, linter, agents-backend URLs).

## Output

When a criterion matches, finish your message with a short section:

```markdown
### Deployment follow-up
- Helm: <values.yaml keys and templates to change>
- Compose: <config files and env files to change in each stack>
- Docs: <rows of docs/configuration-reference.md and guides to update>
```

Then make the edits with the `apihub-deployment-authoring` skill in the same change. Omit the section when no
deployment impact is likely.
