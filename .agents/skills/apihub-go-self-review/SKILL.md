---
name: apihub-go-self-review
description: Reviews Go backend code changes against project standards (AGENTS.md, rules, development guide). Use when the user asks for self-review, code review of a diff, or post-implementation check before commit or PR. Invoke explicitly after another agent or model wrote the code.
disable-model-invocation: true
---

# APIHub Go Self-Review

Independent review of Go backend changes. **Do not implement fixes unless the user asks** — report findings first.

## When to use

- After an agent or Copilot generated a feature or fix.
- Before opening a PR or committing.
- Prefer a **new chat** or **different model** than the one that wrote the code to reduce confirmation bias.

## Workflow

1. **Scope** — Determine diff scope:
   - `git diff` (unstaged + staged) or `git diff main...HEAD` / user-provided branch range.
   - If unclear, ask which files or commits to review.
2. **Load standards** — Apply `AGENTS.md`, deployed rules (including CI linter rules), and the repository development guide.
3. **Review** — Walk changed files against the checklist below.
4. **Report** — Use the output format below with file paths and line references where possible.

## Review checklist

### Requirements and design

- [ ] Changes match stated requirements; no obvious scope creep or missing cases.
- [ ] Ambiguous behavior was not silently assumed without documenting assumptions.
- [ ] **Bugfix:** addresses root cause; summary explains why the failure happened and why the fix is correct.

### Error handling (fail fast)

- [ ] No new swallowed errors (`_ = err`, ignored `err`, empty result after failed I/O/DB).
- [ ] No new silent "default behavior" when an operation failed, unless explicitly required and logged.
- [ ] Errors propagated or handled at boundary with project error codes and ERROR logging where appropriate.
- [ ] No symptom-only patch that hides the original failure mode.

### Go conventions

- [ ] No magic numbers without named constants or justified comments.
- [ ] HTTP responses use `http.StatusXXX`, not raw integers (`200`, `404`, etc.).
- [ ] Repeated strings extracted to constants.
- [ ] Comments only where needed; no endpoint/route mapping comments on types.
- [ ] Dependency-free converters: `Make{Name}View` in `entity/` package.
- [ ] New repos/services/controllers appended at end of section in the service entry file when applicable.
- [ ] Fatal wiring failures use `log.Fatalf` where appropriate.

### API and OpenAPI

- [ ] REST changes have matching updates in OpenAPI specs when applicable.
- [ ] No unapproved breaking public API changes.

### Migrations

- [ ] Unique numeric migration prefix; up/down pairs where expected.
- [ ] Migration validation script run when the repository provides one.

### SQL performance

- [ ] New/changed repository SQL: indices, joins, filters, cardinality, N+1 risks noted.

### Documentation

- [ ] Right doc updated per repository documentation index; root `README.md` not used for minor features.

### CI linters

- [ ] Markdown prose lines ≤400 characters; valid relative links.
- [ ] Go raw string prompts use tabs for nested indentation, not spaces.
- [ ] OpenAPI / YAML edits: no trailing whitespace; `$ref` siblings valid.

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
