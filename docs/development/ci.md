# Continuous integration

GitHub Actions runs every check of the repository. The workflows live in
[`.github/workflows/`](../../.github/workflows/), and their shell and Node.js helpers live in
[`tools/ci/`](../../tools/ci/). One job, `ci-ok`, decides whether a pull request can merge.

For the branch model and the release workflows, see [Release process](./release-process.md). For the commands that
CI runs, see [Build and test](./build-and-test.md).

## The workflows

Each workflow name except `CI` starts with a group prefix: `E2E:`, `Images:`, `Lint:`, `Pages:`, `PR:`, or
`Release:`. The Actions sidebar sorts workflows by name, so each group stays together there. Give a new workflow the
prefix of its group. A workflow that a person starts ends with `(manual)`, and the manual release workflows are
numbered in the order they run.

| Workflow | File | Triggers | What it does |
|---|---|---|---|
| CI | `ci.yml` | push to any branch, pull request, manual | builds and tests what changed, publishes images and Storybooks, runs E2E, gives the verdict `ci-ok` |
| E2E: Kind | `e2e-tests-kind.yml` | called by `ci.yml` and `e2e-tests-manual.yml` | installs the Helm charts on Kind, runs Newman and Playwright |
| E2E: Podman Compose | `e2e-tests-compose.yml` | called by `e2e-tests-manual.yml` | the same suites against a Compose stack, without the agent |
| E2E: Run tests (manual) | `e2e-tests-manual.yml` | manual, nightly at 00:00 UTC | E2E against images you name; see [Manual E2E](#manual-e2e) |
| Images: Build | `images.yml` | called by `ci.yml` | builds an image when its content is new, otherwise retags the existing one |
| Images: Clean up | `images-gc.yml` | branch deletion, twice a day, manual | deletes image versions that no branch or tag needs |
| Images: Security scan | `security-scan-apihub.yml` | weekly (Sunday 03:00 UTC), manual | Grype and Trivy over the published images or the source tree |
| Lint: Code base | `super-linter.yaml` | push to any branch, pull request, manual | super-linter on the changed files; `full_scan` lints everything |
| Lint: Go module licenses | `go-check-license.yaml` | changes to `go.mod`, `go.sum`, or `wwhrd.yml`; manual | checks dependency licenses of every Go module |
| Lint: Markdown links | `link-checker.yaml` | push, pull request, manual | lychee over every Markdown file |
| Pages: Database ERDs | `erd.yml` | push to `develop` or `main` that changes SQL migrations, manual | renders the ERD of each backend that owns a database |
| Pages: Publish | `pages.yml` | dispatched by `ci.yml` and `erd.yml`, branch deletion, daily, manual | assembles and deploys the GitHub Pages site |
| PR: CLA | `cla.yaml` | pull request, comment | asks first-time contributors to sign the CLA |
| PR: Commit messages | `pr-conventional-commits.yaml` | pull request opened, edited, or updated | checks the commit messages of the pull request |
| PR: Labels | `automatic-pr-labeler.yaml` | pull request into `develop`, `release`, or `main` | adds type labels and `module:<name>` labels by path |
| PR: Reviewers | `pr-assigner.yml` | pull request into `develop`, `release`, or `main` | assigns reviewers |
| PR: Title | `pr-lint-title.yaml` | pull request opened, edited, or updated | checks that the title is a Conventional Commit |
| Release: 1. Start (manual), Release: 2. Finish (manual), Release: Sync | `release-*.yml` | manual; `release-sync.yml` on push to `release` | the release flow, see [Release process](./release-process.md) |
| Release: Artifacts | `release-artifacts.yml` | called by `ci.yml` on `main` | publishes image version tags, npm packages, Helm charts, GitHub Releases |

Only `ci-ok` is a required check. The linters, the link checker, the license check, and the title checks report
on the pull request, and reviewers expect them green, but they do not block the merge by themselves.

## The jobs of CI

`ci.yml` runs once per push and once per pull request event. A newer push to the same ref cancels the older run,
except on `main` and `release`, where runs queue: a run there publishes images and must not stop half-way.

| Job | Runs when | Does |
|---|---|---|
| `plan` | always | computes the affected projects (`nx show projects --affected`), the branch tag, the E2E tier, and whether the run may publish |
| `js` | always | `pnpm test:tools`, then `nx affected -t build test` for everything except Go and Maven projects |
| `go-checks` | always | one Go version in every module; every `go.mod` matches the workspace |
| `charts` | always | lints and validates the product chart and the agent chart |
| `go` | a Go module is affected | builds and tests the affected Go modules and checks that the binaries exist |
| `java` | a Java project is affected | builds and tests the Maven reactor through `nx run java-task-consumer:build` |
| `screenshot-tests` | `api-doc-viewer`, `apispec-view`, or `class-view` is affected | builds the Storybook and compares screenshots in a Chrome container |
| `js-images`, `go-images`, `java-images` | the run may publish | build or retag the eight images after the tests of their language pass |
| `e2e` | the E2E tier is not `none` | runs `e2e-tests-kind.yml` against this run's images |
| `storybooks` | push (not a pull request) that may publish | stores the six Storybooks in `ghcr.io` |
| `storybook-pages` | after `storybooks`, when `PAGES_DEPLOY` is `true` | dispatches `pages.yml` |
| `ci-ok` | always | the verdict |
| `release-artifacts` | `main`, after `ci-ok`, when the commit carries release tags | publishes the release |

"The run may publish" is false for a pull request from a fork and for every Dependabot run: their token cannot
write packages, so the image, E2E, and Storybook jobs are skipped.

## The required check: `ci-ok`

`ci-ok` always runs and needs every other job of `ci.yml` except the two release jobs that run after it.
[`tools/ci/ci-verdict.js`](../../tools/ci/ci-verdict.js) reads the results and fails when a job failed or was
cancelled, or when a job that had to run was skipped. A skip is accepted only where the plan makes it correct:

- `go`, `java`, `screenshot-tests`: nothing in their area is affected;
- `e2e`: the E2E tier is `none`;
- `storybooks`, `storybook-pages`: a pull request, or `PAGES_DEPLOY` is not `true` (`storybook-pages` only);
- the image jobs, `e2e`, and the Storybook jobs: the run may not publish.

The workflow has no path filters, so a documentation-only pull request also gets `ci-ok`. When you add a job to
`ci.yml`, add it to the needs of `ci-ok` and decide in `ci-verdict.js` when its skip is correct.
`ci-verdict.test.js` fails otherwise.

## Image tags

Every image goes to `ghcr.io/netcracker/<image>` under two kinds of tag:

- `src-<hash>`: the content tag. The hash covers the sources of the project and its dependencies, the Dockerfile,
  `.dockerignore`, and the lockfile ([`tools/ci/image-input-hash.sh`](../../tools/ci/image-input-hash.sh)). An
  image is built only when its content tag is new; otherwise the job retags the existing image.
- The branch tag: a floating alias of the content tag, from
  [`tools/ci/branch-tag.sh`](../../tools/ci/branch-tag.sh).

| Ref | Branch tag |
|---|---|
| `develop` | `dev` |
| `release` | `next` |
| `main` | `latest` |
| `feature/123-add-export` | `feature-123-add-export` |
| pull request 42 | `pull-42-merge` |
| a release (on `main`) | `<version>`, set by `release-artifacts` |

Characters other than letters, digits, `_`, `.`, and `-` become `-`. To see the tag of a branch, run the script:

```bash
bash tools/ci/branch-tag.sh refs/heads/feature/123-add-export
```

`release` and `main` get images for `linux/amd64` and `linux/arm64`; every other ref gets `linux/amd64` only. Use a
`src-<hash>` tag when you need exact content: the branch tag moves with the next push.

## E2E tiers

The `plan` job picks the tier once per commit, so a push and its pull request do not both run E2E:

| Event | Tier |
|---|---|
| pull request | `full`; `none` when only `docs/` or Markdown files changed |
| push to `release` | `full` |
| push to a branch with an open pull request | `none`: the pull request run covers the commit |
| push to a branch without a pull request | `none` |

`full` runs the Newman collections and the Playwright `Portal` project (without `@flaky` tests) on a Kind cluster.
The `smoke` tier (the `1_1_Smoke_Portal` collection and the `@smoke` Playwright tests) exists in the E2E workflows,
but `plan` does not select it.

The default collections come from [`tools/ci/e2e-collections.sh`](../../tools/ci/e2e-collections.sh):
`1_1_Smoke_Portal`, `1_3_Linter_Portal`, `2_1_Negative_Portal`, `3_1_Stories_Bugs`, `3_2_Stories_Bugs`, and
`4_Access_control`, plus `1_2_Smoke_Agent` on Kind when the agent is deployed. Print the list for a runtime with:

```bash
bash tools/ci/e2e-collections.sh kind "" full true
```

## Manual E2E

`e2e-tests-manual.yml` runs the full E2E suite against images you name. It builds, publishes, and gates nothing.
The same workflow runs every night with its defaults: Kind, `dev` images, `deploy/` from `main`, and the suites
from `develop`. It has nine inputs:

| Input | Default | Meaning |
|---|---|---|
| `runtime` | `kind` | `kind` (the Helm charts, with the agent, as in CI), `compose` (`deploy/docker-compose/apihub-generic`), or `compose-keycloak` (`deploy/docker-compose/with-keycloak`); Compose runs no agent |
| `deploy-ref` | `main` | branch, tag, or commit of `deploy/` and of the agent chart |
| `image-tags` | every key `dev` | JSON object with the keys `backend`, `buildTaskConsumer`, `ui`, `apiLinterService`, `agentsBackend`, and `agent`; a missing key means `dev` |
| `suites` | `all` | `all`, `postman`, or `playwright` |
| `postman-ref` | `develop` | ref of `tests/postman-collections` |
| `postman-collections` | empty | comma-separated collections, as `1_1_Smoke_Portal` or `./e2e/1_1_Smoke_Portal.postman_collection.json`; empty means the default list |
| `playwright-ref` | `develop` | ref of `tests/ui-tests` |
| `playwright-args` | empty | arguments of `playwright test`; empty means `--project=Portal --grep-invert=@flaky` |
| `agent` | `true` | deploy the agent and run its collection (Kind only) |

Run it from **Actions > E2E: Run tests (manual) > Run workflow**, or with `gh`:

```bash
gh workflow run e2e-tests-manual.yml --repo Netcracker/qubership-apihub \
  -f runtime=kind \
  -f image-tags='{"backend":"feature-123-add-export","ui":"feature-123-add-export"}' \
  -f postman-ref=feature/123-add-export \
  -f playwright-ref=feature/123-add-export
```

Use this to test a backend branch and a frontend branch together: give each image its branch tag, and take the
suites from the branch that changes them. `tools/ci/e2e-image-tags.js` rejects an unknown key, such as
`agentBackend`, before anything is deployed.

## GitHub Pages and the ERDs

`pages.yml` publishes one site with the navigation page, the landing, the documentation, the Storybooks of every
live branch, and the database ERDs. It deploys only from the default branch and only when the repository variable
`PAGES_DEPLOY` is `true`. Before the upload, lychee checks the internal links of the assembled site offline, and a
broken one fails the run. `erd.yml` renders the ERD of `portal-backend`, `api-linter-service`, and `agents-backend`
when their migrations change, stores the render in `ghcr.io`, and dispatches `pages.yml`. Run `erd.yml` by hand
with `force` to render every backend again.

How the site picks its ref, the size budget, and the fallbacks for a missing render are in
[Release process: GitHub Pages](./release-process.md#github-pages).

## Rerun a run

- **A flaky job:** open the run and choose **Re-run failed jobs**, or run
  `gh run rerun <run-id> --failed`. GitHub reruns the failed jobs and the jobs that depend on them, including
  `ci-ok`.
- **A new commit:** a push starts a new run and cancels the older one on the same ref.
- **CI did not start:** check that the workflow is not disabled, then start it by hand with
  `gh workflow run ci.yml --ref <branch>`. A manual run is not a pull request event, so it runs no E2E (except on
  `release`).
- **E2E only:** run `e2e-tests-manual.yml` with the branch tags of the failing run.

To list the recent runs of your branch:

```bash
gh run list --workflow ci.yml --branch <branch> --limit 5
gh run view <run-id> --log-failed
```

## Read a red run

1. Open the `ci-ok` job first. Its summary is a table with the result of every job, whether the job was due, and
   the verdict on it. The line **Not ok** names the jobs to look at.
2. A skipped job that should have run points at `plan`. The `plan` summary shows the affected projects as a graph
   and the reason for the E2E tier.
3. For a build or test failure, open the job log. `js`, `go`, and `java` run Nx with `--verbose`, so the failing
   target is printed with its command. Reproduce it locally with
   `pnpm exec nx run <project>:<target>`; see [Build and test](./build-and-test.md).
4. Most jobs end with a cache summary. A job that rebuilt everything says so there.
5. Download the artifacts of a failed job from the run page:

   | Artifact | Job | Content |
   |---|---|---|
   | `surefire-reports` | `java` | Maven test reports |
   | `screenshot-diffs-<project>` | `screenshot-tests` | PNG diffs of the failed screenshots |
   | `newman-reports` | `e2e` | HTML and JSON report per collection |
   | `playwright-reports` | `e2e` | the Playwright reports and the test results |
   | `kubernetes-logs` | `e2e` | pod logs and events of the Kind cluster |

6. In the `e2e` job, the test steps continue on error so that both suites run and every report is uploaded; the
   last step, **Verdict**, fails the job. A red step before the tests, such as **Wait for APIHUB to answer**, means
   that the stack did not start: read `kubernetes-logs`. A red verdict after green setup steps means a test failed:
   read `newman-reports` or `playwright-reports`.
7. An image job that stops at **Verify the build outputs exist** found no build output for a file that the
   Dockerfile copies: the Nx build of that project produced less than the image needs.

To debug a failing E2E test locally, see [Debugging](./debugging.md).
