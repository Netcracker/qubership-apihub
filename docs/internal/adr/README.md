# Architecture decision records

An architecture decision record (ADR) captures one durable decision that shapes several modules or the repository: a
structure, a non-functional requirement, a dependency, a published interface, or a tool. A rough test: if the decision
needed a meeting to settle, record it. ADRs are written for maintainers who were not part of the discussion.

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](./0001-one-repository-for-every-component.md) | One repository for every component | Accepted |
| [0002](./0002-layout-and-tag-prefixes.md) | Repository layout and tag prefixes | Accepted |
| [0003](./0003-pnpm-nx-go-workspace-and-maven.md) | One build graph: pnpm, Nx, Go workspace, Maven under Nx | Accepted |
| [0004](./0004-self-contained-ci-with-ci-ok.md) | Self-contained CI with `ci-ok` as the one required check | Accepted |
| [0005](./0005-release-flow-with-per-component-bumps.md) | Release flow with per-component bumps fed to Nx as version plans | Accepted |
| [0006](./0006-charts-pinned-at-package-time-published-to-oci.md) | Helm charts pinned at package time and published to OCI | Accepted |
| [0007](./0007-pages-layout-and-the-storybook-and-erd-stores.md) | GitHub Pages layout, and the Storybook and ERD stores | Accepted |
| [0008](./0008-documentation-architecture-and-docs-site.md) | Documentation architecture and the docs site | Accepted |

## Add an ADR

1. Pick the next free number. File names are lowercase with dashes and a four-digit prefix, such as
   `0009-short-decision-title.md`.
2. Copy the template below and fill it in. Keep the `####` heading levels and the markdownlint
   comments around them. Write plain, short sentences in the active voice: "We will ...".
3. Start with the status `Proposed` and leave the date blank. Set `Accepted` and the ISO 8601 date (`2026-10-21`) when
   the team signs off.
4. Add a row to the index above and link the ADR from the pages it affects.
5. Open a pull request. The ADR is reviewed like code.

An accepted ADR is final. To change a decision, write a new ADR, link the two in both directions under **Related
ADRs**, say in the new record's **Consequences** that it supersedes the old one and why, and set the old record's
status to `Superseded`.

## Template

```markdown
# <Architecture decision title>

## Status

<Proposed | Accepted | Rejected | Superseded>

<!-- markdownlint-disable MD001 -->

#### Date

<ISO 8601 date the decision was accepted; blank while Proposed>

#### Owner

<GitHub account of the person responsible for this ADR>

#### Participants and approvers

<Teams and GitHub accounts involved in the decision>

#### Related ADRs

<Links to related or superseded ADRs, if any>

<!-- markdownlint-enable MD001 -->

## Context

<The problem and the forces at play: technical, organizational, project-specific. Facts, without judgment.>

## Decision

<The decision, in active voice: "We will ...".>

### Justification

<Why this option won, which alternatives were considered, and why they were rejected.>

## Consequences

<The resulting context: positive, negative, and neutral effects on the team and the project.>
```
