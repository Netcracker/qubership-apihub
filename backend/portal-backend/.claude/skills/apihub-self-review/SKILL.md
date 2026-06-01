---
name: apihub-self-review
description: Reviews APIHub backend code changes against project standards (AGENTS.md, rules, development guide). Use when the user asks for self-review, code review of a diff, or post-implementation check before commit or PR. Invoke explicitly after another agent or model wrote the code.
disable-model-invocation: true
---

# APIHub Self-Review

Independent review of backend changes. **Do not implement fixes unless the user asks** — report findings first.

## When to use

- After an agent or Copilot generated a feature or fix.
- Before opening a PR or committing.
- Prefer a **new chat** or **different model** than the one that wrote the code to reduce confirmation bias.

## Workflow

1. **Scope** — Determine diff scope:
   - `git diff` (unstaged + staged) or `git diff main...HEAD` / user-provided branch range.
   - If unclear, ask which files or commits to review.
2. **Load standards** — Apply `AGENTS.md`, `.cursor/rules/` / `.claude/rules/` (including `ci-linters`), and `docs/development_guide.md`.
3. **Review** — Walk changed files against the checklist below.
4. **Report** — Use the output format below with file paths and line references where possible.

## Review checklist

### Requirements and design

- [ ] Changes match stated requirements; no obvious scope creep or missing cases.
- [ ] Ambiguous behavior was not silently assumed without documenting assumptions.

### Go conventions

- [ ] No magic numbers without named constants or justified comments.
- [ ] Repeated strings extracted to constants.
- [ ] Comments only where needed; no endpoint/route mapping comments on types.
- [ ] Dependency-free converters: `Make{Name}View` in `entity/` package.
- [ ] New repos/services/controllers appended at end of section in `Service.go`.
- [ ] Fatal wiring failures use `log.Fatalf` in `Service.go` where appropriate.
- [ ] API error codes/messages use `exception/ErrorCodes.go` constants.

### API and OpenAPI

- [ ] REST changes have matching updates in `docs/api/` (correct spec file).
- [ ] No unapproved breaking public API changes.

### Migrations

- [ ] Unique numeric migration prefix; up/down pairs where expected.
- [ ] Run: `bash .cursor/skills/apihub-backend-developer/scripts/check_migration_numbers.sh`

### SQL performance

- [ ] New/changed repository SQL: indexes, joins, filters, cardinality, N+1 risks noted.

### Documentation

- [ ] Right doc updated per `docs/README.md`; root `README.md` not used for minor features.

### CI linters

- [ ] Markdown prose lines ≤400 characters; valid relative links (especially under `.claude/skills/`).
- [ ] Go raw string prompts use tabs for nested indentation, not spaces.

### Libraries and tooling

- [ ] No unnecessary reimplementation of standard library / ecosystem solutions.
- [ ] GitHub operations would use `gh` (not ad-hoc scraping).

## Output format

```markdown
## Summary
<1–3 sentences: overall quality and merge readiness>

## Critical
- `path:line` — issue and suggested fix

## Suggestion
- `path:line` — improvement

## Nice to have
- optional polish

## Checklist gaps
- <any checklist item that could not be verified from the diff>
```

If there are no findings in a section, write `None`.

## After review

Offer to apply fixes only if the user requests. Optionally suggest a conventional commit message if the change set looks complete.
