---
description: CI super-linter and link-check rules for docs, Go, and YAML
globs: "**/*.{md,go,yaml,yml}"
alwaysApply: false
---

# CI linters (super-linter / link checker)

GitHub Actions runs **super-linter** on changed files and **lychee** on `**/*.md`. Follow these rules when you add or edit matching files so PR checks pass without a follow-up lint commit.

Config references: `.editorconfig`, `.github/linters/.editorconfig-checker.json`, `.markdownlint.json`, `.github/linters/.textlintrc`, `.github/workflows/super-linter.yaml`.

## EditorConfig (Go)

- `*.go`: **tabs** for indentation (`indent_style = tab`, size 4).
- In raw string literals (e.g. system prompts in `service/*Prompt.go`), nested lines that look indented must use **tabs**, not spaces — editorconfig-checker validates the whole file.
- Trim trailing whitespace in non-Markdown files; ensure a final newline at EOF.

## Markdown (markdownlint)

- CI validates **changed** Markdown with **MD013 line length 400** on prose (super-linter default for PR diffs).
- Wrap long paragraphs and list items before 400 characters; use extra bullets or line breaks instead of one very long line.
- Only one H1 per file (**MD025**); use `##` for main sections in long design docs.
- Tables are exempt from line-length in `.markdownlint.json`; still keep rows readable.

## Natural language (textlint)

- Follow `.github/linters/.textlintrc` terminology (e.g. `Markdown`, `OpenAPI`, `predefined`, `APIs`, `end-to-end`).
- Do not add conflicting custom terms (e.g. both `IDS` and `IDs`).
- Do not add `REST` as a forced term — it causes false positives on the word "rest".

## Markdown links (lychee)

- Links must resolve from the **file's directory** (count `../` carefully).
- `.claude/skills/README.md` → canonical skills: `../../.cursor/skills/` (not `../.cursor/skills/`).
- `.claude/skills/.../apihub-backend-developer/apihub-backend-developer/*.md` → repo docs: `../../../../docs/...` (four levels to repository root).
- In `.cursor/skills/` use paths like `../../../docs/agent/related-repositories.md` (three levels).
- Prefer stable repo-relative links; external URLs must be reachable.

## OpenAPI / YAML

- No trailing whitespace on changed lines in `docs/api/*.yaml`.
- Match surrounding indentation in large specs; do not reformat unrelated blocks.
- OpenAPI: avoid bare `$ref` with sibling fields — wrap in `allOf` when adding `description` next to `$ref`.

## SQL migrations (sqlfluff)

- Unique numeric prefix; paired `.up.sql` / `.down.sql` when applicable.
- Project config in `.sqlfluff` excludes some rules; avoid unnecessary style churn.

## Before finishing

- After editing Markdown, Go prompt strings, or `.claude/**/*.md`, verify line length (≤400) and link paths.
- Run migration number script when migrations change (see `db-migrations` rule).
