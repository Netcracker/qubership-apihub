# Development workflow

How a change travels from an issue to `develop`: the issue, the branch, the commits, the pull request, the review,
and the merge. The release itself is in [Release process](./release-process.md).

## Start with an issue

Every change starts from an issue in
[Netcracker/qubership-apihub](https://github.com/Netcracker/qubership-apihub/issues), the one repository of the product.

1. Open the issue, or pick an existing one.
2. Set its type: `Feature` for a user story or an epic, `Bug` for a defect, `Task` for anything else.
3. Add it to the [qubership-apihub project](https://github.com/orgs/Netcracker/projects/9) (Project 9) and fill in
   the project fields.

The mandatory fields of each work item type, the statuses, and the sprints are in the team process,
[`docs/internal/process.md`](../internal/process.md).

The issue type matters at release time: the release notes put a pull request under features or bugs by the type of
the issues it closes. A pull request with no issue still has to be added to the project.

## Branches

`develop` is the default branch. Branch from it and name the branch after the issue:

| Change | Branch name | Example |
|---|---|---|
| a feature, a task, or a refactoring | `feature/<issue>-<slug>` | `feature/412-asyncapi-diff-filter` |
| a bug fix | `bugfix/<issue>-<slug>` | `bugfix/431-empty-changelog` |

`<issue>` is the issue number; `<slug>` is a few lowercase words joined by hyphens.

```bash
git switch develop
git pull
git switch -c feature/412-asyncapi-diff-filter
```

CI publishes the images of every pushed branch under a tag made from the branch name, with `/` replaced by `-`:
`feature/412-asyncapi-diff-filter` becomes `feature-412-asyncapi-diff-filter`. `develop` publishes `dev`, `release`
publishes `next`, and `main` publishes `latest`. See [CI](./ci.md) for the full list.

A fix that must ship with the release candidate goes into `release` instead. That is the hotfix flow in
[Release process](./release-process.md#hotfix-flow).

## Commits and the pull request title

Pull requests are squash-merged, and the squash commit takes the pull request title and description. The **pull
request title** is therefore the commit that lands on `develop`, and it decides the version bump and the release notes
of every component the change touches. Write it as a [Conventional Commit](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <summary>
```

- `<type>` is one of `feat`, `fix`, `perf`, `refactor`, `revert`, `build`, `chore`, `style`, `docs`, `test`, `ci`.
- `<scope>` is the module name, the same name as in its `module:<name>` label: `portal-backend`, `api-diff`, `ui`,
  `deploy`, `docs`. Leave it out when a change spans several modules.
- `<summary>` is imperative and has no trailing period, for example
  `feat(api-diff): classify removed AsyncAPI channels as breaking`.

The type decides the bump of each component whose directories the change touches: `feat` is minor; `fix`, `perf`,
`refactor`, `revert`, `build`, `chore`, and `style` are patch; `docs`, `test`, and `ci` give none. The full table is in
[Release process](./release-process.md#version-rules).

A breaking change gets `!` after the type (`feat(portal-backend)!: ...`) or a footer line in the pull request
description that starts with `BREAKING CHANGE:` and says what consumers must do. The footer must start a line; the
phrase inside a sentence does not count.

The commits inside the branch never reach `develop`, but the **Conventional Commits PR Check** workflow checks them
too. Give them Conventional Commit messages as well, or squash them before you open the pull request.

## Pull requests

Open the pull request into `develop`, or into the shared feature branch described in
[Features that need frontend and backend changes](#features-that-need-frontend-and-backend-changes).

- **Link the issue.** Use the Development section of the pull request, or a closing keyword such as `Closes #412` in
  the description. A mention in a comment does not link it, and the release notes read only linked closing issues.
- **Describe the change.** Say why it is needed, what it changes, and how a reviewer can verify it. Put the
  `BREAKING CHANGE:` footer here when there is one.
- **Keep a pull request to one change.** Several pull requests may close one issue, but one pull request does not
  carry unrelated work: its title has to describe all of it.
- **Update the docs in the same pull request.** A change to configuration keys, environment variables, ports, or
  mounted files updates the Helm chart, the Compose stacks, and
  [`docs/configuration-reference.md`](../configuration-reference.md) together with the code.
- **Fix the tests you break.** A change that breaks a Postman collection or a Playwright test fixes it in the same pull
  request (`tests/` is part of this repository).

### What happens automatically

| What | How |
|---|---|
| `module:<name>` labels | [`.github/labeler.yml`](../../.github/labeler.yml) maps each changed directory to a label |
| type labels (`bug`, `enhancement`, `documentation`, ...) | taken from the title by [`.github/auto-labeler-config.yaml`](../../.github/auto-labeler-config.yaml) |
| reviewers | [`.github/CODEOWNERS`](../../.github/CODEOWNERS) picks the owners of the changed paths; the auto-assigner adds them |
| the CLA check | asks a first-time contributor to sign the Contributor License Agreement |

Labels and reviewers are assigned only on pull requests into `develop`, `release`, and `main`. A pull request into a
shared feature branch gets them by hand.

### Checks

| Check | What it verifies |
|---|---|
| `ci-ok` | the required check: the verdict over every job of the CI workflow |
| Validate PR title | the title is a Conventional Commit |
| Conventional Commits | every commit message of the branch is a Conventional Commit |
| Lint Code Base | super-linter over the changed files (Markdown, YAML, Go, shell, and more) |
| Link checker | the links in the repository's Markdown |

CI builds and tests what the change affects, builds the images, and runs the full E2E suite on Kind against them. A
pull request that changes only `docs/` or Markdown files runs no E2E. [CI](./ci.md) explains each job, the E2E tiers,
and how to read a red run.

## Review and merge

- A reviewer from CODEOWNERS approves; `ci-ok` and the title check are green.
- Reply to every comment, and push fixes as new commits: the squash merge folds them in.
- Before merging, read the title once more. It becomes the commit message on `develop`, the bump, and the release
  note.
- Merge with **Squash and merge**, the only method the repository allows, and delete the branch.

## Features that need frontend and backend changes

When one feature needs a backend change and a frontend change from different people, pick one of two procedures.

### Recommended: one shared branch

1. Create the shared branch `feature/<issue>-<slug>` from `develop` and push it.
2. Each person branches from it: `feature/<issue>-<slug>-be` for the backend, `feature/<issue>-<slug>-fe` for the
   frontend. Use the `-be` and `-fe` suffixes, not `feature/<issue>-<slug>/be`: Git cannot hold `feature/x` and
   `feature/x/be` at the same time.
3. Each person opens pull requests into the shared branch. Every pull request runs CI and E2E on its merge result, so
   the second half is tested together with the half already merged.
4. When the feature is complete, open one pull request from the shared branch into `develop`. Its squash merge lands
   the whole feature as one commit with one title.

### Without a shared branch

Each push publishes all images under the branch tag, for example `feature-123-x-be` and `feature-123-x-fe`. To test the
two halves together before either is merged, run the **Run E2E tests** workflow (`e2e-tests-manual.yml`) with:

| Input | Value |
|---|---|
| `image-tags` | the backend images from the backend branch and the `ui` image from the frontend branch; a key you leave out means `dev` |
| `postman-ref` | the branch whose Postman collections match the change, usually the backend branch |
| `playwright-ref` | the branch whose Playwright tests match the change, usually the frontend branch |
| `deploy-ref` | the branch that changed `deploy/`; the default is `main` |
| `runtime`, `suites`, `agent` | the defaults (`kind`, `all`, `true`) unless you need less |

```bash
gh workflow run e2e-tests-manual.yml --ref develop \
  -f image-tags='{"backend":"feature-123-x-be","ui":"feature-123-x-fe"}' \
  -f postman-ref=feature/123-x-be \
  -f playwright-ref=feature/123-x-fe \
  -f deploy-ref=develop
```

The `image-tags` keys are `backend`, `buildTaskConsumer`, `ui`, `apiLinterService`, `agentsBackend`, and `agent`. Name
every image the backend branch changed. [CI](./ci.md) describes the other inputs.

Merge the backward-compatible half first, usually the backend. The E2E run of the other pull request then runs against
`develop` with that half in it.

## Dependabot pull requests

Dependabot opens weekly pull requests for npm, Go modules, Maven, GitHub Actions, Dockerfiles, and Compose files, as
configured in [`.github/dependabot.yml`](../../.github/dependabot.yml). npm and Go updates come as one pull request per
dependency for all projects, so a version never differs between two projects.

- The title starts with `chore: deps:`, which gives each touched component a patch bump at the next release. Keep the
  title when you merge.
- Dependabot runs get a read-only token. CI builds and tests the affected projects but skips the images, E2E, and
  the Storybooks; `ci-ok` accepts those skips.
- Read the dependency's release notes for breaking changes. If the update needs code changes, push them to the
  Dependabot branch and keep the title.
