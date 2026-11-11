# Renovate for dependency updates

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-11-10

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev)

#### Related ADRs

[0004](./0004-self-contained-ci-with-ci-ok.md): the CI that builds and tests each dependency update.
[0005](./0005-release-flow-with-per-component-bumps.md): the release flow that bumps a component for a
`chore: deps:` commit.

<!-- markdownlint-enable MD001 -->

## Context

Dependabot updated the dependencies of the monorepo from `.github/dependabot.yml`: GitHub Actions, the pnpm
workspace, six Go modules, the Maven reactor of `java-task-consumer`, eleven Dockerfiles, and two user Compose stacks.
It opened weekly pull requests, one per dependency for npm and Go and one group for each other ecosystem, with the
`chore: deps:` prefix. Dependabot security updates were off.

Renovate is the dependency bot of the Netcracker organization. The Mend-hosted Renovate app is installed on this
repository. The organization defaults in `Netcracker/renovate-config` add a 7-day release age, security updates from
Dependabot alerts and OSV, and Netcracker-specific versioning rules for the base images.

The Go workspace needs a second step after each Go update: `go work sync` and `go mod tidy` in the other modules
(`renovate-go-work-sync.yml`, formerly `dependabot-go-work-sync.yml`). Neither bot runs it. The Mend-hosted app
blocks `postUpgradeTasks`, which could run it.

## Decision

We will update the dependencies with the Mend-hosted Renovate app, configured in `.github/renovate.json`.

The configuration extends `github>Netcracker/renovate-config:org-inherited-config` and takes its release age and
security updates. Everything else keeps what `dependabot.yml` chose: the same files (`includePaths`), the weekly
schedule on Monday, the grouping, the labels, the version exclusions, and the `chore: deps:` prefix. Where the
organization defaults change the pull requests we get, the repository overrides them: no digest pinning, no
monorepo groups, no dependency dashboard, plain `X.Y.Z` tags for `qubership-core-base`.

Renovate opens the security updates. Dependabot alerts stay on as one of their sources. Dependabot version and
security updates stay off.

### Justification

- Renovate is what the rest of the organization runs, so the organization presets and the people who maintain them
  apply here too. The 7-day release age keeps a just-published release, including a compromised one, out of our
  pull requests for a week.
- Security updates come through the same bot, with the same prefix and labels as the other updates, and do not wait
  for the schedule or the release age.
- Rejected: keep Dependabot. It has no release age, and the organization presets do not apply to it.
- Rejected: take the organization defaults unchanged. Digest pinning and the monorepo groups would change most of our
  pull requests, and a pinned digest makes every image and action reference harder to read.
- Rejected: run Renovate self-hosted to allow `postUpgradeTasks` for the Go workspace sync. It needs a runner, a
  token, and upgrades of its own, for one step that a workflow already does.

## Consequences

- `.github/renovate.json` is the place for a new dependency rule or a new directory. A Go module or a Dockerfile
  directly under `backend/` is covered by a glob; one elsewhere needs a line in `includePaths`.
- The pull request limit is shared: Renovate counts open pull requests per repository, not per ecosystem. The cap is
  24 (10 npm, 10 Go, and the four groups), where Dependabot allowed 10 for each ecosystem.
- The Go workspace sync stays a workflow. It runs on the `renovate/gomod-` branches and pushes with
  `GO_WORK_SYNC_TOKEN` from the Actions secrets. Renovate ignores its commit (`gitIgnoredAuthors`), so it keeps
  rebasing the branch.
- CI, the AI Autonomous agent, and the PR labeler treat `renovate[bot]` as they treat `dependabot[bot]`: the
  Storybook jobs are skipped, and the agent does not review dependency updates.
- A Renovate run has no local dry run here. Super-linter validates the configuration, and the Mend Developer Portal
  shows the log of each run.
- Renovate does not open security pull requests for transitive npm dependencies in `pnpm-lock.yaml`, and the
  lockfile maintenance that would refresh them is off, as it was with Dependabot. Those alerts need an override or an
  update of the parent package.
- A new major of a Go module at v1 or later changes the module path. Renovate does not offer it; it stays a manual
  migration, as with Dependabot.
