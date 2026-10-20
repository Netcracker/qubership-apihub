# Release process

A release is always started by hand. You cut `release` from `develop`, wait for its CI, then run `release-finish`
from `develop`. Everything after that is done by workflows: they tag `main`, merge it back into `develop`, and publish
the images, npm packages, and GitHub Releases.

This page is for the people who run a release. It describes what the workflows and scripts do today. Anything marked
**planned** is not implemented yet.

## The short version

```text
1. Release start   develop --fast-forward--> release        (CI runs on release, :next images)
2. Wait            CI on release is green; hotfixes go into release by pull request
3. Release finish  dry_run = true, read the plan in the job summary
4. Release finish  dry_run = false, sprint = APIHUB-26.3.5   (main, tags, back-merge, CI on main)
5. Wait            CI on main publishes images, npm packages, and GitHub Releases
```

With the GitHub CLI, from any clone:

```bash
gh workflow run release-start.yml --ref develop
gh workflow run release-finish.yml --ref develop -f dry_run=true
gh workflow run release-finish.yml --ref develop -f dry_run=false -f sprint=APIHUB-26.3.5
```

## Roles and secrets

| Role | Does | Needs |
|------|------|-------|
| Release manager | Runs `release-start` and `release-finish`, reads the summaries, fixes conflicts | Write access |
| Repository admin | Owns the deploy key, secrets, variables, and rulesets; pushes what rulesets block | Admin |

| Name | What it is | Used by | State |
|------|------------|---------|-------|
| `RELEASE_BOT_SSH_KEY` | Actions secret: private half of deploy key `apihub-release-bot` | Every bot push | In use |
| `GITHUB_TOKEN` | Token GitHub creates for each run | CI, `release-artifacts` | In use |
| `PROJECT_READ_TOKEN` | Actions secret with `read:project`, for Project 9 | Product notes (sprint items) | In use |
| `PUBLISH_CHARTS` | Repository variable, `true` to publish charts | Chart step of `release-artifacts` | Planned |

The bots push with the deploy key, not with `GITHUB_TOKEN`, for two reasons:

- The rulesets of `develop`, `release`, and `main` let the key bypass them. GitHub does not accept the GitHub Actions
  app as a bypass actor in a repository ruleset.
- A push made with a deploy key starts workflows. A push made with `GITHUB_TOKEN` does not.

`release-start`, `release-sync`, and `release-finish` fail at once, with a message, when `RELEASE_BOT_SSH_KEY` is not
set. A dry run of `release-finish` checks out without the key, so it cannot push anything.

`release-artifacts` reads `PROJECT_READ_TOKEN` for the product notes. Without it, a real release stops before anything
is published, and a dry run warns. `GITHUB_TOKEN` cannot read an organization project.

The workflows rely on these repository settings. They are not checkable from code, so an admin keeps them:

- Squash merging is the only merge method, with "pull request title and description" as the commit message.
- "Require linear history" is off on `develop`, `release`, and `main`, because the bots push merge commits.
- The deploy key `apihub-release-bot` has write access and bypasses the rulesets on all three branches.
- Move `RELEASE_BOT_SSH_KEY` into an environment limited to `develop` and `release`. As a repository secret, any writer
  can read it from a modified workflow on a branch (planned; the bot jobs do not name the environment yet).
  `PROJECT_READ_TOKEN` has the same exposure, and the dry run hands it to the plan step on any branch; make it a
  fine-grained token that can only read the organization's projects.
- `tools/release/guard.js` protects CI only: in a clone, `NX_DRY_RUN=true` passes it on any branch. It is not a barrier
  against local misuse; the rulesets on `main` are.

## Branches and merge rules

| Branch | Updated by | Merge method |
|--------|------------|--------------|
| `develop` | Feature pull requests; bot merges from `release` and `main` | Squash for pull requests |
| `release` | `release-start` (fast-forward to `develop`); hotfix pull requests | Squash for pull requests |
| `main` | `release-finish` only: fast-forward to `release`, then the version commit | None |

`develop` is the default branch.

