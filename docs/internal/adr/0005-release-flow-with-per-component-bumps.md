# Release flow with per-component bumps fed to Nx as version plans

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev, @viacheslav-lunev, @karpov-aleksandr)

#### Related ADRs

[0002](./0002-layout-and-tag-prefixes.md), [0003](./0003-pnpm-nx-go-workspace-and-maven.md),
[0006](./0006-charts-pinned-at-package-time-published-to-oci.md)

<!-- markdownlint-enable MD001 -->

## Context

Each component has its own version and tag ([0002](./0002-layout-and-tag-prefixes.md)), and a release is started by
hand at the end of a sprint. The requirements: tag only the modules that changed, publish images under the tag's
version, publish libraries to npm, bump from Conventional Commits, give dependents a patch bump, and continue every
numbering from the imported tags. Go and Java components have no manifest that holds a version.

A spike on the imported tags (`nx release --dry-run`, Nx 23) showed that everything works except one rule. Nx counts
every commit of a dependency as the dependent's own commit, with the commit's type. A `feat!` in `api-unifier` would
make the UI, the builder, `api-diff`, and `api-processor` major releases.

## Decision

We will compute the bump of each component from its own directory, and feed the result to Nx as version plans.

- `tools/release/version-plan.js` reads the squash-merged Conventional Commits since the component's last tag, limited
  to its folder, and writes an Nx version plan. Nx applies it, and every dependent of a released component gets
  exactly a patch bump.
- `nx.json` has one release group per component, tag pattern `<component>/{version}`. `ui`, `apispec-view`,
  `api-doc-viewer`, and `java-task-consumer` are fixed groups. Go and Java use tag-only version actions
  (`tools/release/version-actions/`) that read the version from tags and write nothing.
- Bumps: `feat` is minor; `fix`, `perf`, `revert`, `refactor`, `build`, `chore`, and `style` are patch; `docs`, `test`,
  and `ci` give none; `!` or a `BREAKING CHANGE:` footer is major. `nx.json` lists the types explicitly because Nx 23
  bumps only `feat` and `fix` by default.
- The product version is the previous bare tag, bumped by the highest bump among the product components and the
  commits that touch `deploy/` (`tools/release/product-version.js`). The agent has its own version.
- Three workflows run the release: `release-start.yml` fast-forwards `release` to `develop`, `release-sync.yml` merges
  every push to `release` back into `develop`, and `release-finish.yml` (with a dry run and a `sprint` input) versions,
  tags, pushes `main` atomically, and back-merges. A `release-artifacts` job in CI publishes images, npm packages,
  charts, and GitHub Releases from `main` (pull request #871; the process is in
  [the release process](../../development/release-process.md)).
- Pull requests are squash-merged, so each commit message is a linted pull request title. The bots push with a deploy
  key that bypasses the rulesets.

### Justification

- Version plans keep Nx as the engine for versions, tags, and groups while correcting its one wrong rule.
- Only modules with a bump get a new tag and image, so unchanged modules keep their version.
- Rejected: plain `nx release` with its dependency counting. It produces wrong major bumps.
- Rejected: a new tag and an identical image for every module on every release.
- Rejected: `nx-go` release support. It does not exist in the version used.

## Consequences

- The first release from the monorepo bumps almost every component, because the wiring commits touch them.
- Never squash-merge a sync of `release` into `develop`: it drops the link to the `release` commits, and Nx would
  count hotfixes twice.
- The repository needs squash-only merging, no required linear history, and a deploy key with ruleset bypass.
- Moving to a newer Nx should retest the dependency rule. If Nx fixes it, `version-plan.js` can go.
