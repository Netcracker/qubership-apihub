# Migration plan and outcome

The plan followed the [decisions](./decisions.md). Steps ran in the order below. Each one after the import went into
its own pull request of the [stack](./README.md#the-stacked-pull-requests). Step names keep the labels the work used.

## Order of work

```text
P prepare ─► T0 freeze ─► 0A import ─► 0B workspace ─► 0C CI ─► R release flow ─► 1 GitHub root config
  ─► 2 APM ─► 7 leftovers ─► 8 organization workflows ─► 4-5 release notes ─► 5A image cleanup ─► 6 charts
  ─► 11 landing ─► 9 Pages ─► 10 wikis into docs ─► 3plus documentation ─► workflow names ─► Finalization
```

Step 12 (an AI assistant for pull requests) is out of scope for this migration (D10).

## Steps and outcomes

| Step | What it did | Outcome |
|---|---|---|
| P: prepare | Revoked a token found in the old release-notes scripts, pinned tools, and agreed the organization admin checklist (package access, secrets, rulesets). | Done by 2026-10-18. |
| 0A: import | Rewrote the history of 26 repositories with `git-filter-repo` into `develop` and `main` (a subfolder per module, prefixed tags, `#N` references qualified, the linter's binaries stripped). Recreated the GitHub releases. Transferred open issues. | Pushed once, at T0, 2026-10-18: 383 tags, 331 releases recreated, 29 open issues transferred. Every module tree equals its source branch. |
| 0B: workspace ([#869](https://github.com/Netcracker/qubership-apihub/pull/869)) | One pnpm workspace, Nx graph, Go workspace, and Maven build under Nx. Package scope and Go module paths restored to the Netcracker names. `helm-templates/` and `docker-compose/` moved to `deploy/`. | `pnpm install`, `nx run-many -t build test`, both Go modes, `mvn verify`, and all images build from a fresh clone. |
| 0C: CI ([#870](https://github.com/Netcracker/qubership-apihub/pull/870)) | Self-contained workflows: build, test, images, E2E on Kind and Compose, and the `ci-ok` gate ([ADR 0004](../adr/0004-self-contained-ci-with-ci-ok.md)). One manual E2E workflow replaced the two that called `qubership-apihub-ci`. | CI green on the branch, including Kind E2E. |
| R: release flow ([#871](https://github.com/Netcracker/qubership-apihub/pull/871)) | One Nx release group per component, bumps from Conventional Commits fed to Nx as version plans, and the start, sync, and finish workflows ([ADR 0005](../adr/0005-release-flow-with-per-component-bumps.md), [Release process](../../development/release-process.md)). | Dry runs pass on the imported tags. The first real release is the first after the merge. |
| 1: GitHub root config ([#872](https://github.com/Netcracker/qubership-apihub/pull/872)) | One CODEOWNERS file and one Dependabot configuration at the root. Every nested `.github/workflows/` removed. | No errors in CODEOWNERS or Dependabot. |
| 2: APM ([#873](https://github.com/Netcracker/qubership-apihub/pull/873)) | One `apm.yml` and one lock file at the root, module instructions scoped by path, hand-written `AGENTS.md` per group and module, and the `apihub-add-go-service` skill. | `apm install` is clean. `apm compile` is not used because it does not finish on a repository this size. |
| 7: leftovers ([#875](https://github.com/Netcracker/qubership-apihub/pull/875)) | Removed duplicate community files, per-module `.npmrc` and lockfiles, and polyrepo metadata. | Repository links point at the monorepo. |
| 8: organization workflows ([#876](https://github.com/Netcracker/qubership-apihub/pull/876)) | Labeler, assigner, super-linter, and link checker configured by path, and the Markdown backlog fixed. | The checks pass on the stack. |
| 4-5: release notes ([#878](https://github.com/Netcracker/qubership-apihub/pull/878)) | Generators for module and product release notes, run in the `release-artifacts` job. | Run read-only against real data. |
| 5A: image cleanup ([#880](https://github.com/Netcracker/qubership-apihub/pull/880)) | `images-gc.yml` deletes ghcr versions that no branch or tag needs, including the legacy backlog. | In the stack; merged with it. |
| 6: charts ([#881](https://github.com/Netcracker/qubership-apihub/pull/881)) | The product and agent charts are pinned at package time and published to OCI ([ADR 0006](../adr/0006-charts-pinned-at-package-time-published-to-oci.md)). | Fixture-tested with real `helm` and `kubeconform`. |
| 11: landing ([#882](https://github.com/Netcracker/qubership-apihub/pull/882)) | The landing moved to `sites/landing`, built in the workspace, with its images local and its links pointing at the new docs. | Builds under `/qubership-apihub/landing/`. |
| 9: Pages ([#883](https://github.com/Netcracker/qubership-apihub/pull/883)) | `pages.yml` and `erd.yml` publish a navigation page, the landing, the docs, the Storybooks, and one ERD per backend ([ADR 0007](../adr/0007-pages-layout-and-the-storybook-and-erd-stores.md)). | Tested on GitHub with temporary triggers: 188 MiB, three ERDs. The switch of the Pages source waits for the merge. |
| 10: wikis into docs ([#884](https://github.com/Netcracker/qubership-apihub/pull/884)) | Moved the content of the three wikis into `docs/` by topic, copied every image, and added the Starlight site in `sites/docs`. | The docs site builds; 128 pages. |
| 3plus: documentation ([#886](https://github.com/Netcracker/qubership-apihub/pull/886)) | Gave every document one home ([ADR 0008](../adr/0008-documentation-architecture-and-docs-site.md)). Wrote the developer guide, the root README, `CONTRIBUTING.md`, the group READMEs, and the ADRs. | Links resolve; markdownlint and textlint are clean. |
| Workflow names ([#887](https://github.com/Netcracker/qubership-apihub/pull/887)) | Grouped workflow names by prefix and marked the ones that a person starts. | Required checks keep their job names. |
| Finalization | Fixed what the last four steps raised: image sizes, documentation gaps, the docs site links, and this record. | In review. |

## After the stack merges

The [merge plan](./README.md#merge-plan) lists what follows the merge: the Pages switch, the wiki Home pages, and the
pull request to `Netcracker/netcracker.github.io`. The release flow is first used for the next product release, which
continues from the tag `2.15.0`.

## Risks that were planned for

| Risk | Handling |
|---|---|
| A mistake reaches the production repository, because there is no sandbox (D8). | The import ran and was checked locally several times, then pushed once. |
| The freeze lasts longer than planned (D9). | The wiring was prepared locally and landed as a stack (D11). |
| Nx release does not support Go or Java (D12). | A spike before the release flow; custom version actions. |
| The first publish fails on package permissions. | The admin checklist in step P. |
| Pages grows over the size limit. | A Storybook budget in `pages.yml`. |
