# APIHub Go Developer — Reference

Read this file when you need examples or general patterns. Keep `SKILL.md` as the workflow checklist.

## CI linters

See deployed CI linter rules (`.cursor/rules/ci-super-linter.mdc` from `development-conventions` or equivalent). Highlights for agents:

| Area | Rule |
|------|------|
| Go prompts in backticks | Tabs for indented lines inside raw strings |
| Markdown / design docs | Prose ≤400 chars per line; fix links when editing docs |
| OpenAPI | Match file indentation; no trailing spaces in changed lines |
| textlint | Use terms from `.github/linters/.textlintrc` when present |

## Error handling — antipatterns

**Reject as a bugfix or new code:**

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

Controller maps service `error` to client response using project exception helpers and error code constants.

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

## Commit message (conventional commits)

Examples:

```text
feat(search): add FTS config for lite operation search

fix(auth): correct token validation on expired sessions
```

One line subject; optional body for non-obvious rationale.
