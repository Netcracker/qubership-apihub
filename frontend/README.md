# Frontend

The TypeScript modules of APIHUB: the Portal and Agents SPAs, the builder service, and the libraries they share. All
modules sit in one pnpm workspace with one `pnpm-lock.yaml`. For the architecture, see the
[overview](../docs/architecture/overview.md).

## Modules

| Module | What it is | Ships |
|--------|------------|-------|
| [`ui`](ui/README.md) | Portal and Agents SPAs and their shared components | Image `qubership-apihub-ui` |
| [`build-task-consumer`](build-task-consumer/README.md) | NestJS builder that builds package versions | Image |
| [`api-processor`](api-processor/README.md) | Builds, compares, and exports package versions | npm package |
| [`api-diff`](api-diff/README.md) | Compares API documents and classifies changes | npm package |
| [`api-unifier`](api-unifier/README.md) | Normalizes API documents | npm package |
| [`api-visitor`](api-visitor/README.md) | Visitor over OpenAPI documents | npm package |
| [`api-doc-viewer`](api-doc-viewer/README.md) | React viewers for API documents and their data model | npm packages |
| [`apispec-view`](apispec-view/README.md) | OpenAPI web component (Stoplight fork) | npm packages |
| [`http-spec`](http-spec/README.md) | HTTP AST from OpenAPI and Postman (Stoplight fork) | npm package |
| [`rest-playground`](rest-playground/README.md) | Component to try REST operations | npm package |
| [`class-view`](class-view/README.md) | UML class diagram component | npm package |
| [`ddlapi`](ddlapi/README.md) | PostgreSQL DDL model and parser | npm package |
| [`graphapi`](graphapi/README.md) | GraphQL to GraphAPI conversion | npm package |
| [`json-crawl`](json-crawl/README.md) | JSON crawl, clone, and transform engine | npm package |
| [`compatibility-suites`](compatibility-suites/README.md) | Test data: the catalogue of API change cases | Nothing; tests consume it |

[The processing libraries guide](../docs/architecture/processing-libraries.md) explains how the libraries fit
together. The dependency order, from low to high, is `json-crawl`, `ddlapi`, `graphapi`, and `compatibility-suites`,
then `api-unifier`, `api-diff`, `api-processor` and `api-doc-viewer`, and last `apispec-view`, `build-task-consumer`,
and `ui`. Nx builds dependencies first.

## pnpm and Nx

- `pnpm-workspace.yaml` covers `frontend/*` and `frontend/*/packages/*`.
- Install once at the repository root with `pnpm install`. Do not run `npm install` in a module: it writes a second
  lock file and resolves `workspace:` ranges from the registry. Run scripts with `pnpm run`.
- Run targets from the root: `pnpm exec nx run <project>:build`, `<project>:test`, and `<project>:lint:check`. A
  target exists only when the module declares the script.
- Project names are the directory names, with three exceptions set by `nx.name` in `package.json`: `ui` splits into
  `ui-root`, `ui-portal`, `ui-agents`, and `ui-shared`; `api-doc-viewer` into `api-doc-viewer-root` and
  `api-doc-viewer-<package>`; and `apispec-view` into `apispec-view` (the `packages/elements` package) and
  `apispec-view-<package>`.
- The commands for the whole repository are in [Build and test](../docs/development/build-and-test.md).

## Storybooks and screenshot tests

`api-doc-viewer`, `apispec-view`, `class-view`, `graphapi`, `rest-playground`, and `ui` (the `ui-shared` project) have a
Storybook. [Debugging](../docs/development/debugging.md) lists the start commands and ports. CI publishes the Storybook
of each branch on GitHub Pages under `storybook/<component>/<branch>/`.

`api-doc-viewer`, `apispec-view`, and `class-view` also run screenshot tests. They drive Chrome in a container through
[`jest-chrome-in-docker-environment`](../tools/README.md#jest-chrome-in-docker-environment), so every machine renders
the same pixels. Install Podman to run them locally. Regenerate snapshots only with the containerized configuration,
for example `pnpm --filter @netcracker/qubership-apihub-api-doc-viewer run regenerate-screenshots`. A failed CI run
uploads the diffs as `screenshot-diffs-<project>`.

## Publishing to npm

The libraries publish to GitHub Packages at release time with `pnpm publish -r --ignore-scripts`, in the same job that
creates the release. Each library has its own tag prefix, such as `api-processor/X.Y.Z`. The
[release process](../docs/development/release-process.md) describes versions, tags, and re-runs.
