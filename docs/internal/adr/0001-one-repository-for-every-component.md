# One repository for every component

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10-18

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev, @viacheslav-lunev, @karpov-aleksandr)

#### Related ADRs

[0002](./0002-layout-and-tag-prefixes.md), [0003](./0003-pnpm-nx-go-workspace-and-maven.md)

<!-- markdownlint-enable MD001 -->

## Context

APIHUB was developed in about 25 repositories: the backend services, the linter, the agent, the builder, the UI, 13
TypeScript libraries, the Java task consumer, two test suites, and an umbrella repository that held the Helm chart,
the Compose stacks, the guides, and the issues. One change often spanned several of them. A new API field needed a
backend pull request, a library release, a UI pull request, a Postman update, and a chart change, each with its own
CI, review, and version. Libraries reached the UI through npm dist-tags (`dev`, `next`), so a branch build could pull
whatever was published last.

Product issues were already tracked in `Netcracker/qubership-apihub`, which made it the natural entry point.

## Decision

We will keep the source code of every component, its deployment assets, its tests, and its documentation in
`Netcracker/qubership-apihub`. The former repositories became modules of it.

The migration was one cutover. The polyrepos were frozen, the history of each module was rewritten into the
monorepo and merged without rewriting the umbrella history, tags and GitHub Releases were recreated, and open issues
were transferred. The wiring (workspace, CI, release flow, docs) reached `develop` as a stack of pull requests
(numbers 869 to 884), each opened into the previous one, so nothing else landed in `develop` during the freeze.
The old repositories stay readable and are archived by hand.

### Justification

- One pull request carries a change across modules, and CI tests the result together (see
  [0004](./0004-self-contained-ci-with-ci-ok.md)).
- Internal dependencies are workspace links, so an image built from a commit contains the libraries of that commit.
  The `dev` and `next` dist-tags are no longer needed.
- Rejected: keeping the polyrepos and improving the umbrella. It leaves the version skew and the per-repository
  release overhead in place.
- Rejected: Git submodules. They pin versions but still need a pull request per repository.
- Rejected: importing only a snapshot, without module history. The histories are small (the UI is 12 MiB),
  and `git blame` and old tags keep their value.

## Consequences

- Positive: atomic cross-module changes, one CI, one place for issues, one set of rules.
- Negative: a bigger repository and a busier `develop`. CI must scale with path-based jobs and the Nx graph.
- Negative: rewritten SHAs. Commit links in old issues and release notes point at the archived repositories.
- Neutral: access control becomes path-based (`CODEOWNERS`) instead of per repository.
