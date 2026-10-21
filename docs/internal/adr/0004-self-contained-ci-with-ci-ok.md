# Self-contained CI with `ci-ok` as the one required check

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10-19

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev, @viacheslav-lunev, @karpov-aleksandr)

#### Related ADRs

[0003](./0003-pnpm-nx-go-workspace-and-maven.md), [0005](./0005-release-flow-with-per-component-bumps.md)

<!-- markdownlint-enable MD001 -->

## Context

The polyrepos called reusable workflows from `qubership-apihub-ci`, and the umbrella launched end-to-end tests by
dispatching workflows with many per-repository branch inputs. In one repository, a pull request touches only some
modules, and a job skipped by a path filter reports nothing. A required check that depends on a skipped workflow
blocks the merge forever or, worse, lets it through.

## Decision

We will keep CI inside this repository (`.github/workflows/`, `.github/actions/setup-workspace`, `tools/ci/`), with no
call to reusable workflows of `qubership-apihub-ci`. That repository stays for projects outside the monorepo and for
organization reports.

`ci.yml` has no `paths-ignore`, so it always starts. Its last job, `ci-ok`, depends on every other job and fails when
a required job failed or was skipped by mistake. `ci-ok` is the only required status check on `develop`, `release`,
and `main`. `tools/ci/ci-verdict.js` computes the verdict, and its tests check that `ci-ok` needs every job of the
file.

Images publish with branch tags, `pull-N-merge`, and `src-<hash>` tags. End-to-end suites (Postman and Playwright, on
Kind and Compose) run through `e2e-tests-kind.yml`, `e2e-tests-compose.yml`, and a manual `e2e-tests-manual.yml`
whose nine inputs name the runtime, the refs, the image tags, and the suites. The full suite runs on every push to
`release`.

### Justification

- A single required check means branch protection does not list jobs, so adding or renaming a job needs no ruleset
  change.
- Self-contained workflows are versioned with the code they test, so one pull request can change a module and its CI.
- Rejected: required checks per job. Path filters make them report inconsistently.
- Rejected: calling `qubership-apihub-ci`. A CI change there would affect `develop` without review in this repository.

## Consequences

- Every new job must be added to the `needs` of `ci-ok`, and `tools/ci/ci-verdict.js` must say when it may be
  skipped. A job that the script does not know fails the verdict.
- Tests in `tests/` run against the images built from the same commit, so a pull request that breaks them also
  fixes them (see [the team process](../process.md)).
- The workflows are the contract. [CI](../../development/ci.md) describes how to read a red run.
