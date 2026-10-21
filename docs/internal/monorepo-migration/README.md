# Monorepo migration record

In October 2026 the APIHUB component repositories moved into this repository. This folder is the final record of that
work: what was done, in which order, and why.

- [Plan](./plan.md): the steps and what each one delivered.
- [Decisions](./decisions.md): the decisions D1 to D19 and the assumptions A1 to A9, with dates.

The durable architectural decisions that came out of the migration are also written as
[architecture decision records](../adr/README.md).

## What the migration was

Before the migration, APIHUB lived in 27 repositories: the umbrella repository (`qubership-apihub`, with the Helm
chart, the Compose files, and the wiki), the Go and Java services, the UI, the builder, 13 TypeScript libraries, two
test suites, a Docker image for Jest, the product landing, and three wikis. Each repository had its own CI, release
flow, and documentation.

Now `Netcracker/qubership-apihub` holds all of them as modules of one pnpm, Nx, Go, and Maven workspace. The layout is
in the [root README](../../../README.md#where-the-repositories-went). The import kept the history of each module
and every tag and GitHub release; the landing and the wikis arrived as plain commits, without history.

## Timeline

| Date | Event |
|---|---|
| 2026-10-18 | The old repositories were frozen (T0). The history of every component was rewritten, merged into `develop` and `main`, and pushed with 383 prefixed tags. The 331 GitHub releases were recreated, and the 29 open issues were transferred. The default branch became `develop`. |
| 2026-10-18 to 2026-10-21 | The workspace, CI, release flow, and the rest of the wiring were built as a stack of pull requests (see below). |
| 2026-10-21 | The last step, the documentation, was finished and the workflow names were grouped. |

## The freeze

Development in the old repositories stopped at T0. New work waits until the whole stack is merged, so nothing else
lands in `develop` and no branch needs a rebase. The old repositories stay readable. They are archived by hand after
the merge: the migration did not port open pull requests, add banners, or redirect `gh-pages`.

## The stacked pull requests

Each step branched from the previous step's branch and opened a pull request into it. The pull request of the first
step targets `develop`. Open pull requests are listed here from the bottom of the stack to the top.

| Pull request | Step |
|---|---|
| [#869](https://github.com/Netcracker/qubership-apihub/pull/869) | `build: wire the workspace from the prototype (pnpm, Nx, Go, Maven)` |
| [#870](https://github.com/Netcracker/qubership-apihub/pull/870) | `ci: CI workflows and scripts for the monorepo (step 0C)` |
| [#871](https://github.com/Netcracker/qubership-apihub/pull/871) | `ci(release): release flow for the monorepo (step R)` |
| [#872](https://github.com/Netcracker/qubership-apihub/pull/872) | `chore(github): CODEOWNERS, Dependabot and workflows at the root (step 1)` |
| [#873](https://github.com/Netcracker/qubership-apihub/pull/873) | `chore(apm): one APM setup at the repository root` |
| [#875](https://github.com/Netcracker/qubership-apihub/pull/875) | `chore: remove polyrepo leftovers (step 7)` |
| [#876](https://github.com/Netcracker/qubership-apihub/pull/876) | `ci: organization workflows and linters (step 8)` |
| [#878](https://github.com/Netcracker/qubership-apihub/pull/878) | `build(release): release notes generators (steps 4-5)` |
| [#880](https://github.com/Netcracker/qubership-apihub/pull/880) | `ci(images): image cleanup in ghcr (step 5A)` |
| [#881](https://github.com/Netcracker/qubership-apihub/pull/881) | `build(release): publish the product and agent Helm charts (step 6)` |
| [#882](https://github.com/Netcracker/qubership-apihub/pull/882) | `feat(landing): move the product landing into the monorepo` |
| [#883](https://github.com/Netcracker/qubership-apihub/pull/883) | `ci(pages): publish the landing, docs, Storybooks, and ERDs on one Pages site` |
| [#884](https://github.com/Netcracker/qubership-apihub/pull/884) | `docs: move the wiki content into docs/ and publish it with Starlight` |
| [#886](https://github.com/Netcracker/qubership-apihub/pull/886) | `docs: give every document one home and add the developer guide` |
| [#887](https://github.com/Netcracker/qubership-apihub/pull/887) | `ci: group workflow names by prefix and mark manual ones` |

The numbers between #869 and #887 that are not in the table (#874, #877, #879, #885) are unrelated issues and a
separate bug-fix pull request.

## Merge plan

1. Before the merge, the repository admin allows merge commits once. A squash merge would join file moves and edits
   and lose the per-component history of the wiring.
2. `ci-ok` is made a required check before the bottom pull request is merged, so that the bottom pull request passes it.
3. The stack merges top-down: the top pull request into its parent first, and #869 into `develop` last.
4. Squash-only merging is restored.
5. After the merge, in this order:
   - Switch the Pages source to GitHub Actions and set the `PAGES_DEPLOY` variable; [CI](../../development/ci.md)
     describes the variable and [ADR 0007](../adr/0007-pages-layout-and-the-storybook-and-erd-stores.md) the layout.
   - Remove the `.lycheeignore` entry for the not yet published Pages site.
   - Push the new Home and sidebar pages to the main wiki.
   - Merge the pull request to `Netcracker/netcracker.github.io` that removes the old landing.
