---
name: api-doc-viewer-ci-linters
description: The rules of the CI linters (super-linter v9.0.0 and the lychee link checker) that every file of frontend/api-doc-viewer must pass - markdownlint, textlint terminology, stylelint, sqlfluff, codespell, gitleaks, checkov, merge-conflict markers, and the rest - with the configuration each one reads, the mistakes CI has already reported in this module, and how to suppress a finding. Load before writing or changing any file of the module (code, CSS, Markdown, SQL or YAML fixtures, stories, tests, docs), and before a commit.
---

# CI linters for api-doc-viewer

Two GitHub workflows lint the repository: `Lint: Code base` (`.github/workflows/super-linter.yaml`, super-linter
`slim-v9.0.0`) and `Lint: Markdown links` (`.github/workflows/link-checker.yaml`, lychee). This skill lists what they
check in this module, so a change passes CI the first time. It describes the configuration as of 2026-11-13; when
`.github/super-linter.env` or a file in `.github/linters/` changes, update this skill in the same change.

Every rule below comes from one of three sources: the configuration files, the super-linter v9.0.0 source, or a
finding that CI already reported on this module. The findings are quoted with the rule ID, so you can search a CI log
for them.

## Why the same errors come back

- **A touched file is linted whole.** Super-linter runs with `VALIDATE_ALL_CODEBASE=false` and passes each linter the
  changed files, not the changed lines. A one-word edit in a design page makes markdownlint and textlint check the
  whole page, including violations that were there before.
- **A pull request run sees the whole pull request.** A push run lints the files changed by that push; the
  `pull_request` run lints every file changed in the pull request. A file fixed in a later push still fails the pull
  request check while any violation is left in it.
- **checkov scans the whole repository** on every run, not only the changed files.

