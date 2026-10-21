# Documentation

Where each kind of text lives in this repository, how to add a page, and which checks a Markdown change passes. The
rules follow from [ADR 0008](../internal/adr/0008-documentation-architecture-and-docs-site.md).

## Principles

1. **One home per fact.** A fact has one source file. Other places link to it.
2. **The reader decides the place.** Text for people who install, run, or use APIHUB goes to `docs/`. Text for people
   who change one module stays in that module. Text for people who change several modules goes to a group README or
   to `docs/development/`.
3. **Agent-only text is not human documentation.** `AGENTS.md`, `CLAUDE.md`, and `agent-packages/` hold instructions
   for AI assistants. Human documents never depend on them. See [AI assistants](./ai-assistants.md).
4. **Docs change with the code, in the same pull request.** A change to behavior, configuration, a port, or a mounted
   file updates the page that describes it before the pull request merges.
5. **A finished plan is not documentation.** It moves to `<module>/docs/archive/`, with a first line that says when it
   was archived and whether the work is done or stopped.
6. **The repository is the source, and the site is a view.** Every site page is a Markdown file in `docs/` that reads
   correctly on GitHub.

## Levels

| Level | Location | Audience |
|---|---|---|
| Repository | `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE-OF-CONDUCT.md` | everyone who lands on GitHub |
| Product | `docs/`, published on the documentation site | users, operators, contributors |
| Internal | `docs/internal/`, not published | the team |
| Group | the README of `backend/`, `frontend/`, `tests/`, `deploy/`, and `tools/` | contributors to several modules of one group |
| Module | `<group>/<module>/README.md` and `<group>/<module>/docs/` | contributors to one module |
| Agent | `AGENTS.md`, `CLAUDE.md`, `agent-packages/` | AI assistants |

`docs/internal/` holds the architecture decision records (`adr/`), the project history, and the team process. It stays
on GitHub because it describes how the team works and why past decisions were made, which readers of the site do not
need. See [the internal index](../internal/README.md).

## Where a text goes

| The text is about | It goes to |
|---|---|
| using the Portal or the Agents UI | `docs/user-guide/` |
| making a service discoverable by the APIHUB agent | `docs/user-guide/agent-discovery.md` |
| how APIHUB classifies an API change, rule by rule | `docs/reference/api-changes/` |
| installing, configuring, upgrading, backing up, or securing a deployment | top-level guides in `docs/`, or `docs/administration/` |
| how the product is built as a system | `docs/architecture/` |
| how a feature should behave (design items, feature designs, contracts) | `docs/design/<area>/` |
| a decision that shapes several modules or the repository | `docs/internal/adr/` |
| a workstation, branching, commits, pull requests, CI, or releases | `docs/development/` |
| how the team plans and tracks work, project history | `docs/internal/` |
| the shared rules of one language group | the group README |
| building, running, debugging, or extending one module | the module README and `<module>/docs/` |
| test data, fixtures, mock content | not documentation: excluded from the site and from the doc lint rules |

## Add a page

1. Pick the folder from the table above. Use a lowercase kebab-case ASCII filename, for example
   `docs/administration/data-maintenance.md`. Files that already exist in a module keep their names.
2. Start the file with one H1. The site takes the page title from it, so a page needs no front matter.
3. Link other files with relative paths that resolve from the file's own directory. Link to the owner of a fact
   instead of copying it.
4. Add the page to the index of its folder (the `README.md`) and, for a significant guide, to
   [`docs/README.md`](../README.md). A new file in `docs/<folder>/` joins the sidebar group of its folder by itself.
5. Run the checks in [Linters](#linters) and build the site (see [The docs site](#the-docs-site)).

## Add a design item

A design item describes how one feature behaves. Add it to the folder of its area under `docs/design/`, named
`<id>-<slug>.md`. The ID scheme, the area codes, the next free number for each area, and the template for the header
block are in [the design index](../design/README.md). Update the index in the same pull request: the item list and the
next free number. A number is never reused.

## Diagrams and images

- Use Mermaid for new flow and sequence diagrams, SVG for designed figures, and PNG for screenshots. Keep a `.drawio`
  source next to the image exported from it.
- Store images in `docs/images/<section>/` or in `<module>/docs/images/`. The architecture diagrams have one copy, in
  `docs/images/architecture/`; the README, the docs, and the landing all use it.
- Never link an image on `github.com/user-attachments`, in a wiki, or on any other host that the repository does not
  control. Download it and commit it. Such a link breaks when the upload is deleted, and the page then loses its
  image (see [ADR 0008](../internal/adr/0008-documentation-architecture-and-docs-site.md)).

## The docs site

[`sites/docs`](../../sites/docs/README.md) is an Astro Starlight site that publishes `docs/` at
`https://netcracker.github.io/qubership-apihub/docs/`. You edit `docs/`, never the content of `sites/docs`.

```bash
pnpm exec nx run docs-site:build    # build with the link check and the search index
pnpm exec nx run docs-site:test     # unit tests of the sync rules
pnpm --dir sites/docs run dev       # local server; restart it or run `sync` after you edit docs/
```

`sites/docs/scripts/sync-docs.mjs` copies `docs/` into the site on every build:

- Every `.md` file outside `docs/internal/` and `docs/pages/` becomes a page. `README.md` and `index.md` are the page
  of their folder.
- The first H1 becomes the title and is removed from the body.
- A link to a Markdown file in `docs/` becomes a link to the page. A link to a folder with a `README.md` becomes a link
  to that page.
- A link to `docs/internal/`, to a file outside `docs/`, or to a file that is not Markdown or an image becomes a link
  to the file on GitHub, on `develop`.
- Images that a page references are copied. A missing image fails the sync.
- Two files that produce one slug (`user-guide.md` and `user-guide/README.md`) fail the sync, and so does a name that
  starts with `_`.

Links in code blocks and inline code stay as written. The build fails on a link to a page or an anchor that does not
exist. [The site README](../../sites/docs/README.md) also explains the sidebar order.

## Linters

Pull requests run super-linter on the changed files and a link checker on all Markdown. Run the same tools before you
push.

| Check | Rule | Config |
|---|---|---|
| markdownlint | line length 400 in CI; one H1 per file; language tag on every fenced code block | `.github/linters/.markdownlint.json` |
| Line length by convention | wrap prose at 120 characters; tables and code blocks are exempt | `AGENTS.md`, the `markdown-line-length-120` skill |
| textlint | terminology: `Markdown`, `GitHub`, `OpenAPI`, `APIs`, `end-to-end`, `predefined`, `filename`, and others | `.github/linters/.textlintrc` |
| lychee | every link in a Markdown file resolves, relative or external | `.github/workflows/link-checker.yaml`, `.lycheeignore` |

```bash
npx -y markdownlint-cli@0.43 --config .github/linters/.markdownlint.json docs/development/documentation.md
```

Do not add a term to `.textlintrc` that conflicts with an existing one (such as both `IDS` and `IDs`), and do not add
`REST`: the rule would flag the word "rest". Lychee skips agent files and test fixtures; the workflow lists them. An
external link must be reachable, so prefer stable URLs.

## Related pages

- [Workflow](./workflow.md): branches, commits, and pull requests.
- [AI assistants](./ai-assistants.md): the agent packages and `AGENTS.md` files.
- [Architecture decision records](../internal/adr/README.md): how to record a decision.
