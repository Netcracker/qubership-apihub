# APIHub Backend Developer — Reference

Read this file when you need examples or doc-routing detail. Keep `SKILL.md` as the workflow checklist.

## Doc routing (where to update documentation)

| Change type | Update |
|-------------|--------|
| New or changed REST contract | `docs/api/APIHUB_API.yaml` (+ Admin/Internal specs if applicable) |
| New feature with design notes | `docs/feature_design/<area>/` (see `docs/README.md`) |
| Operational / migration analysis | `docs/ops_migration_analysis_guide.md` |
| Local dev setup change | `docs/local_development/` |
| AI assistant behavior | `docs/feature_design/ai_assistant/` or `docs/static_resources_customization.md` |
| Minor implementation detail | Relevant existing guide only — **not** root `README.md` |

Full index: `docs/README.md`.

## CI linters

See `.cursor/rules/ci-linters.mdc`. Highlights for agents:

| Area | Rule |
|------|------|
| Go prompts in backticks | Tabs for indented lines inside raw strings |
| Markdown / design docs | Prose ≤400 chars per line; fix links when editing `.claude/**` |
| OpenAPI | Match file indentation; no trailing spaces in changed lines |
| textlint | Use terms from `.github/linters/.textlintrc` |

## Error handling — anti-patterns

**Reject as a bug fix or new code:**

```go
if err != nil {
    log.Error(err)
    return nil, nil // pretend success with empty data
}

_ = repo.Save(ctx, ent)

result, _ := fetch() // swallowed error

if err != nil {
    return defaultConfig() // silent fallback without product requirement
}
```

**Prefer:**

```go
if err != nil {
    log.Errorf("failed to save entity: %s", err.Error())
    return nil, err
}
```

Controller maps service `error` to client response using `exception` helpers and `ErrorCodes.go`.

## HTTP status codes

**Good:**

```go
import "net/http"

w.WriteHeader(http.StatusNotFound)
```

**Avoid:**

```go
w.WriteHeader(404)
```

## Related repositories (Helm, E2E)

See [`docs/agent/related-repositories.md`](../../../../docs/agent/related-repositories.md). Agents cannot edit those repos unless they are in the workspace; **remind** the developer with links when:

| Backend change | Likely follow-up |
|----------------|------------------|
| New env var / secret / feature flag | Helm `values.yaml`, templates, ConfigMap/Secret |
| New cron, probe, port, volume | Helm chart templates |
| New/changed REST API | Postman collection repo + `docs/api/*.yaml` |
| New auth or error contract | Postman assertions |

Update placeholder Helm URL in `related-repositories.md` when your team’s chart repo is known.

## Entity → view converter (`Make{Name}View`)

Place dependency-free converters in `entity/` next to the entity struct.

**Good:**

```go
// entity/ExampleEntity.go
type ExampleEntity struct {
    Id   string
    Name string
}

func MakeExampleView(ent ExampleEntity) view.Example {
    return view.Example{
        Id:   ent.Id,
        Name: ent.Name,
    }
}
```

**Avoid:**

- Converter in `view/` or `service/` when it only maps fields and has no dependencies.
- Comments like `// MakeExampleView is GET /examples/{id}`.

If the converter needs repositories or services, keep it in `service/` (or an appropriate layer), not `entity/`.

## Error codes (`exception/ErrorCodes.go`)

**Good:**

```go
const ExampleNotFound = "999"
const ExampleNotFoundMsg = "Example with id = $id not found"
```

Use existing patterns for parameter placeholders (`$id`, `$param`, etc.). Do not inline error code strings in controllers or services.

## Service.go wiring

- Add `repository.New...` with other repository constructors (end of repository block).
- Add `service.New...` with other services (end of service block).
- Add `controller.New...` with other controllers (end of controller block).
- Use `log.Fatalf` when service construction failure must stop startup (see existing `AiChatService` wiring).

## Migration files

Naming: `{N}_{description}.up.sql` and `{N}_{description}.down.sql` where `N` is the next free integer.

Validate (from repository root):

```bash
bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh
```

```powershell
powershell -File .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.ps1
```

## Commit message (conventional commits)

Examples:

```text
feat(ai-chat): add pinned chat retention cleanup job

fix(search): correct FTS config for lite operation search
```

One line subject; optional body for non-obvious rationale.

## Further reading

- `AGENTS.md` — agent contract (loaded every session)
- `docs/development_guide.md` — API-first, logging, deprecation, PR conventions