So when you edit a file, fix every violation in that file, not only the ones on your lines. The section
[Files that fail when touched](#files-that-fail-when-touched) lists the known ones.

- **A fix inside a generated block does not last.** Text between `<!-- BEGIN generated: <command> -->` and
  `<!-- END generated -->`, and every file whose header says it is generated, is rewritten by a script in
  `packages/api-doc-viewer/bin/`. A hand fix there is lost on the next regeneration, and CI reports the same error
  again. See [Generated Markdown](#generated-markdown).

## Generated Markdown

Fix a finding in generated text at its source, never in the Markdown:

1. Find the generator: the command in the `BEGIN generated` marker, or the header of the generated file.
2. Find the text in the generator or in the case-definition module it imports (for example
   `openapi-plain-case-definitions.mjs`, `openapi-diffs-case-definitions.mjs`,
   `async-api-security-case-definitions.mjs`). Case titles there are Markdown: write terminology words in their
   listed form and put specification values in backticks (`` 'HTTP `bearer`' ``, not `'http bearer'`).
3. A paragraph the generator writes on one line must be wrapped by the generator; `generate-openapi-suite.mjs` has a
   `wrapProse` helper that wraps at 120 characters without breaking a code span.
4. Do not run the generator yourself. Tell the user which suite to regenerate, with the command, and that the
   generated Markdown keeps failing CI until it is regenerated and committed.

Generated blocks and files in this module:

| Markdown | Generator |
| --- | --- |
| `docs/design/openapi/features/plain-case-matrix.md` (Matrix section) | `node packages/api-doc-viewer/bin/generate-openapi-suite.mjs` |
| `docs/design/openapi/features/diffs-case-matrix.md` (matrix section) | `node packages/api-doc-viewer/bin/generate-openapi-diffs-suite.mjs` |
| `packages/samples/openapi/**/README.md` | `generate-openapi-suite.mjs` |
| `packages/samples/openapi-diffs/**/README.md` | `generate-openapi-diffs-suite.mjs` |
| `packages/samples/async-api/security/README.md` | `generate-async-api-security-suite.mjs` |
| `packages/samples/*-display-mode-simple/README.md` | `generate-display-mode-simple-suites.mjs` |

The catalogues under `packages/samples/` are excluded from markdownlint and textlint, but lychee checks their links.
Case titles in the case-definition modules reach only Markdown tables; story names, IT names, and screenshot
filenames use the case IDs, so changing a title changes no screenshot.

## Which linters run on which file

All linters not switched off in `.github/super-linter.env` are on. The CI job copies the shared configuration of
`netcracker/.github` (`config/linters`) into `.github/linters/` without overwriting files that exist, so the files in
this repository win, and the shared `eslint.config.mjs` is the one used for JSON. A linter whose configuration file is
missing from `.github/linters/` uses the super-linter template.

| Files in this module | Linters that run | Configuration used |
| --- | --- | --- |
| `*.md` (except `packages/samples/**`, `agent-packages/**`, `AGENTS.md`, `CLAUDE.md`) | markdownlint, textlint (`NATURAL_LANGUAGE`), codespell, gitleaks, merge-conflict markers; lychee in its own workflow | `.github/linters/.markdownlint.json`, `.github/linters/.textlintrc`, `.lycheeignore` |
| `*.css` | stylelint, codespell, gitleaks, merge-conflict markers | super-linter template `stylelint.config.mjs` (see [CSS](#css-stylelint)) |
| `*.sql` (all fixtures under `packages/samples/` included) | sqlfluff, codespell, gitleaks, merge-conflict markers | `.github/linters/.sqlfluff` |
| `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.cjs` | codespell, gitleaks, merge-conflict markers only (ESLint, Prettier, and TSX linters are off) | `.github/linters/.codespellrc` |
| `*.yaml`, `*.yml` outside `packages/samples/` and `agent-packages/` | yamllint, spectral (`OPENAPI`) for an OpenAPI document, codespell, gitleaks, merge-conflict markers | `.github/linters/.yaml-lint.yml`, template `.openapirc.yml` |
| `*.yaml` under `packages/samples/` | none of the per-file linters (excluded by `FILTER_REGEX_EXCLUDE`); checkov still scans them unless `.checkov.yaml` skips the path | `.github/linters/.checkov.yaml` |
| `*.json` | none (all JSON under `frontend/` is excluded) | |
| `Dockerfile` | hadolint (`failure-threshold: warning`), checkov | template `.hadolint.yaml` |
| `nginx/entrypoint.sh` | shellcheck, errors only (`BASH_SEVERITY=error`) | template `.shellcheckrc` |
| `packages/api-doc-viewer/index.html` | htmlhint | template `.htmlhintrc` |
| `packages/api-data-model/test/resources/example.graphql` | Prettier check (`GRAPHQL_PRETTIER` is not switched off) | Prettier defaults |

Two linters people expect do not run:

- **editorconfig-checker does not run.** Super-linter v9 lints with it only when the repository root has an
  `.editorconfig`, and this repository has none (only modules such as `frontend/ui` have one). Final newlines and
  trailing spaces are still checked by markdownlint (`MD047`, `MD009`), yamllint, and sqlfluff (`LT12`).
- **ESLint and Prettier do not run on TypeScript in CI.** The frontend quality gates (`apihub-validate`: ESLint,
  dprint, the type check, unit tests) are separate from super-linter; run them as well.

## Markdown: markdownlint

The configuration is `.github/linters/.markdownlint.json`, read because `MARKDOWN_CONFIG_FILE=.markdownlint.json` is
set. It has no `"default"` key, so every markdownlint rule (markdownlint-cli 0.49) is on except the ones it changes:

| Rule | Setting |
| --- | --- |
| `MD013` line length | 400 characters; tables are exempt, fenced code blocks are not |
| `MD024` duplicate headings | only among siblings |
| `MD025` one H1 | off in CI, but the repository convention is still one H1 per file |
| `MD033` inline HTML | only `<picture>`, `<source>`, `<img>`, `<br>` are allowed |
| `MD041` first line is an H1 | off |
| `MD060` table column style | off |

The repository convention (`markdown-line-length-120`) wraps prose at 120 characters. Follow it; CI only fails above
400.

Rules CI has reported in this module, with the fix:

- `MD032/blanks-around-lists`: a list that follows a paragraph line (`Constraints:` then `- item`) needs a blank line
  before it, and one after it.
- `MD031/blanks-around-fences`: a blank line before and after every fenced block, also right after a sentence such as
  `Other applications install it from the registry:`.
- `MD058/blanks-around-tables` and `MD022/blanks-around-headings`: a blank line between the last table row and the
  next heading or paragraph.
- `MD040/fenced-code-language`: every fence has a language; use `text` for ASCII diagrams, trees, and sketches.
- `MD038/no-space-in-code`: no space right after the opening or before the closing backtick. `` ` parameter name` ``
  fails; write ``the `parameter name` part``.
- `MD056/table-column-count`: a `|` inside a table cell splits the cell, even inside backticks. Escape it as `\|`
  (`` `'before' \| 'after'` ``, `` `\|\|=` ``).
- `MD012/no-multiple-blanks`: one blank line at most between blocks.
- `MD013/line-length`: a prose line over 400 characters. Break long list items and paragraphs; only tables may be
  longer.

Other rules that are on and easy to trip:

- `MD033`: any `<...>` outside backticks is HTML to markdownlint. Put placeholders and generic types in code spans:
  `` `<Place> parameter name` ``, `` `Array<string>` ``. `<details>`, `<summary>`, `<sup>`, and `<kbd>` are not
  allowed.
- `MD001`: heading levels go up one at a time (`##` then `###`, never `##` then `####`).
- `MD026`: no trailing `.`, `,`, `;`, `:`, or `!` in a heading.
- `MD036`: a paragraph that is only bold or italic text is read as a heading; end it with punctuation (`**Fix.**`) or
  make it a heading.
- `MD034`: no bare URLs; use `[text](url)` or `<https://...>`.
- `MD051`: a `#fragment` link inside the same file must match a heading's generated anchor.
- `MD059`: link text such as `here`, `link`, or `more` is not descriptive; name the target.
- `MD004`, `MD035`, `MD046`, `MD048`, `MD049`, `MD050`, `MD055`: one style per file (list markers, rules, code block
  style, fence characters, emphasis and strong markers, table pipes). Match the style the file already uses.
- `MD009`, `MD010`, `MD047`: no trailing spaces, no hard tabs (code blocks included), exactly one final newline.

## Markdown: textlint terminology

textlint 15 checks the same Markdown files as markdownlint, except files under `__fixtures__/`. The configuration
`.github/linters/.textlintrc` turns on only the `terminology` rule, with its default list off and this list on:

| Write | Not |
| --- | --- |
| `Markdown`, `GitHub`, `Git`, `API`, `APIs`, `JSON`, `YAML`, `HTML`, `CSS`, `SQL`, `URL`, `URLs`, `HTTP`, `HTTPS`, `OpenAPI`, `Node.js` | the same word in any other case: `markdown`, `http`, `json`, `openapi`, `OpenApi`, `api`, `url` |
| `hardcoded` | `hard-coded`, `Hard-coded` |
| `predefined` | `pre-defined` |
| `end-to-end` | `end to end` |
| `server-side` | `server side` |
| `third-party` | `3rd party` |
| `filename` | `file name` |
| `Jira` | `JIRA` |
| `style sheet` | `stylesheet` |
| `APIs` | `API's` |
| `authentication` | `authentification` |

How the rule reads text:

- The match ignores case, so any other casing of a listed word is an error. Table cells and link text are checked.
- Code spans, fenced blocks, and link URLs are not checked. Words joined to the term by `-` or `/` are not matched:
  `api-doc-viewer`, `openapi/README.md`, and `04-http-basic` pass.
- So write a value, a key, or a scheme name from a specification in backticks (`` `http` `` scheme, `` `markdown` ``
  in a filename) and the prose word in its listed form (`an HTTP bearer scheme`, `a Markdown description`).
- CI reported `markdown`, `http`, `hard-coded`, and `stylesheet` in this module; all came from table cells and prose.
- `<!-- textlint-disable -->` comments do nothing here: the repository configuration does not enable the `comments`
  filter. Reword instead.

## Markdown links: lychee

`Lint: Markdown links` runs lychee over `./**/*.md`. In this module it checks every Markdown file except
`agent-packages/**` and `**/__fixtures__/**`; the fixture catalogues under `packages/samples/` are checked.

- A relative link resolves from the directory of the file that contains it. Count the `../` steps.
- External URLs must answer with 2xx or 429 from the CI runner. `.lycheeignore` holds the exceptions
  (`example.com`, `localtest.me`, `host.docker.internal`, and a few hosts); add one there only for a host the runner
  cannot reach.
- Private and local addresses are excluded (`--exclude-all-private`). Anchors in another file are not checked.

## CSS: stylelint

stylelint 17 runs with the super-linter template `stylelint.config.mjs`: `stylelint-config-standard` 40 and nothing
else. `.github/linters/.stylelintrc.json` is **not read** in v9, because the CSS configuration name became
`stylelint.config.mjs` and `.github/super-linter.env` does not set `CSS_FILE_NAME`. Its `ignoreAtRules` for Tailwind
has no effect.

Rules CI has reported in this module, with the form that passes:

| Rule | Fails | Passes |
| --- | --- | --- |
| `selector-class-pattern` | `.markdown-text-row__json-schema-description`, `.button-selector-option_primary`, `.font-Inter-Medium` | kebab case: lowercase letters, digits, single hyphens (`.button-selector-option-primary`) |
| `color-function-notation` | `rgb(218, 224, 236)` | `rgb(218 224 236)` |
| `color-hex-length` | `#FFFFFF` | `#FFF` |
| `length-zero-no-unit` | `0px`, `var(--x, 0px)` | `0`, `var(--x, 0)` |
| `shorthand-property-no-redundant-values` | `padding: 4px 6px 6px 6px` | `padding: 4px 6px 6px` |
| `import-notation` | `@import "./openapi.css";` | `@import url("./openapi.css");` |
| `function-url-quotes` | `url(../fonts/a.ttf)` | `url("../fonts/a.ttf")` |
| `font-family-name-quotes` | `font-family: "Inter"` | `font-family: Inter`; quote names with spaces: `'Inter Medium'` |
| `value-keyword-case` | `optimizeLegibility`; `--font-ui: Inter` | `optimizelegibility`; keep font names in `font-family` |
| `comment-empty-line-before` | a comment right after a declaration | an empty line before the comment |
| `comment-whitespace-inside` | `/*x*/` | `/* x */` |
| `declaration-empty-line-before` | an empty line between two declarations | no empty line between declarations |
| `no-descending-specificity` | `button.x:disabled` after `button.x:hover:enabled` | the less specific selector first |
| `property-no-vendor-prefix` | `-webkit-text-size-adjust` | the unprefixed property, or a disable comment with the reason |
| `at-rule-no-unknown` | `@tailwind base;` | wrap in `stylelint-disable at-rule-no-unknown` with a reason (see `src/index.css`) |
| `at-rule-prelude-no-invalid` | `@apply pl-4 list-disc;` | the plain declarations (`padding-left: 1rem;`) |

Also write alpha as a percentage in space syntax (`rgb(0 0 0 / 10%)`, not `rgba(0, 0, 0, 0.1)`) and keep one
declaration per line.

A class rename reaches TypeScript: the class is referenced in `cn(...)` calls, TS constants, and other style sheets.
Rename it everywhere in one change (`api-doc-viewer-authoring` covers `cn()`). Where a rename would change classes
that hosts or many files share, the module uses a file-level disable with a reason instead, as in
`shared-styles/colors/openapi.css`:

```css
/* stylelint-disable selector-class-pattern -- modifier classes shared with TS/TSX */
```

## SQL fixtures: sqlfluff

sqlfluff 4.3 lints every changed `*.sql`, including the DDL fixtures under `packages/samples/`. The configuration
`.github/linters/.sqlfluff` sets `dialect = postgres`, `max_line_length = 120`, and excludes `LT01` (spacing),
`LT02` (indentation), and `CP04` (`NULL` and boolean case). All other rules are on.

- `RF04` (keywords as identifiers) checks column names and aliases. CI reported a column named `label`; the fix
  renamed it to `display_text` and regenerated the screenshots. PostgreSQL non-reserved keywords fail as column names,
  among them `name`, `type`, `value`, `data`, `comment`, `text`, `key`, `version`, `role`, `level`, `option`,
  `options`, `method`, `mode`, `location`, `schema`, `owner`, `event`, `content`, `action`, `label`. Names such as
  `id`, `status`, `title`, `description`, `code`, `size`, `count`, and `format` pass. Table names are not checked by
  this rule.
- `LT05`: no line over 120 characters. `LT12`: exactly one final newline. `LT13`: no blank lines at the top.
- `LT15`: at most one empty line inside a statement and two between statements.
- `CP01`, `CP02`, `CP03`, `CP05`: one case per file for keywords, unquoted identifiers, function names, and type
  names. Do not mix `CREATE TABLE` with `create index`, or `TEXT` with `integer`, in one file.
- `CV11`: one cast style per file (`::` or `CAST(...)`).
- `RF05`: identifiers with special characters or spaces fail, quoted or not. `RF06`: a quoted identifier that does
  not need quotes (`"users"`) fails; `"Users"` passes because the quotes keep the case.
- Unparsable SQL fails as a `PRS` error. A fixture that is not valid PostgreSQL for sqlfluff fails even when ddlapi
  parses it.

A fixture change that renames a column also changes the stories, the screenshot baselines, the design pages, and the
unit tests that name it. Pick a passing name when you create the fixture. For a deliberate exception, an inline
`-- noqa: RF04` comment on the line suppresses one rule; check that the comment does not change what the viewer
shows.

## Every file: codespell, gitleaks, merge-conflict markers

These three run on every changed file that `FILTER_REGEX_EXCLUDE` does not exclude, TypeScript included.

- **codespell** 2.4 (`.github/linters/.codespellrc`) checks identifiers, strings, and comments for common
  misspellings. Its `skip` list covers `*/packages/samples/*` and `*/__fixtures__/*`. A word that is correct in this
  repository goes into `ignore-words-list` in lowercase with a comment saying why; one occurrence can carry
  `codespell:ignore` in a comment on the same line.
- **gitleaks** 8.30 (default rules) flags strings that look like secrets: JWTs, private keys, and high-entropy values
  after words such as `token`, `secret`, `password`, or `api_key`. Example values in stories and tests use plain
  placeholders such as `<token>` or `example-key`. A deliberate sample carries `gitleaks:allow` in a comment on its
  line.
- **Merge-conflict markers** fail a file that has all three of: a line `<<<<<<< x`, a line of exactly `=======`, and
  a line `>>>>>>> x`. ASCII diagrams in text fences must not use exactly seven `=` on a line of their own.

## checkov

checkov 3.3 scans the whole repository with `.github/linters/.checkov.yaml`. It found `CKV_OPENAPI_20` ("Ensure that
API keys are not sent over cleartext") in the OpenAPI fixtures of this module: an `apiKey` scheme with no HTTPS
server. `frontend/api-doc-viewer/packages/samples` and `__fixtures__` are now in `skip-path`.

- Put OpenAPI, AsyncAPI, JSON, and YAML fixtures under `packages/samples/` or a `__fixtures__/` directory. A fixture
  anywhere else (for example next to a story) is scanned, and fixtures with security schemes fail.
- `CHECKOV_FILTER_REGEX_EXCLUDE` has no effect, because checkov scans directories; `skip-path` is the working
  mechanism. JSON has no comments, so an inline `checkov:skip` is possible only in YAML.
- The module `Dockerfile` passes the Dockerfile checks today (`USER 1000`, a fixed image tag; `CKV_DOCKER_2`,
  `HEALTHCHECK`, is skipped). Keep the `USER` instruction and a fixed tag when you change it.

## Other module files

- **YAML outside the samples** (yamllint, `.github/linters/.yaml-lint.yml`): no trailing spaces, Unix line endings,
  no duplicate keys, one space inside `{ }` braces, at most one space after a comma or a hyphen, a space after `#`
  in comments (a warning), at most two empty lines. Line length is not checked.
- **`Dockerfile`** (hadolint, fails on warnings): pin package versions in `apk add`, use `COPY` rather than `ADD`
  for local files, keep a fixed image tag, and use JSON form for `ENTRYPOINT` and `CMD`.
- **`nginx/entrypoint.sh`** (shellcheck): only errors fail. The script runs under `/bin/sh`, so keep it POSIX.
- **`index.html`** (htmlhint): `<!doctype html>` first, a `<title>`, `alt` on every `<img>`, double-quoted
  attribute values, lowercase tags and attributes, unique IDs, and IDs and classes in kebab case.
- **`example.graphql`** (Prettier): format it with Prettier defaults if you change it; the file is legacy.

## Inline suppressions

Fix the finding first. Suppress only a deliberate exception, and give the reason in the comment.

| Linter | Suppression | Scope |
| --- | --- | --- |
| markdownlint | `<!-- markdownlint-disable-next-line MD013 -->` or a `disable` / `enable` pair | Markdown |
| textlint | none (the `comments` filter is not configured) | reword |
| stylelint | `/* stylelint-disable-next-line <rule> -- <reason> */` or a `disable` / `enable` pair | CSS |
| sqlfluff | `-- noqa: <rule>` at the end of the line | SQL |
| codespell | `codespell:ignore` in a comment on the line, or `ignore-words-list` in `.codespellrc` | any file |
| gitleaks | `gitleaks:allow` in a comment on the line | any file |
| checkov | `skip-path` or `skip-check` in `.github/linters/.checkov.yaml` | directories, rules |

## Files that fail when touched

A scan on 2026-11-13 found these violations in committed files. Fix the file in the same change that touches it, and
remove the entry here.

- `docs/design/openapi/features/plain-case-matrix.md`: `MD013` at line 61 (428 characters); textlint `markdown` at
  lines 259 and 283, `http` at lines 270, 271, 272, and 408. All of them are in the generated Matrix section, and the
  generator is fixed: regenerate the suite with `generate-openapi-suite.mjs` to clear them.
- SQL fixtures under `packages/samples/ddlapi/` with a keyword column name (`RF04`):
  `column-constraints/not-null/sample.sql`, `e2e-scenarios/employees_projects/sample.sql`,
  `e2e-scenarios/projects/sample.sql`, `e2e-scenarios/sample_table/sample.sql`, `indexes/expression/sample.sql`.
- CSS under `packages/api-doc-viewer/src/components/`, at least:
  - `selector-class-pattern`: `common/SelectNestedNodeRow/SelectNestedNodeRow.css`,
    `common/annotations/Description/DescriptionRow.css`;
  - `color-function-notation`: `JsoViewer/styles/JsoValue.css`, `common/annotations/Description/DescriptionRow.css`,
    `AsyncApiOperationViewer/MessageChannelServerNodeViewer/MessageChannelServerNodeViewer.css`,
    `kit/ux/UxTooltip/UxTooltip.css`, `GraphQLDebugPage/GraphQLDebugPage.css`;
  - `length-zero-no-unit`: `JsoViewer/styles/JsoValue.css`, `common/SelectNestedNodeRow/SelectNestedNodeRow.css`,
    `kit/ux/UxTooltip/UxTooltip.css`;
  - `color-hex-length`: `GraphQLDebugPage/GraphQLDebugPage.css`, `shared-styles/diffs/border-shadow.css`;
  - `import-notation`: `shared-styles/diffs/index.css`, `shared-styles/diffs/background.css`.

The scan used text patterns, not the linters, so a file can hold more findings than listed (comment spacing and
selector order, for example).

## Before you finish

1. For every file you changed, run through the section for its type above, over the whole file.
2. Markdown: blank lines around lists, fences, tables, and headings; a language on every fence; no `|` unescaped in
   a table cell; terminology words in their listed form outside backticks; relative links resolve.
3. CSS: kebab-case classes, modern color notation, short hex, no units on zero, `url("...")` imports.
4. SQL fixtures: no keyword column names, one case style per file, lines up to 120 characters, one final newline.
5. Fixtures with security schemes or sample secrets live under `packages/samples/` or `__fixtures__/`.
6. Then run the frontend gates (`apihub-validate`) for TypeScript; super-linter does not check it.

## Sources

- `.github/super-linter.env`, `.github/workflows/super-linter.yaml`, `.github/workflows/link-checker.yaml`,
  `.lycheeignore`
- `.github/linters/`: `.markdownlint.json`, `.textlintrc`, `.sqlfluff`, `.codespellrc`, `.checkov.yaml`,
  `.yaml-lint.yml`, `.editorconfig-checker.json`
- super-linter v9.0.0: `lib/globals/linterRules.sh` (configuration names), `lib/functions/buildFileList.sh` (which
  linter gets which file), `TEMPLATES/` (defaults), `dependencies/` (linter versions)
- CI runs of `Lint: Code base` on `feature/openapi-rework`, 2026-11-04 to 2026-11-11