Squash every pull request. Nx reads every commit between a component's last tag and `HEAD`. A squash makes each pull
request one commit whose message is the linted pull request title, so work-in-progress commits never reach the bump
calculation. A `BREAKING CHANGE:` footer in the pull request description counts as a major bump when it starts a
line. The phrase inside a sentence or in quoted release notes, as in Dependabot descriptions, does not count.

**Never squash a sync of `release` into `develop`, or of `main` into `develop`.** A squash drops the link to the
`release` commits, and the hotfixes would be counted a second time at the next release. The bots always merge with a
merge commit (`git merge --no-ff`). If you resolve such a merge by hand, use a merge commit too.

Nobody pushes to `main` by hand. `tools/release/guard.js` also refuses a real `nx release version` on any other
branch.

## Cut a release

### 1. Check develop

Open the CI run on `develop` and confirm it is green. The release candidate is whatever `develop` holds when you start.

### 2. Run Release start

Run **Release start** on `develop` (Actions, Release start, Run workflow). The workflow:

1. Fetches `develop` and `release`.
2. Stops with an error when `release` has commits that `develop` lacks. A hotfix sync is unresolved, and cutting
   would drop the hotfix from the next release. See [Conflict in release-sync](#conflict-in-release-sync).
3. Fast-forwards `release` to `develop`, or creates `release` when it does not exist. When `release` is already at
   `develop`, it reports that and carries on.
4. Makes sure CI runs on `release`.

CI on `release` runs the full suite on every push, including E2E, and publishes the `:next` images for
`linux/amd64` and `linux/arm64`. By hand, the cut is `git switch -C release develop && git push origin release`; the
workflow adds the check.

### 3. Wait for CI on release

The candidate must be green before you finish. Fix problems with a hotfix pull request into `release`; see
[Hotfix flow](#hotfix-flow).
**Release finish** does not check this: confirm that the CI run for the commit `release` points at is green. If a red
candidate was released, see [CI on main is red](#ci-on-main-is-red).

### 4. Run Release finish as a dry run

Run **Release finish** from `develop` with `dry_run` checked, which is the default. The `sprint` input can stay empty.
Read the plan; see [Read the dry-run summary](#read-the-dry-run-summary).

A dry run does steps 1 and 2 of [What Release finish does](#what-release-finish-does) locally on the runner. It commits,
tags, and pushes nothing. You can dispatch a dry run from any branch, for example to test a change to the workflow.

### 5. Run Release finish for real

Run **Release finish** again from `develop`, with `dry_run` unchecked and the `sprint` input set to the Project 9
sprint name, such as `APIHUB-26.3.5`. The sprint is stored in the annotation of the product tag. Both modes refuse a
sprint with characters other than letters, digits, `.`, `_`, and `-`. A real run also refuses:

- an empty sprint;
- a workflow file from a branch other than the default branch (`develop`);
- a missing `RELEASE_BOT_SSH_KEY`.

It always releases `release`, whichever branch you dispatch from.

### 6. Watch the result

The job summary lists the pushed tags, or says "Nothing to release". Then follow the CI run on `main`; see
[What CI does on main](#what-ci-does-on-main).

## What Release finish does

1. Fast-forwards `main` to `release`. It stops when the branches have diverged. In a real run it also tests the push
   to `main` with `git push --dry-run`, so a key that cannot push fails before anything is tagged.
2. Runs `tools/release/plan.js`, which writes the version plan (`.nx/version-plans/release.md`, never committed). In a
   real run the plan stays for the next step.
3. Runs `nx release version`, which bumps `package.json` and the lockfile of the JavaScript components, creates the
   commit `chore(release): publish`, and creates the `<component>/<version>` tags. Go and Java components get only a
   tag.
4. Tags the same commit with the product version (`tools/release/product-version.js`). The tag is annotated with
   `APIHUB <version>` and `Sprint: <sprint>`.
5. Pushes `main` and all tags in one atomic push, then checks that every tag is on the remote.
6. Fast-forwards `release` to `main`, so the next hotfix starts from the released state.
7. Makes sure CI runs on `main`.
8. In a second job, merges `main` into `develop` with a merge commit and makes sure CI runs on `develop`.

When no component and no `deploy/` change has a bump, nothing is tagged or pushed, and the run ends with "Nothing to
release". The same happens when `release` is still at the commit the previous run released: the run moves no branch
and starts no back-merge.

"Makes sure CI runs" means: wait up to two minutes for the CI run that the push started. Dispatch CI on the branch
only when none appears (`tools/release/ensure-ci.sh`). The same commit is never built twice on purpose.

The workflows never cancel a run in progress. Dry runs and real runs of **Release finish** queue apart. A real run
and **Release start** share one queue, so a cut cannot land between the push of `main` and the fast-forward of
`release`. GitHub keeps one pending run per queue: a newer dispatch replaces the one that waits, so dispatch once.

## Read the dry-run summary

The plan is printed to the job summary of the run. The numbers below are illustrative:

```text
Sprint: not given. main and release at `1a2b3c4`.

Release plan (dry run)

| Component   | From   | To     | Bump  | Reason     |
|-------------|--------|--------|-------|------------|
| api-unifier | 2.9.2  | 2.10.0 | minor | own change |
| api-diff    | 4.0.0  | 4.0.1  | patch | dependency |
| ui          | 3.10.1 | 3.10.2 | patch | dependency |

Product: 2.15.0 → 2.15.1 (patch; ui patch)

Not released: commons-go, agent.
```

Check these points:

- **Components.** Every component with a releasing commit since its last tag is listed. Compare the list with the pull
  requests merged since the last release. A missing component usually means its changes were `docs`, `test`, or `ci`
  commits, which give no bump.
- **Reason.** `own change` means a releasing commit touched the component's directories. `dependency` means an in-repo
  dependency is released in the same run, so the component gets a patch bump.
- **Product line.** The product moves by the highest bump among its components and `deploy/`. When it says "stays at
  X", no product tag and no product GitHub Release are created.
- **Not released.** These components keep their last tag and their last image.
- **Warning.** A "Nx bumps these components differently" warning is a self-check that should never appear. If it does,
  stop and ask a maintainer of `tools/release/`.
- **Nothing to release.** The run found no bump at all. See [Nothing to release](#nothing-to-release).

A dry run checks the sprint only when you give one. It does not check the deploy key or the dispatching branch, and it
does not test the push. A real run checks all of them before it tags.

You can read the same plan on your own machine with `git fetch --tags`, `pnpm install`, and
`node tools/release/plan.js`, with `release` checked out. `node tools/release/version-plan.js` prints only the
component bumps. Both run on your working tree and change nothing outside `.nx/`.

To preview the publishing step, dispatch the **CI** workflow on a branch with `release_dry_run` checked. The job
`release-artifacts-dry-run` reads the registries and GitHub, writes what it would publish to the job summary, and
publishes nothing. When the commit has no release tags, it previews the nearest ancestor with a product tag.

## Hotfix flow

A hotfix is a fix that must ship with the candidate in `release` and must also reach `develop`.

1. Open a pull request into `release` with a Conventional Commits title, for example `fix(portal-backend): ...`.
   `release` must exist; run **Release start** first when it does not.
2. Squash-merge it. Do not open a second pull request for `develop`.
3. The push to `release` starts **Release sync**, which merges `release` into `develop` with a merge commit and makes
   sure CI runs on `develop`. It also starts the full CI suite on `release`.
4. Wait for CI on `release`, then run **Release finish** as usual.

**Release sync** runs on every push to `release`, so it also runs after **Release start** and after **Release finish**
fast-forwards `release`. In those cases `develop` already holds the commits, and the run changes nothing. Its own push
goes to `develop`, so it cannot start itself again.

Until the sync succeeds, **Release start** refuses to cut. If two syncs queue, the newer one merges the newer tip of
`release`, which contains the older one.

## What the bots do after a release

After a real run of **Release finish** pushes `main` and the tags:

1. `release` is fast-forwarded to `main`.
2. CI runs on `main`; see [What CI does on main](#what-ci-does-on-main).
3. `main` is merged into `develop` with a merge commit, and CI runs on `develop`.
4. **Release sync** sees the push to `release` and finds nothing to merge, or merges what the back-merge has not.

The merge commits are authored as `github-actions[bot]`, and the pushes use the deploy key.

## What CI does on main

The push to `main` starts the **CI** workflow. It runs the whole suite and builds the images. The images are built for
`linux/amd64` and `linux/arm64`, and `main` and `release` share a build when they are at the same commit.

After `ci-ok` passes on `main`, the job `release-artifacts` runs when `HEAD` carries a release tag
(`<component>/X.Y.Z` or a bare `X.Y.Z`). The job is outside the verdict, so it never decides `ci-ok`. It does this, in
order:

1. Plans the artifacts from the tags at the commit (`tools/release/artifacts.js`) and refuses to publish when the plan
   reports a problem, such as a `package.json` version that differs from its tag.
2. Points `<image>:<version>` at the multi-arch image this run built under `:latest`. It first checks that the image
   carries this commit and both architectures. A version tag that already exists for another commit is never moved.
3. Builds the released public npm packages before it logs in to any registry, then publishes them to GitHub Packages
   with `pnpm publish -r --ignore-scripts`. A version that the registry already holds from before the release commit
   stops the job: the tag would name content the registry does not have. A version published after the release commit
   comes from an earlier attempt of this release and is skipped. The dry run reports the same case as a warning.
4. **Planned (step 6):** package and publish the Helm charts to `oci://ghcr.io/netcracker/charts`. Today the step is
   guarded by `PUBLISH_CHARTS` and only prints a warning.
5. Creates the GitHub Releases: modules first (`make_latest=false`), then the product, which becomes the Latest
   release.

Images exist for these components: `ui`, `build-task-consumer`, `portal-backend`, `api-linter-service`,
`agents-backend`, `agent`, `test-service`, and `java-task-consumer`. Libraries publish to npm. `commons-go` publishes
nothing.

Every step is idempotent. After a failure, re-run the failed jobs of the CI run on `main`. Steps skip what already
exists.

See [Release notes](#release-notes) for what each GitHub Release says.

## Release notes

`tools/release/artifacts.js` writes the notes in the plan step of `release-artifacts`, with the generators in
[`tools/release/notes/`](../../tools/release/notes). A dry run shows every note in the job summary.

Module notes cover the commits since the component's previous tag that touch its directories:

- Each commit maps to its pull request. A commit of this repository maps to the merged pull request it came from. An
  imported commit maps through the `(Netcracker/<repo>#N)` reference at the end of its title to the pull request in
  the old repository. A commit with neither is listed on its own.
- A pull request's closing issues decide the section: issue type `Feature` or `Bug`, then a `feature` or `bug` label.
  Without closing issues, the type of the title decides: `feat` or `fix`. Everything else goes to the tech section.
- A commit with `!` or a `BREAKING CHANGE:` footer goes to **Breaking changes**, at the top, and nowhere else.
- Dependency changes compare the `require` lines of `go.mod`, the `dependencies` and `peerDependencies` of
  `package.json`, and the versions in `pom.xml` at the two tags. In-repo packages are listed separately, as the
  in-repo dependencies released in the same run.

Components with an image get the full layout: image, documentation, the agent's Helm chart, all sections, the
dependency table, and the full changelog. Libraries and `commons-go` get a short one: the package, the sections that
have entries, the updated in-repo dependencies, and the full changelog. A component released only because of a
dependency says so in one line.

Product notes list:

- the images of the product at their current versions, linked to their module releases;
- the Helm chart, documentation, and installation links at the product tag;
- the breaking changes of the components released with it;
- the work items of the sprint: Project 9 cards whose Sprint is the sprint of the product tag and whose Status is
  Done or In Test, grouped by issue type;
- every component's version next to its version in the previous product release, and the agent.

The plan reports a problem, which stops a real run before anything is published, in these cases:

- `PROJECT_READ_TOKEN` is not set, or cannot read some cards of the sprint;
- the product tag names no sprint;
- no card of the sprint is Done or In Test, which usually means a misspelled sprint name.

A dry run reports the same cases as warnings. A repository the job token cannot read fails the plan step, instead of
listing its pull requests as bare commits.

GitHub accepts release bodies up to 125,000 characters. Longer notes keep the first entries of each list, down to
five, and say how many were left out; the full changelog link lists all of them. A pull request lists at most ten
closing issues, and a card at most ten pull requests, as in the old scripts.

## Image cleanup

The **Clean up images** workflow ([`images-gc.yml`](../../.github/workflows/images-gc.yml)) deletes image versions in
ghcr that no branch or git tag needs. It runs when a branch is deleted and twice a day. Most image packages are shared
with a legacy component repository that still pushes to them, so the workflow checks every tag against the refs of
the monorepo and of that repository.

- A release image stays while its git tag exists: `<image>:<version>` for `<component>/<version>`, and the legacy
  `X.Y.Z` tags.
- `latest`, `next`, `dev`, and `pull-N-merge` always stay. Closing a pull request deletes nothing.
- A deleted branch's tag goes on the next run. Superseded indexes and `src-<hash>` content that no kept tag uses go a
  day after their last change.
- A run never takes the API rate limit below half, so CI keeps its share. The legacy backlog takes several weeks.
- A delete needs this repository to have the **Admin** role under Manage Actions access in the package settings.
  Dispatch the workflow with `dry_run` to see what a run would delete.

## Version rules

### Bump per commit type

| Commit | Bump |
|--------|------|
| `feat` | minor |
| `fix`, `perf`, `revert`, `refactor`, `build`, `chore`, `style` | patch |
| `docs`, `test`, `ci` | none |
| Any type with `!` after it, or a `BREAKING CHANGE:` footer | major |

The table is the `release.conventionalCommits.types` block of [`nx.json`](../../nx.json), called R6 there. The scripts
of `tools/release/` read it to write the version plan, and Nx applies that plan.

- A commit counts for a component when it touches the component's directories. The highest bump of all such commits
  since the component's last tag wins.
- A commit with an unknown type, or a title that is not a Conventional Commit, gives no bump. A `BREAKING CHANGE:`
  footer still gives major.
- Merge commits are ignored.
- Dependabot commits start with `chore: deps:`, so they give a patch bump.
- Below `1.0.0` the table still holds: `feat` takes `0.1.0` to `0.2.0`.

### Components and dependents

- Only a component with a bump gets a new tag and a new image. The others keep their last tag.
- A component whose in-repo dependency is released in the same run gets a patch bump, also across groups. A fix in
  `api-unifier` releases `api-diff`, `api-processor`, the UI, and the builder too.
- A component with releasing commits of its own gets its own bump, not only a patch.
- `ui` is one fixed group: `ui-portal`, `ui-agents`, and `ui-shared` always share a version. `apispec-view` and
  `api-doc-viewer` are fixed groups too, and so is `java-task-consumer`, which spans three Nx projects.
- Components that have no tag yet (`test-service`, `java-task-consumer`) start from `0.0.0`.
- The first release after the migration bumps almost every component, because the wiring commits touch them.

### Product version

The product tag is the previous bare `X.Y.Z` tag, bumped by the highest bump among:

- the components `portal-backend`, `ui`, `build-task-consumer`, `api-linter-service`, `agents-backend`, and
  `java-task-consumer`;
- the commits that touch `deploy/`.

The agent has its own version and does not move the product version. Library bumps reach the product through `ui` and
`build-task-consumer`. When only `deploy/` changed, the release creates the product tag and no component tags. The
product continues from `2.15.0`.

## Tag prefixes

| Tag | Meaning | Example |
|-----|---------|---------|
| `<component>/<version>` | A released component | `portal-backend/1.21.1` |
| `X.Y.Z` | The product release | `2.16.0` |

The prefix is the Nx release group name:

- Libraries: `api-diff`, `api-processor`, `api-unifier`, `api-visitor`, `class-view`, `compatibility-suites`, `ddlapi`,
  `graphapi`, `http-spec`, `json-crawl`, `rest-playground`, `jest-chrome-in-docker-environment`, `apispec-view`, and
  `api-doc-viewer`.
- Applications and services: `ui`, `build-task-consumer`, `portal-backend`, `api-linter-service`, `agents-backend`,
  `agent`, `test-service`, and `java-task-consumer`.
- Go library: `commons-go`.

Go and Java components keep their version only in the tag. JavaScript components also keep it in `package.json`.

Tags that are not plain `X.Y.Z` versions are ignored when Nx looks for a last tag. That covers pre-releases such as
`agents-backend/0.0.1-alpha` and names such as `portal-backend/alpha`. The imported `ui-tests/*` and
`postman-collections/*` tags are history only; those directories are not released.

## Limits and planned work

- **No maintenance branches.** Once the next candidate is cut into `release`, a fix for the previous release can only
  ship with the next one. A separate maintenance branch is not planned.
- **Planned: charts (step 6).** The chart step of `release-artifacts` is an empty placeholder behind `PUBLISH_CHARTS`.
  Until step 6 lands, no chart is published and none is attached to the product release.
- **One release at a time.** The workflows queue instead of cancelling, but do not dispatch another CI run on `main` or
  `release` during a release. An extra run at the same commit can cancel a pending image build.
- **A real release starts only by hand,** from `develop`, with the deploy key present.

## Troubleshooting

### Conflict in release-sync

**Release sync** or the back-merge job of **Release finish** fails with "Merging release into develop conflicts" (or
`main`). The log prints the commands. In a clone with the deploy key, or with admin rights:

```bash
git fetch origin
git switch develop && git reset --hard origin/develop
git merge --no-ff origin/release   # resolve, then git commit
git push origin develop:refs/heads/develop
```

Use `origin/main` for a failed back-merge. Do not squash and do not rebase. The rulesets block a direct push to
`develop` for most people, so an admin usually pushes the merge. CI starts on `develop` by itself after the push. Then
run **Release start** again if it refused to cut.

### Release start refuses to cut

`release has commits that develop lacks` means a hotfix is not in `develop` yet. The log lists the commits. Fix the
failed **Release sync** run as described above, then start again.

### Stale main

`main cannot fast-forward to release: they have diverged` means `main` holds a commit that `release` lacks. The usual
cause is that the back-merge of the previous release never reached `develop`, and `release-start` then cut from a
`develop` without the version commit. Merge `main` into `develop` with a merge commit, run **Release start** again,
then rerun **Release finish**. A person decides how to reconcile the branches. The workflow never forces anything.

`git push` rejected in the atomic push means `main` moved during the run. Nothing landed, no tag was pushed, and you
can run **Release finish** again.

### Release moved during the run

`release moved during the run (a hotfix?)` means the last fast-forward failed. `main` is released either way. Merge
`main` into `release` by hand. CI on `main` and the back-merge into `develop` still run.

### Nothing to release

The run ends with the notice "Nothing to release" and moves no branch. Either `release` is at an already released
commit, no component has a releasing commit since its last tag, or every change since then was `docs`, `test`, or `ci`.
If you expected a release, check that the merged pull requests have Conventional Commits titles and touch the
component's directories.

### CI on main is red

The tags and `main` are already pushed, but `release-artifacts` does not run until `ci-ok` passes. Re-run the failed
jobs. If the cause is a defect in the code, the fix ships with the next release. Do not move or delete the tags.

### release-artifacts fails

- `A real run publishes only the artifacts of its own commit` or a plan problem: a `package.json` version differs from
  the tag. Stop and ask a maintainer.
- `<image>:latest does not exist` or has another revision: the image job of this CI run did not publish the image for
  this commit. Re-run the whole CI run on `main`, not only the artifacts job.
- `a version tag is never moved`: the image version already exists for a different commit. Stop and ask a maintainer.
- `is already in the registry from before this release`: the polyrepo published that npm version. Release the
  component again with a bump that leads past it; do not unpublish.
- A partial publish: re-run the failed jobs. Existing image tags, npm versions, and GitHub Releases are skipped.

### The secret is missing

`The secret RELEASE_BOT_SSH_KEY is not set` means a repository admin has to add the private key of the deploy key
`apihub-release-bot` as an Actions secret, and the public half as a deploy key with write access.

## Related files

- Workflows: [`release-start.yml`](../../.github/workflows/release-start.yml),
  [`release-sync.yml`](../../.github/workflows/release-sync.yml),
  [`release-finish.yml`](../../.github/workflows/release-finish.yml),
  [`release-artifacts.yml`](../../.github/workflows/release-artifacts.yml), the `release-artifacts` job of
  [`ci.yml`](../../.github/workflows/ci.yml), and [`images-gc.yml`](../../.github/workflows/images-gc.yml).
- Scripts: [`tools/release/`](../../tools/release/).
- Release configuration: the `release` block of [`nx.json`](../../nx.json).
