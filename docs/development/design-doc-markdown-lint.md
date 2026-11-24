# Design Markdown and CI lint (tables)

Functional designs under `docs/design/` often use pipe tables (metadata, scope, use cases). CI runs
**super-linter** markdownlint on **changed** files; broken tables are the most common reason design
PRs fail `Lint: Code base`.

## What went wrong (typical)

Authors wrap long table cell text onto the next line for readability in the editor. In Markdown that
is **not** a continuation of the cell — it is a **new invalid row**. markdownlint reports **MD055**
and **MD056**.

Other frequent issues in the same files:

- **MD037** — `**Maven GroupId** *` to mean “required” (spaces inside emphasis).
- **MD056** — a use-case step written as a single-column line between full table rows.
- **MD036** — `**TBD**` alone under `## Backend` (reads like a second heading).

Content was fine; only structure failed CI.

## Rules when writing

1. **Each table row = exactly one line** in the source file, with all `|` delimiters.
2. **Use-case tables** have three columns: `Description | UI (Mockup) | API / Logic`. Every row
   must have three cells; use `—` when mockup or API is empty.
3. Mark required UI fields with `(required)`, not a trailing `*` after bold.
4. Under section headings, use a sentence for placeholders, not a lone bold `**TBD**`.
5. Long URLs (Figma) stay inside the cell on that same line; shorten link text if needed.

Lists and paragraphs under `##` sections **can** use soft line breaks. **Tables cannot.**

## Verify before opening a PR

From the repository root:

```bash
npx markdownlint-cli --config .github/linters/.markdownlint.json docs/design/path/to/your.md
```

See also `.cursor/rules/ci-super-linter.mdc` (Markdown tables section) and
`docs/development/build-and-test.md` for local CI parity.
