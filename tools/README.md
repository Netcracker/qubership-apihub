# Tools

Scripts that CI and the release use, the sources of the architecture model, and one library for the screenshot
tests. Run them from the repository root.

## `ci/`

Helpers of `ci.yml`, the E2E workflows, and the Pages workflow. The workflows that call them are in
[CI](../docs/development/ci.md).

- `branch-tag.sh` turns a Git ref into an image tag, such as `develop` into `dev`.
- `image-input-hash.sh` computes the content hash behind a `src-<hash>` image tag.
- `images-gc.js` deletes image versions in ghcr that no live ref needs.
- `ci-verdict.js` and `plan-summary.js` compute the `ci-ok` verdict and render the plan job summary;
  `cache-summary.sh` renders the cache block of each job.
- `go-version-check.sh` and `go-work-sync-check.sh` check that `backend/.go-version`, `go.work`, and every `go.mod`
  agree; `go-artifacts-check.js` validates the Go build artifacts.
- `chart-check.sh` runs `helm lint --strict` and kubeconform on a chart.
- `e2e-collections.sh`, `e2e-image-tags.js`, `overlay-ref.sh`, and `newman-results-check.js` serve the E2E
  workflows: the collection list, the image tags input, taking `tests/` or `deploy/` from another ref, and the Newman
  verdict.
- `storybooks.json`, `storybook-input-hash.sh`, `storybook-store.sh`, `storybook-site.js`, and
  `storybook-strip-maps.js` build and store the Storybooks.
- `erd.js` renders the database ERDs from the SQL migrations. `pages-site.js` lays out the GitHub Pages site.

Files named `*.test.js` are their tests.

## `release/`

The release scripts. [The release process](../docs/development/release-process.md) describes how they fit together.

- `version-plan.js`, `plan.js`, `product-version.js`, `conventional.js`, and `guard.js` decide which components
  release, with which version, and refuse a real version run outside `main`.
- `version-actions/tag-only.js` is the Nx version action for components that version by tag only.
- `artifacts.js` plans the images, npm packages, charts, and GitHub Releases of a release commit.
- `charts.js` stages the Helm charts and pins the image tags.
- `publish-artifacts.sh` publishes the planned artifacts.
- `notes/` writes the release notes; `landing-card.js` checks the release card of the landing.
- `ensure-ci.sh` and `merge-into.sh` serve the release workflows.

## `agent/`

The AI Autonomous agent, described in [its design](../docs/internal/autonomous-agent/design.md).

- `labels.sh` and `labels.ps1` create or update the `ai:*` and `agent:*` labels the agent uses. Run one of them once per
  repository; `--dry-run` (`-DryRun`) prints the commands instead.

## `nx/`

`go-lang-tag.js` is an Nx plugin that tags every Go module with `lang:go`. CI selects the tag in the `go` job and
excludes it in the `js` job.

## `lockfile-diff.js`

Reports whether a `pnpm-lock.yaml` change moves an installed version or only rewires peer dependencies:

```bash
node tools/lockfile-diff.js [<ref>]
```

Without a ref, it compares `HEAD` with the working tree.

## `jest-chrome-in-docker-environment`

A Jest environment that runs Chrome in a container, so screenshot tests give the same pixels on every machine and on
CI. `api-doc-viewer`, `apispec-view`, and `class-view` use it. It needs Podman or Docker. The API is in its
[README](jest-chrome-in-docker-environment/README.md).

## `architecture-model/`

The sources of the architecture model: the capability map, the C4 set, the ArchiMate model, and the decks.
`capability/export_json.py` writes the data file of the landing site. See its
[README](architecture-model/README.md) for the generators and how to run them.
