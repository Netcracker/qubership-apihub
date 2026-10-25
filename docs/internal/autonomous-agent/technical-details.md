# Autonomous agent: technical details

The technical reference of the AI Autonomous agent: the third-party pieces it uses, then every source file, from the
workflows down to the library, the roles, the playbooks, the state comment, the model contracts, and the artifacts.
Read [the architecture](./architecture.md) first for the flows. Names, paths, and versions here are copied from the
code on the branch of the last phase of the stack; when the code changes, change this page in the same pull request.

## Contents

- [Third-party pieces](#third-party-pieces)
- [Workflows](#workflows)
- [Scripts](#scripts)
- [Library modules](#library-modules)
- [Roles](#roles)
- [Playbook skills](#playbook-skills)
- [State comment](#state-comment)
- [Model output contracts](#model-output-contracts)
- [Artifacts](#artifacts)
- [Tests](#tests)

## Third-party pieces

### opencode

[opencode](https://opencode.ai/) runs every model call. It is the only engine; the scripts never call the OpenAI API
themselves.

- **Version.** `1.19.4`, pinned in `OPENCODE_VERSION` at the top of `ai-autonomous-agent.yml`. The jobs `review`,
  `analyze`, `implement`, and `chat` (for a question only) install it with
  `npm install --global "opencode-ai@${OPENCODE_VERSION}"`. The 2.0 line has no `github` command and may change `run`;
  an upgrade needs a check of the flags and the events below. `tools/agent/lib/opencode.js` is the only caller.
- **Command line.** `lib/opencode.js` (`runArgs`, `logArgs`) builds:

  ```text
  opencode [--print-logs --log-level <LEVEL>] run <message> --format json --agent <role> --model <provider/model>
           [--variant <variant>] [--title <title>] [--file <path>]...
  ```

  The message comes before `--file`, because `--file` takes several values. `--print-logs --log-level` comes from
  `AGENT_LOG_LEVEL` (`DEBUG`, `INFO` by default, `WARN`, `ERROR`).
- **Environment of a run** (`runEnv`): the job environment without the variables that match
  `^(GITHUB_TOKEN|GH_TOKEN|AGENT_PAT|ACTIONS_.*|INPUT_.*)$` (`SECRET_ENV`), plus `OPENCODE_CONFIG`
  (`tools/agent/opencode/opencode.json`), `OPENCODE_CONFIG_DIR` (`tools/agent/opencode/`), and
  `OPENCODE_DISABLE_AUTOUPDATE=1`. The OpenAI key stays, because the run needs it.
- **Config keys** (`tools/agent/opencode/opencode.json`): `share: "disabled"`, `autoupdate: false`,
  `enabled_providers: ["openai"]`, `instructions: ["{env:GITHUB_WORKSPACE}/.claude/rules/*.md"]`, and a `permission`
  block that denies `edit`, `bash`, `webfetch`, `websearch`, `question`, `task`, and `external_directory` and allows
  `skill`. Each role file opens only what it needs; see [Roles](#roles).
- **JSON events.** With `--format json`, opencode writes one JSON event per line. The scripts read three types
  (`lib/usage.js`, `lib/log.js`):

  | Event | Fields used | Used for |
  |---|---|---|
  | `step_finish` | `part.tokens.input`, `part.tokens.cache.write`, `part.tokens.cache.read`, `part.tokens.output`, `part.tokens.reasoning`, `part.cost` (USD), the finish reason | the cost record; one log line per step |
  | `text` | `part.text` | the final answer: the text of the last `text` event |
  | `error` | `error` | a warning in the log; the error list of the summary |

  `lib/log.js` also prints `tool_use` events (tool, target, status), so the job log shows each step as it happens.
- **Permission patterns.** opencode matches a bash command against the patterns of the role file; the last matching
  rule wins. The read-only roles allow a few `git` read commands and then deny `*>*`, `* --output*`, `git grep*-O*`,
  and `git grep*--open-files-in-pager*`, which could write a file or start a program.
- **What the spike learned** ([spike.md](./spike.md)): skills in `.claude/skills/` load by name, and a `SKILL.md`
  without
  `name` in its frontmatter is skipped; reading a file of a module attaches its `AGENTS.md`; a relative `instructions`
  glob does not reach the hidden `.claude` folder, an absolute one does; the uncached prompt is reported in
  `tokens.cache.write`, not in `tokens.input`, so `lib/usage.js` adds both; `--variant` works; `curl`, `gh`, and
  `git push` are refused also inside `bash -c` and after `&&`; the `steps` limit ends a run with exit code 0; a push
  with
  `AGENT_PAT` starts `CI`.

### OpenAI models

Each model variable holds `provider/model[:variant]`; the variant is the reasoning effort that opencode gets as
`--variant`. `lib/config.js` reads them, with these defaults:

| Variable | Default | Roles |
|---|---|---|
| `AGENT_MODEL_IMPLEMENT` | `openai/gpt-6.1-sol:high` | `implementer` |
| `AGENT_MODEL_REVIEW` | `openai/gpt-6-luna:max` | `pr-reviewer`, `self-reviewer` |
| `AGENT_MODEL_VERIFY` | `openai/gpt-6.1-sol:medium` | `verifier` |
| `AGENT_MODEL_LIGHT` | `openai/gpt-6-luna:medium` | `analyst`, `assistant` |
| `AGENT_MODEL_TRIAGE` | `openai/gpt-6.1-sol:medium` | `ci-triager` |

`loadConfig` throws when `AGENT_MODEL_IMPLEMENT` and `AGENT_MODEL_REVIEW` have the same model id; the variants are not
compared, so `:high` and `:max` of one model are refused too. The role files name no model, so a model change needs no
commit. The prices that the design used to choose the set (USD per million tokens, October 23, 2026) are in
[the design](./design.md#models). The cost records come from `part.cost` of the events, which is opencode's own price
table; the OpenAI bill is the authority. The only key is the secret `OPENAI_API_KEY`.

### GitHub API and tokens

`tools/agent/lib/github.js` is the only GitHub client: `fetch` against `https://api.github.com` with the headers
`Authorization: Bearer <token>`, `Accept: application/vnd.github+json`, and `X-GitHub-Api-Version: 2022-11-28`. The
model never calls GitHub. Two tokens exist:

| Token | Held by (step) | Used for |
|---|---|---|
| `GITHUB_TOKEN` of the job | `route`, `Review`, `Analyze`, `Decide` (`ci-gate`), `Rerun`, `Preflight`, `Publish`, `Stop`, `Answer` (`chat`), `Check CI` (`ci-check`), the `levels` and `report` steps | every read, every comment, label, reaction, review, review reply, run cancel, and rerun |
| `AGENT_PAT` | `Preflight`, `Publish`, `Decide`, `Rerun` | `GET /user` (the Git identity), `git push`, `POST /pulls`, `PATCH /pulls/{n}`, the GraphQL mutations `convertPullRequestToDraft` and `markPullRequestReadyForReview` |

The PAT exists because events made with `GITHUB_TOKEN` start no workflow: the push, the new pull request, and the "ready
for review" must start `CI`. The PAT is fine-grained, with Contents and Pull requests read and write and no Workflows
permission, so GitHub refuses a push that changes `.github/workflows/`. Every call, with the scripts that make it, is in
the table of [`lib/github.js`](#toolsagentlibgithubjs). Git itself talks to GitHub three times: the `chat` and
`ci-check` jobs fetch a pull request head with `GITHUB_TOKEN` in an `http.extraheader` for that one command, the work
step fetches and lists branches over the token-less checkout, and `publish` pushes with the PAT in the URL
(`pushBranch`), which it never logs.

### GitHub Actions

| Action | Version | Where |
|---|---|---|
| `actions/checkout` | `v6` | every job of the three workflows; always `persist-credentials: false` |
| `actions/setup-node` | `v6` | every job, `node-version: '24'` |
| `actions/upload-artifact` | `v4` | `review`, `analyze`, `ci-gate`, `rerun`, `ci-check`, `implement`, `publish`, `stop`, `chat`; 30 days |
| `actions/download-artifact` | `v5` | `publish`, with `continue-on-error: true` |
| `actions/setup-go` | `v7` | `implement`, `go-version-file: backend/.go-version` |
| `./.github/actions/setup-workspace` | local | `implement`, `cache-scope: ai-autonomous` |

The local action `setup-workspace` uses `pnpm/action-setup@v6.1.0` (pnpm from `packageManager` of the root
`package.json`), `actions/setup-node@v6` (Node 24), `actions/setup-java@v6` (Temurin 21, Maven cache), and
`actions/cache@v6` for the pnpm store and the Nx cache, and runs `pnpm install --frozen-lockfile`. Maven comes from the
runner image and must be 3.9 or newer.

### APM

The playbooks are the local APM package `agent-packages/apihub-autonomous-agent` (version `0.1.0`), listed in the root
`apm.yml` and in `apm.lock.yaml`, which pins `apm_version: 0.34.0`.
`apm install --target cursor,claude --legacy-skill-paths` deploys each skill to `.claude/skills/<name>/` and
`.cursor/skills/<name>/`; opencode reads the
`.claude` copy. Use APM 0.34.0 locally (`pip install apm-cli==0.34.0`): an older one rewrites `.cursor/rules` in another
format.

### The `yaml` package

`yaml@2.9.1` is the only npm package the scripts need besides opencode. `lib/facts.js` uses it to read
`.github/labeler.yml`. The `review` job installs it with `npm install --no-save --prefix .agent-tools yaml@2.9.1`; in a
repository checkout `lib/facts.js` falls back to the copy that Nx brings, so `node_modules` must be installed for
`lib/facts.test.js` and `review.test.js`.

### Nx and pnpm

| Command | Where | Why |
|---|---|---|
| `pnpm exec nx affected -t build test --base=<branch point> --head=HEAD --parallel=3 --output-style=static` | `implement.js work` (`checkCommands`) | the local checks of the whole pull request |
| `pnpm test:tools` | `implement.js work`, when a changed file is under `tools/` | the tests of `tools/release`, `tools/ci`, and `tools/agent` |
| `pnpm exec nx *`, `pnpm nx *` | the bash allow-list of `implementer` | the module checks the playbooks ask for |

Each check command runs with a 40-minute timeout and without the tokens and the OpenAI key (`cleanEnv`). The root script
`test:tools` is `node --test "tools/release/**/*.test.js" "tools/ci/**/*.test.js" "tools/agent/**/*.test.js"`.

## Workflows

All three workflows set `permissions: contents: read` at the top and widen them per job. Their names start with
`AI Autonomous:`.

### `.github/workflows/ai-autonomous-agent.yml` (`AI Autonomous: Agent`)

**Triggers:** `pull_request` (`opened`, `ready_for_review`), `issues` (`opened`, `typed`, `edited`), `issue_comment`
(`created`), `workflow_run` (`completed` of `CI`, `Lint: Code base`, `PR: Title`, `PR: Commit messages`,
`Lint: Markdown links`, `PR: CLA`), `pull_request_review` (`submitted`), and `schedule` (`*/10 * * * *`, the sweep of
new issues whose grace period is over).

**Run title.** The workflow `name` is `AI Autonomous: Agent`. The top-level `run-name` is:

```yaml
run-name: "AI Autonomous: ${{ github.event_name }} #${{ github.event.issue.number || github.event.pull_request.number || github.event.workflow_run.pull_requests[0].number || '' }}"
```

The title of a run (`display_title` in the API) therefore ends with the issue or pull request number, and with a bare
`#` for the sweep. The `route` job reads the titles to find a run that works on the same number. `run-name` changes
only the title: the workflow `name`, which the CI gate matches in `isOwnCheck` (the prefix `AI Autonomous`), and the
job names stay as they were.

**Workflow environment:** `OPENCODE_VERSION`, and the repository variables `AGENT_ENABLED`, `AGENT_DRY_RUN`,
`AGENT_ALLOWED_ACTORS` (a variable, or a secret of the same name), `AGENT_MODEL_IMPLEMENT`, `AGENT_MODEL_REVIEW`,
`AGENT_MODEL_VERIFY`, `AGENT_MODEL_LIGHT`, `AGENT_MODEL_TRIAGE`, `AGENT_MAX_ATTEMPTS`, `AGENT_MAX_REVIEW_ROUNDS`,
`AGENT_MAX_ANALYSES`, `AGENT_ANALYSIS_GRACE_MINUTES`, `AGENT_REVIEW_MAX_LINES`, `AGENT_REVIEW_MAX_FILES`,
`AGENT_DAILY_ANALYSES`, `AGENT_DAILY_REVIEWS`, and `AGENT_LOG_LEVEL`.

| Job | Needs and condition | Timeout | Concurrency | Permissions | Secrets (step) |
|---|---|---|---|---|---|
| `route` | the `if` filter below | 5 | none | `contents: read`, `issues`, `pull-requests`: write, `actions: read` | none |
| `review` | `action == 'review'` | 30 | `ai-autonomous-<number>` | `contents: read`, `issues: write`, `pull-requests: write` | `OPENAI_API_KEY` (`Review`) |
| `analyze` | `action == 'analyze'`; a matrix over the `numbers` output | 20 | `ai-autonomous-<matrix number>` | `contents: read`, `issues: write` | `OPENAI_API_KEY` (`Analyze`) |
| `ci-gate` | `action == 'ci-gate'` | 15 | `ai-autonomous-<number>` | `contents: read`, `issues`, `pull-requests`, `actions`: write, `checks`, `statuses`: read | `AGENT_PAT` (`Decide`) |
| `rerun` | `action == 'rerun'` | 10 | `ai-autonomous-<number>` | `contents: read`, `issues`, `pull-requests`, `actions`: write, `checks`, `statuses`: read | `AGENT_PAT` (`Rerun`) |
| `ci-check` | `action == 'ci-check'` | 20 | `ai-autonomous-<issue or number>` | `contents: read`, `issues`, `pull-requests`, `actions`: write, `checks`, `statuses`: read | `OPENAI_API_KEY` (`Check CI`) |
| `implement` | `route` and `ci-gate`; `always()` and `action == 'implement'` or `next == 'implement'` | 90 | `ai-autonomous-<number>` | `contents: read`, `issues: write`, `pull-requests: write` | `AGENT_PAT` (`Preflight`), `OPENAI_API_KEY` (`Work`) |
| `publish` | `route`, `ci-gate`, `implement`; `always()` and `proceed == 'true'` | 15 | `ai-autonomous-<number>` | `contents: read`, `issues`, `pull-requests`, `actions`: write, `checks`, `statuses`: read | `AGENT_PAT` (`Publish`) |
| `stop` | `action == 'stop'` | 5 | none | `contents: read`, `issues`, `pull-requests`, `actions`: write | none |
| `chat` | `action == 'chat'` | 15 | `ai-autonomous-chat-<number>` | `contents: read`, `issues: write`, `pull-requests: write` | `OPENAI_API_KEY` (`Answer`) |

Every job has `cancel-in-progress: false`. `GITHUB_TOKEN` is passed only to the script steps named in
[GitHub API and tokens](#github-api-and-tokens), never to `Work`.

**The `route` filter.** No runner starts when the actor or the pull request author is `dependabot[bot]`, for a
`workflow_run` from another repository, for a comment on a Dependabot pull request (except one that holds `/agent`
and `ci_check` or `ci-check`; `contains()` ignores case, and the router parses the comment and skips anything but
`/agent ci_check`), for a comment by a bot, for a
comment on a pull request without `/agent` unless the pull request body holds `ai-autonomous-agent issue=`, or for a
review that is not `changes_requested`, is by a bot, comes from a fork, or is on a pull request without that marker.
A `schedule` event starts a runner only when `vars.AGENT_ENABLED == 'true'`, so a disabled agent costs nothing every
10 minutes. It passes the other conditions: the event fields they read are empty there, and the actor check skips it,
because its `github.actor` is whoever last changed the workflow file, often Dependabot bumping an action.

**The `route` permissions.** `issues: write` and `pull-requests: write` let the router post the decline comment and
the confused reaction (see [the busy check](#the-busy-check-one-command-at-a-time)). `actions: read` lets it list the
runs of the workflow. The job still runs no model, and only code of the default branch.

**The `analyze` matrix.** The job has `strategy: { matrix: { number: fromJSON(needs.route.outputs.numbers || '[]') },
max-parallel: 2, fail-fast: false }`. Each matrix entry sets `AGENT_NUMBER` to its number, takes the concurrency group
`ai-autonomous-<matrix number>`, and uploads the artifact `ai-autonomous-analysis-<matrix number>-<run_attempt>`. The
fallback `'[]'` keeps the expression valid when the router wrote no `numbers` (every action but `analyze`). An event or
a command gives a one-element list; the sweep gives up to five. A failed entry does not cancel the others.

**Steps per job.**

| Job | Steps |
|---|---|
| `route` | checkout of `tools/agent` of the default branch (`ref` is `github.event.repository.default_branch`; the `schedule` payload may have none, and an empty `ref` is the default branch), setup-node, `node tools/agent/route.js` |
| `review` | checkout of `refs/pull/<number>/head` with full history; checkout of `/tools/agent/`, `/.github/labeler.yml`, `/.claude/`, and `AGENTS.md` into `.agent-tools`; "Use the trusted agent instructions" (replace `.claude/` and every `AGENTS.md` and `CLAUDE.md` of the pull request with the trusted copies); setup-node; install opencode and `yaml`; `Review` (`node .agent-tools/tools/agent/review.js`); upload |
| `analyze` | checkout of the default branch with full history; setup-node; install opencode; `Analyze` (`node tools/agent/analyze.js`); upload |
| `ci-gate` | checkout of `tools/agent`; setup-node; `Decide` (`node tools/agent/ci-gate.js`, output `next`); upload |
| `rerun` | checkout of `tools/agent` of the default branch; setup-node; `Rerun` (`node tools/agent/ci-gate.js rerun`); upload (`if-no-files-found: ignore`) |
| `ci-check` | checkout of the default branch with full history; `Fetch the pull request head` (into `refs/remotes/pull/<number>/head`); setup-node; install opencode; `Check CI` (`node tools/agent/ci-check.js`); upload (`if-no-files-found: ignore`) |
| `implement` | `Output folder`; checkout of the default branch with full history; setup-node; install opencode; `Preflight` (`implement.js preflight`, output `proceed`); then, when `proceed == 'true'`: `setup-workspace`, `Set up Go`, `Keep a trusted copy of the agent` (`cp -R tools/agent "$RUNNER_TEMP/agent-tools"`), `Work` (`node "$RUNNER_TEMP/agent-tools/implement.js" work`); upload |
| `publish` | `Output folder`; checkout of `tools/agent` of the default branch with full history; setup-node; download the `implement` artifact; `Publish` (`implement.js publish`); upload `summary.md` |
| `stop` | checkout of `tools/agent` of the default branch; setup-node; `Stop` (`node tools/agent/chat.js`); upload |
| `chat` | checkout of the default branch with full history; `Fetch the pull request head` (pull requests only, into `refs/remotes/pull/<number>/head`); setup-node; install opencode (questions only); `Answer` (`node tools/agent/chat.js`); upload |

**Job environment.** `AGENT_NUMBER` is the `number` output of `route` everywhere. `review` adds `AGENT_COMMAND`;
`analyze` adds `AGENT_TRIGGER` (and takes `AGENT_NUMBER` from the matrix); `ci-gate` adds `AGENT_PR`, `AGENT_HEAD_SHA`,
and `AGENT_WORKFLOW_RUN_ID`; `rerun` adds `AGENT_PR`, `AGENT_COMMAND`, `AGENT_ACTOR`, and `AGENT_COMMENT_ID`;
`ci-check` adds `AGENT_ISSUE` (the `issue` output of
`route`), `AGENT_COMMAND`, `AGENT_ACTOR`, and `AGENT_COMMENT_ID`, and its `Check CI` step `AGENT_PR_HEAD_REF`;
`implement` and `publish` add `AGENT_COMMAND`, `AGENT_ACTOR` (the commenter or the reviewer), `AGENT_KIND` (the `kind`
output, else `ci-fix` after the gate, else `initial`), `AGENT_PR`, and `AGENT_COMMENT_ID`; `stop` and `chat` add
`AGENT_COMMAND`, `AGENT_ACTOR`, and `AGENT_COMMENT_ID`. Every script step gets `AGENT_RUN_URL` and `AGENT_OUT`
(`$RUNNER_TEMP/agent`) where it writes files.

### `.github/workflows/ai-autonomous-levels.yml` (`AI Autonomous: Execution levels`)

- **Trigger:** `pull_request_target` (`closed`, `labeled`). `pull_request_target` gives a write token also for a pull
  request from a fork; the job checks out the base branch only.
- **Job `levels`:** runs when `vars.AGENT_ENABLED == 'true'`, the pull request is merged, and the action is `closed` or
  the label starts with `ai:l`. Timeout 5 minutes, concurrency `ai-autonomous-levels-<pull request>`, permissions
  `contents: read`, `issues: write`, `pull-requests: write`, no secrets. Steps: checkout of `tools/agent`, setup-node,
  "Copy the level to the issues" (`node tools/agent/levels.js` with `GITHUB_TOKEN`, `AGENT_RUN_URL`, and
  `AGENT_NUMBER`).

### `.github/workflows/ai-autonomous-report.yml` (`AI Autonomous: Weekly report`)

- **Triggers:** `schedule` (`0 6 * * 1`, Monday 06:00 UTC) and `workflow_dispatch` with the optional input `days`.
- **Environment:** `AGENT_ENABLED`, `AGENT_DRY_RUN`, `AGENT_REPORT_ISSUE`, and `AGENT_REPORT_DAYS`
  (`inputs.days || vars.AGENT_REPORT_DAYS`).
- **Job `report`:** runs when `vars.AGENT_ENABLED == 'true'`. Timeout 15 minutes, concurrency `ai-autonomous-report`,
  permissions `contents: read`, `issues: write`, `pull-requests: read`, no secrets. Steps: checkout of `tools/agent` of
  the default branch, setup-node, "Build the report" (`node tools/agent/report.js` with `GITHUB_TOKEN`).

## Scripts

Every script in `tools/agent/` is a CommonJS entry point with a `main` that the tests can call with fake clients. Every
script reads `lib/config.js` first and does nothing while `AGENT_ENABLED` is not `true`, and writes to the job summary
instead of GitHub while `AGENT_DRY_RUN` is not `false`. The label scripts `labels.sh` and `labels.ps1` create the nine
labels once:

| Label | Color | Description |
|---|---|---|
| `ai:suitable` | `2DA44E` | AI could complete the task on its own, given the tools, context, and checks it needs |
| `ai:unsuitable` | `CF222E` | AI should not do this task: technical, organizational, or other limits |
| `ai:l0-assistant` | `C5DEF5` | A person did the work and used AI for suggestions, answers, or code |
| `ai:l1-executor` | `8AB4F8` | A person started and accepted the work; AI implemented it, ran the checks, and opened the PR |
| `ai:l2-agent` | `3B7DD8` | AI picked the task, implemented it, and opened the PR; a person reviewed and accepted it |
| `ai:l3-autonomous` | `0B4F9C` | AI picked, implemented, merged, and closed the task without a person |
| `agent:completed` | `0E8A16` | The agent finished and every required check passed; a person may not have accepted it yet |
| `agent:needs-human` | `FBCA04` | The agent needs a person: a decision, more context, permissions, or troubleshooting |
| `agent:pr-reviewed` | `D4C5F9` | The AI review of this pull request is published; its findings may still be open |

### `tools/agent/route.js`

The router. The `route` job of `.github/workflows/ai-autonomous-agent.yml` (step `route`) runs it for every event of
that workflow and turns the event into one decision. The other jobs of the workflow start from its step outputs. The
pure function `decide` makes the decision; `gather` fetches the facts that need the GitHub API, and only when the event
calls for them. A decision that does nothing has the action `skip` (there is no action named `none`).

- **Inputs:** `GITHUB_EVENT_NAME`, `GITHUB_EVENT_PATH` (the event JSON), `GITHUB_REPOSITORY`, `GITHUB_TOKEN` (needed
  only when a GitHub call is needed), `GITHUB_RUN_ID` (needed for a command that starts a worker job, see [the busy
  check](#the-busy-check-one-command-at-a-time)), `GITHUB_OUTPUT`, `GITHUB_STEP_SUMMARY`, and the `AGENT_*` variables of
  `tools/agent/lib/config.js` (`AGENT_ENABLED`, `AGENT_DRY_RUN`, `AGENT_ALLOWED_ACTORS`, `AGENT_MAX_ANALYSES`,
  `AGENT_ANALYSIS_GRACE_MINUTES`, `AGENT_DAILY_ANALYSES`, `AGENT_DAILY_REVIEWS`, and so on). `GITHUB_REPOSITORY` is
  needed for the searches of the sweep and of the daily caps.
  `AGENT_PAT` is not used.
  `main(env, deps)` takes `deps.getClient` and `deps.now`, and `gather` takes `repository` and `now`, so that a test
  uses no network and fixes the clock.
- **Outputs:** one `key=value` line each in `$GITHUB_OUTPUT` (function `formatOutputs`), and one line in
  `$GITHUB_STEP_SUMMARY` (`- AI Autonomous agent chose <action> for #<n>: <reason>`).

  | Output | Value |
  |---|---|
  | `action` | Always written: `review`, `analyze`, `implement`, `ci-gate`, `rerun`, `ci-check`, `chat`, `stop`, or `skip`. |
  | `number` | Always written. The issue or pull request the job works on; empty when the event has none. |
  | `reason` | Always written. One line (line breaks become spaces). It is not a job output of the workflow. |
  | `command` | Always written. JSON on one line, or empty. Shape: `{"name":"<name>","force":<bool>,"notes":"<text>"}`. |
  | `trigger` | Only for `analyze`: `opened`, `typed`, `sweep`, `edited`, `author-reply`, or `command`. Empty otherwise. |
  | `numbers` | Only for `analyze`: a JSON array of the issue numbers. One number for an event or a command, up to five for the sweep. `number` is the first one. |
  | `pr` | Only when set: `ci-gate`, a `rerun` decision on a pull request of the agent, and an `implement` decision that a person asked for on a pull request. |
  | `issue` | Only for `ci-check` on a pull request of the agent: the issue its marker names. |
  | `head_sha` | Only for `ci-gate`: the head commit of the pull request. |
  | `kind` | Only for `implement` through `humanAttempt`: `human`, or `review` (a change request in a review). |

  The `route` job exports `action`, `number`, `numbers`, `command`, `trigger`, `pr`, `head_sha`, `kind`, and `issue`
  as job outputs. An output that was not written reaches the later jobs as an empty string.

  `command.name` is one of `review`, `analyze`, `implement`, `retry`, `rerun`, `ci-check`, `stop`, `cost`, `help`,
  `chat` (from `tools/agent/lib/commands.js`; `fix` is reported as `implement`, and `ci_check` as `ci-check`; `force` is
  true only for `implement force`), or one of two names that only the router creates: `answer` (a comment without a
  command that answers a hand-off) and `review-changes` (a review with change requests). For those two, `notes` holds
  the comment or review text, cut at 8000 characters (`MAX_NOTES`) with the line `[cut: the text is longer]`, because a
  job output has a size limit.
- **Model calls:** none.
- **GitHub reads:** all with `GITHUB_TOKEN` of the job (`contents`, `issues`, `pull-requests`: read). The client is
  built
  lazily with `createClient` and only when a call is needed, so an event that needs nothing works without a token.
  - `getPermission(login)`: `GET /repos/{repo}/collaborators/{login}/permission` (404 means `none`). Used when a person
    wrote a command, asked for changes in a review, or answered a hand-off without a command.
  - `listIssueComments(n)`: `GET /repos/{repo}/issues/{n}/comments` (paginated). Used to find the state comment of a
    pull request (`ready_for_review`), of an issue, or of the issue named by an agent pull request.
  - `getPull(n)`: `GET /repos/{repo}/pulls/{n}`, and `listPulls({ head, state: 'open' })`:
    `GET /repos/{repo}/pulls?head=<owner>:<branch>&state=open`. Used by `gatherCiFacts` for a finished workflow run.
  - `searchIssues(query)`: `GET /search/issues`. Used for the daily count (`countDaily`) and by the sweep
    (`gatherSweep`); see [Daily caps and the sweep](#daily-caps-and-the-sweep).
- **GitHub writes:** none. The router writes no comment, label, or reaction.
- **Reactions:** the router adds none. The `eyes`, `rocket`, and `confused` reactions come from `lib/reactions.js` and
  are added by `implement.js`, `chat.js`, `ci-check.js`, and `ci-gate.js rerun` to the comment that started the job
  (`AGENT_COMMENT_ID`). `eyes` is added
  when the work starts, `rocket` when it ends well, `confused` when the agent refuses or fails. Review, analyze, and the
  CI gate add no reaction.

#### Checks, in the order `decide` applies them

1. `AGENT_ENABLED` is not `true` -> `skip` (`AGENT_ENABLED is not true`), for every event. `gather` then makes no call.
2. The event is not in `EVENT_HANDLERS` -> `skip`. The handled events are `pull_request`, `issue_comment`, `issues`,
   `workflow_run`, `pull_request_review`, and `schedule`.
3. Bot: a login that ends in `[bot]` (case-insensitive) is skipped for the author of a pull request, the author of an
   issue, the author of a comment, and the author of a review. A comment of a bot also costs no GitHub call.
4. Actor allowed (`isActorAllowed`): the login is in `AGENT_ALLOWED_ACTORS` (compared in lower case), or the variable
   is empty. Applied to the commenter (any command or hand-off answer), the reviewer, and, for `ci-gate`, to the person
   recorded in the state. It is not applied to the author of a pull request that gets the automatic review, or to the
   author of an issue that gets the automatic analysis, an edit, or a reply: those run for every author. The actor of
   the `workflow_run` event does not matter.
5. Write permission (`hasWriteAccess`: `admin`, `maintain`, or `write`): required for every command, for a hand-off
   answer, and for a review with change requests. It is not required for the analysis of an issue or for the review of
   a new pull request.
6. Dependabot: a login that matches `dependabot` or `dependabot[bot]`. The workflow already filters it before a runner
   starts (see `if:` of the `route` job), and lets only a comment through that holds `/agent` and `ci_check` or
   `ci-check`. The router checks
   again for a command on a pull request: `review`, `retry`, `rerun`, `stop`, `cost`, `help`, `chat`, and a review with
   change requests give `skip`
   (`dependency update pull requests are not handled`; for `review`:
   `dependency update pull requests are not reviewed`). `ci-check` is the exception: it works on a pull request of
   Dependabot like on any other. A pull request of Dependabot is a bot author for `pull_request`
   events.
7. Fork: a pull request whose head repository differs from its base repository (compared in lower case; a deleted fork
   counts as a fork). `pull_request` events and `pull_request_review` are skipped. A fork is reviewed only on
   `/agent review` from a person with write access. A `workflow_run` of a fork (head repository is not this repository)
   is skipped before any call.
8. Agent pull request trust (`agentPullOf`): the body must carry the marker
   `<!-- ai-autonomous-agent issue=<n> -->` (`agentIssueOf`), and the state comment of issue `<n>` (written by
   `github-actions[bot]`, see `lib/state.js`) must have `pr` equal to this pull request. The marker alone is not
   trusted, because anyone can edit a description. `ci-gate` also needs the phase `waiting-ci`.

#### Routing table

`PR` means a pull request, `agent PR` a pull request that passes check 8, `person` a login that passes checks 3 and 4,
`writer` a person that passes check 5. Every row assumes `AGENT_ENABLED=true`. Every row not listed gives `skip`.

**Event `pull_request`** (`opened`, `ready_for_review`; any other action gives `skip`)

| Condition | action | number | command | trigger | pr | head_sha | kind |
|---|---|---|---|---|---|---|---|
| Draft PR | `skip` | PR | | | | | |
| Fork PR (`fork pull requests run only on /agent review`) | `skip` | PR | | | | | |
| Author is a bot (Dependabot included) | `skip` | PR | | | | | |
| Body holds the agent marker `<!-- ai-autonomous-agent issue=<n> -->` (the agent opened it) | `skip` | PR | | | | | |
| `ready_for_review` and the state comment of the PR lists reviews (a review skipped for size is one) | `skip` | PR | | | | | |
| The automatic reviews of the last 24 hours reach `AGENT_DAILY_REVIEWS` (`daily limit of <N> automatic reviews reached; comment /agent review`) | `skip` | PR | | | | | |
| Otherwise (`opened`, or `ready_for_review` never reviewed) | `review` | PR | empty | | | | |

The author may be anyone: `AGENT_ALLOWED_ACTORS` does not apply. For `ready_for_review` the router reads the state
comment of the PR (`listIssueComments`). For a PR that would be reviewed it also counts the automatic reviews of the
last 24 hours (see [Daily caps and the sweep](#daily-caps-and-the-sweep)).

**Event `issues`** (`opened`, `typed`, `edited`)

| Condition | action | number | command | trigger | pr | head_sha | kind |
|---|---|---|---|---|---|---|---|
| Item is a PR, or author is a bot | `skip` | issue | | | | | |
| Type is not `Bug` or `Task` | `skip` | issue | | | | | |
| `opened` or `typed` and the issue has `ai:suitable` or `ai:unsuitable` | `skip` | issue | | | | | |
| `edited`, phase is not `needs-info`, or the editor is not the author | `skip` | issue | | | | | |
| `opened` or `typed` and `AGENT_ANALYSIS_GRACE_MINUTES` is above 0 (`the sweep analyzes it after the grace period of <N> minutes`) | `skip` | issue | | | | | |
| State already holds `AGENT_MAX_ANALYSES` analyses (`analysis limit reached`) | `skip` | issue | | | | | |
| `opened` or `typed` and the automatic analyses of the last 24 hours reach `AGENT_DAILY_ANALYSES` (`daily limit of <N> automatic analyses reached`) | `skip` | issue | | | | | |
| `opened` (grace period 0) | `analyze` | issue | empty | `opened` | | | |
| `typed` (grace period 0; a Bug or Task type was set later) | `analyze` | issue | empty | `typed` | | | |
| `edited` by the author while the phase is `needs-info` | `analyze` | issue | empty | `edited` | | | |

The author may be anyone: `AGENT_ALLOWED_ACTORS` does not apply. The state comment of the issue is read for `typed`,
and for `edited` when the editor is the author. A new issue has no state, so `opened` reads nothing. With a grace
period of 0, `opened` and `typed` also get the daily count. `edited` is immediate and is never capped.

**Event `schedule`** (the sweep)

| Condition | action | number | numbers | trigger |
|---|---|---|---|---|
| `AGENT_DRY_RUN` is not `false` (`the sweep needs AGENT_DRY_RUN=false: a dry-run analysis writes no state, so the same issues would be analyzed again and again; use /agent analyze`) | `skip` | empty | | |
| The automatic analyses of the last 24 hours reach `AGENT_DAILY_ANALYSES` (`daily limit of <N> automatic analyses reached`) | `skip` | empty | | |
| No candidate (`no new issue is past the grace period`) | `skip` | empty | | |
| Otherwise | `analyze` | the first issue | up to `min(5, cap - count)` issues, oldest first | `sweep` |

**Event `issue_comment`** (`created`; `edited` and `deleted` give `skip`). A bot commenter gives `skip`.

First the body is parsed by `parseCommand`. With a command, checks 4 and 5 run first (commenter allowed, then write
access), then the rule of the command. Without a command, see the last table.

| Command | On | Extra conditions | action | number | command.name | trigger | pr | head_sha | kind |
|---|---|---|---|---|---|---|---|---|---|
| `/agent review [notes]` | PR | Not Dependabot's | `review` | PR | `review` | | | | |
| `/agent review` | issue | | `skip` (`review works on pull requests`) | issue | | | | | |
| `/agent analyze` | issue | Type is `Bug` or `Task`; the limit is bypassed | `analyze` | issue | `analyze` | `command` | | | |
| `/agent analyze` | PR | | `skip` | PR | | | | | |
| `/agent implement [force]` or `/agent fix` | issue | None (`implement.js preflight` checks type, labels, state) | `implement` | issue | `implement` (`force` set) | | | | |
| `/agent implement` | PR | | `skip` | PR | | | | | |
| `/agent retry [guidance]` | issue | | `implement` | issue | `retry` | | | | `human` |
| `/agent retry` | agent PR | | `implement` | issue named by the marker | `retry` | | PR | | `human` |
| `/agent retry` | other PR | Not an agent PR | `skip` | PR | | | | | |
| `/agent rerun [notes]` | issue | | `rerun` | issue | `rerun` | | | | |
| `/agent rerun` | agent PR | | `rerun` | issue named by the marker | `rerun` | | PR | | |
| `/agent rerun` | other PR | Not an agent PR (`rerun works on an issue or a pull request of the agent`) | `skip` | PR | | | | | |
| `/agent ci_check [notes]` | issue | `ci_check works on a pull request` | `skip` | issue | | | | | |
| `/agent ci_check` | PR, not an agent PR | Fork and Dependabot pull requests are allowed | `ci-check` | PR | `ci-check` | | | | |
| `/agent ci_check` | agent PR | The output `issue` names the issue of the marker | `ci-check` | PR | `ci-check` | | | | |
| `/agent stop` | issue | | `stop` | issue | `stop` | | | | |
| `/agent stop` | agent PR | | `stop` | PR | `stop` | | | | |
| `/agent stop` | other PR | Not an agent PR | `skip` | PR | | | | | |
| `/agent cost` | issue or PR | | `chat` | issue or PR | `cost` | | | | |
| `/agent help`, or `/agent` alone | issue or PR | | `chat` | issue or PR | `help` | | | | |
| `/agent <text>` (an unknown first word) | issue | | `chat` | issue | `chat` | | | | |
| `/agent <text>` | PR, not an agent PR | | `chat` | PR | `chat` | | | | |
| `/agent <text>` | agent PR | Change request | `implement` | issue named by the marker | `chat` | | PR | | `human` |

On a PR, `retry`, `rerun`, `ci-check`, `stop`, and `chat` also need the issue state of the marker, which `gather` reads
(`gatherAgentFacts`).
For `retry`, `rerun`, `stop`, `cost`, `help`, `chat`, and `review` on a PR of Dependabot the result is `skip`. Both
`action=implement` rows for an agent PR carry `pr`; the `implement` row for `/agent implement` has no `pr` and no
`kind`.

| Comment without a command | action | number | command.name | pr | kind |
|---|---|---|---|---|---|
| On an issue whose phase is `needs-human`; commenter allowed and a writer | `implement` | issue | `answer` | | `human` |
| On an agent PR whose issue is in `needs-human`; commenter allowed and a writer | `implement` | issue named by the marker | `answer` | PR | `human` |
| On an issue in `needs-info`, written by the issue author (any author), Bug or Task, limit not reached | `analyze` (trigger `author-reply`) | issue | empty | | |
| Anything else (a PR that is not an agent PR, another commenter, another phase) | `skip` (`not a command`) | issue or PR | | | |

The commenter of an `answer` is checked for permission after the state shows a hand-off (`isHandOffAnswer`), so an
ordinary comment costs no permission call. The phase `needs-info` is answered only by the issue author, never by a
third person.

**Event `workflow_run`** (`completed`; the workflows are listed in the workflow file)

| Condition | action | number | pr | head_sha | command | trigger | kind |
|---|---|---|---|---|---|---|---|
| Fork run (head repository is not this repository) | `skip` | PR number if known | | | | | |
| No open PR for the branch | `skip` | | | | | | |
| PR body has no marker | `skip` | PR | | | | | |
| No state comment for the issue, or its `pr` is another PR | `skip` | PR | | | | | |
| Phase of the issue is not `waiting-ci` | `skip` | PR | | | | | |
| `run.head_sha` differs from the head of the PR (a newer commit decides) | `skip` | PR | | | | | |
| No person in the state (`actorOf`), or the person is not allowed | `skip` | PR | | | | | |
| All pass | `ci-gate` | issue named by the marker | PR | head of the PR | empty | empty | empty |

The PR comes from `run.pull_requests[0]` (`getPull`), or, when the list is empty, from `listPulls` on the branch of the
run. The state is read only for an open PR that carries the marker.

**Event `pull_request_review`** (`submitted`)

| Condition | action | number | command | pr | kind |
|---|---|---|---|---|---|
| State is not `changes_requested`, or reviewer is a bot, or fork, or Dependabot | `skip` | PR | | | |
| PR is not an agent PR | `skip` | PR | | | |
| Reviewer not in `AGENT_ALLOWED_ACTORS`, or no write access | `skip` | PR | | | |
| All pass | `implement` | issue named by the marker | `{"name":"review-changes","force":false,"notes":"<review text>"}` | PR | `review` |

The workflow runs the `route` job for a review only when it has the state `changes_requested`, is not from a bot, comes
from a branch of this repository, and the PR body holds `ai-autonomous-agent issue=`. The job always checks out the
default branch, never the pull request: without a `ref`, a `pull_request` event would check out the merge ref and a
`pull_request_review` event the pull request itself.

- **Decisions:** see the tables above. Two filters sit in the workflow, not in the router: the `if:` of the `route` job
  (bot and Dependabot actors, forks of `workflow_run`, comments without `/agent` on a pull request that is not an agent
  pull request, and reviews that are not change requests) and the list of workflows in the `workflow_run` trigger.
- **Tests:**
  - `tools/agent/route.test.js`: the `pull_request` rules, `/agent review`, the permission and actor checks, the
    Dependabot
    case, `gather`, `formatOutputs`, and `main`.
  - `tools/agent/route.analysis.test.js`: the `issues` rules (with the grace period set to 0), the author reply,
    `/agent analyze`, `/agent implement`, the limit of analyses, and the `trigger` and `numbers` outputs.
  - `tools/agent/route.sweep.test.js`: the grace period on the events, the sweep (`gatherSweep` queries with a fixed
    clock, candidates before the count, filters, order, the cap of 5, a damaged state comment, the dry-run skip, the
    `numbers` output), the daily count (the label queries, window edges, automatic and command entries, the 100-state
    read cap), and the daily caps in `decide`.
  - `tools/agent/route.chat.test.js`: `retry`, `rerun`, `ci-check`, `stop`, `cost`, `help`, `chat`, the hand-off
    answer, the change request in a review, and the `pr` and `kind` outputs.
  - `tools/agent/route.ci.test.js`: the CI gate decision, the marker and state trust checks, forks, and `gatherCiFacts`.
  - `tools/agent/route.busy.test.js`: the busy check (older, newer, own, and old runs, linked numbers, the commands
    that are never declined, dry run, the comment and the reaction).
  - Fixtures: `tools/agent/fixtures/*.json`, one event per file (for example `issue_comment.chat.agent-pr.json`,
    `workflow_run.completed.json`, `pull_request_review.changes_requested.json`).

#### The busy check (one command at a time)

After `decide`, `main` calls `declineIfBusy` (log group `Check for a busy run`). The jobs of one number share the
concurrency group `ai-autonomous-<number>` with `cancel-in-progress: false`, and GitHub keeps one running and one
pending job per group and cancels older pending ones without a word. The groups stay, because they guard the state
comment. The busy check makes the drop explicit and puts the decline where the person sees it.

- **Which decisions.** `isWorkerCommand`: the event is `issue_comment` or `pull_request_review`, the decision has a
  `command`, and its action is `review`, `analyze`, `implement`, `rerun`, `ci-check`, or `chat` with
  `command.name === 'chat'` (a question). That covers a parsed command, the answer to a hand-off (`answer`), and a
  change request in a review (`review-changes`). `stop`, `help`, `cost`, a `skip`, and every automatic event
  (`pull_request`, `issues`, `workflow_run`, `schedule`) pass untouched and make no API call.
- **Which numbers.** `workNumbers`: the number of the event (where the command was written), and `number`, `pr`, and
  `issue` of the decision, and `linkedPullOf`: for a worker command written on an issue (and only then), the router
  reads the state comment of the issue (`findStateComment`, `parse`, guarded: an unreadable state or a failing read is
  logged and leaves the issue alone) and adds `state.pr`. The agent's pull request and its issue are one piece of work,
  so a run titled with the pull request number blocks a command on the issue, and a `ci_check` or `retry` on the
  agent's pull request covers its issue through the marker. Known gap: the CI gate run of a push event may have an empty
  `workflow_run.pull_requests`, so its title has no number and the check cannot see it.
- **Which runs.** One call of `gh.listWorkflowRuns('ai-autonomous-agent.yml', { created: '>=<now - 6 hours>' })`
  (`BUSY_WINDOW_MS`), filtered in code to the statuses `queued`, `in_progress`, `waiting`, `pending`, and `requested`,
  to a `created_at` inside the window, and to a `display_title` that ends with `#<n>` for one of the numbers (the
  match is on the whole trailing number, so `#20` is not `#200`). `findBusyRun` ignores the run with the id
  `GITHUB_RUN_ID` and every run with a larger id: a newer run declines itself, so the first comment wins. The oldest
  match is the busy one. A run whose `route` job still runs counts, because the router cannot yet know whether that
  run will skip; the window is seconds, and the comment tells the person to comment again, so a wrong decline costs a
  retry and never a double run. There is no job-level listing: a run counts as busy as a whole.
- **The decline.** The decision becomes `skip` with the reason `busy: run <id> works on #<n>`. The router posts one
  comment on the issue or pull request of the event: the mention of the commenter, then "I am already working on #n
  (run link), so I did not start `/agent <command>`. Comment it again when that run ends." The words after "did not"
  depend on the command: `start /agent rerun`, `start /agent ci_check`, `answer your question`,
  `act on your answer`, and `act on your change request` (also for `/agent <text>` on the agent's pull request, whose
  command name is `chat` but whose decision is `implement`). A command comment gets the reaction `confused`; a review
  has no comment to react to. In dry run nothing is posted or reacted with, and the job summary holds the comment
  that would be posted.
- **Failures.** A failed listing or comment throws, so the `route` job fails and no worker starts. A missing
  `GITHUB_RUN_ID` throws too. The router never starts a command on a guess.

#### Daily caps and the sweep

Two features of `route.js` guard the cost of the automatic work. Commands from people are never counted and never
capped.

**The count** (`countDaily`, with `lib/daily-usage.js`). `dailyCountNeeded` names the count an event needs, so that no
other event spends the searches: `analyses` for `opened` or `typed` when the grace period is 0 (a Bug or Task issue of
a person, without a decision label); `reviews` for a `pull_request` event that `pullRequestSkipReason` lets through
and that is not an already reviewed `ready_for_review`. The sweep names no count here: it counts for itself, see
below. The count searches only what the agent leaves behind, newest first:

```text
repo:<repo> is:issue label:"ai:suitable","ai:unsuitable","agent:needs-human" updated:>=<now - 24 hours> sort:updated-desc
repo:<repo> is:pr label:"agent:pr-reviewed" updated:>=<now - 24 hours> sort:updated-desc
```

A comma list in a label qualifier is an OR. The count reads the state comment of at most 100 results
(`MAX_STATES_READ`; the log warns when the search found more, so the count may be low), and counts the entries whose
`at` is in the window (inclusive at the start). The label filter has a limit: a failed review sets no
`agent:pr-reviewed`, so its entry is found only on a pull request that an earlier review labeled, and the count may
miss the others:

| Count | Entries | Counted | Not counted |
|---|---|---|---|
| analyses | `analyses[]` of issue states | `trigger` is `opened`, `typed`, or `sweep` | `edited`, `author-reply`, `command`, or no trigger |
| reviews | `reviews[]` of pull request states | `trigger` is `auto`, or missing (an entry from before `trigger` existed); a failed review (`failed: true`) counts, it cost model calls | `trigger` is `command`; `skipped` is `size` (it cost nothing) |

A damaged state comment is logged as a warning and not counted. The caps are `limits.dailyAnalyses` and
`limits.dailyReviews`. `decide` receives the result as `dailyUsage` (`{ analyses }` or `{ reviews }`; missing means 0).
`main` logs `dailyAnalyses` or `dailyReviews` as `count/cap` with the decision, and the reason of a skip reaches the
summary line.

**The sweep** (`decideSchedule`, `gatherSweep`). With `AGENT_DRY_RUN` not `false`, `gather` does no search and
`decideSchedule` skips with the dry-run reason: a dry-run analysis writes no state, so every sweep would pick the same
issues and the daily cap, counted from state comments, would never fill. Otherwise `gatherSweep` searches the
candidates first, with two searches (`gh.searchIssues`, `GITHUB_TOKEN`):

```text
repo:<repo> is:issue is:open type:Bug -label:"ai:suitable" -label:"ai:unsuitable" created:<from>..<to>
repo:<repo> is:issue is:open type:Task -label:"ai:suitable" -label:"ai:unsuitable" created:<from>..<to>
```

`to` is now minus `AGENT_ANALYSIS_GRACE_MINUTES` and `from` is now minus `SWEEP_LOOKBACK_DAYS` (7), both UTC ISO
without milliseconds. The labels are quoted because they hold a colon. The results are merged by number and sorted
oldest first; pull requests and bot authors are dropped. The state comment of each candidate is read in that order
until the budget is filled, and a candidate with any entry in `analyses` is dropped. The log shows the candidates, the
picked numbers, and how many were left for the next run. The decision is `analyze` with `trigger: sweep`, `numbers`,
and `number` set to the first one. An issue left over stays a candidate for the next run, while the 7-day lookback
lasts. When the grace period is 0 the sweep still runs and picks the issues the event missed. The injectable clock is
the `now` argument of `gather` (`deps.now` of `main`).

With no candidate the sweep ends there: no count and no state read, and the decision is `skip`. With at least one,
`gatherSweep` counts the analyses (`countDaily`), computes the budget `min(MAX_SWEEP, dailyAnalyses - count)`, where
`MAX_SWEEP` is 5, and reads the states of the candidates; with no budget it reads none and `decide` skips with the
daily limit. A damaged state comment of a candidate is logged as a warning and leaves that candidate out; it does not
stop the sweep.

### `tools/agent/review.js`

Flow A: reviews a pull request and assesses its impact. The `Review` step of the `review` job of
`.github/workflows/ai-autonomous-agent.yml` runs it, after the router returned `review`.

The job uses two checkouts. The working tree is the head of the pull request (`refs/pull/<n>/head`, `fetch-depth: 0`).
The tools, the opencode config, and the instructions (`.claude/`, `AGENTS.md`) come from a second checkout in
`.agent-tools`, from the ref of the workflow run (the default branch for `/agent review`). The job replaces the
instruction files of the pull request with the trusted ones. The job has one concurrency group per number,
`ai-autonomous-<number>`, without cancel.

- **Inputs:**
  - `GITHUB_REPOSITORY`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `GITHUB_STEP_SUMMARY`.
  - `AGENT_NUMBER` (the pull request), `AGENT_COMMAND` (the parsed command JSON; empty for a `pull_request` event),
    `AGENT_RUN_URL`, `AGENT_LABELER` (`.agent-tools/.github/labeler.yml`), `AGENT_OUT` (`${{ runner.temp }}/agent`).
  - The `AGENT_*` variables of `lib/config.js`: `config.models.review`, `config.models.verify`, `config.dryRun`,
    `config.limits.reviewMaxLines`, and `config.limits.reviewMaxFiles`.
  - `main(env, deps)` takes `deps.gh` and `deps.computeFacts`. `lib/facts.js`, which needs the `yaml` package, is loaded
    only when the facts are computed.
- **Outputs:** files under `AGENT_OUT`; the workflow uploads the folder as the artifact
  `ai-autonomous-review-<number>-<run_attempt>` (30 days, also on failure):

  | File | Content |
  |---|---|
  | `review-input.md` | Base branch, merge base, head, the impact facts as JSON, title and description of the pull request, and the notes of `/agent review` (all text from people in an `untrusted(...)` block). |
  | `pr-reviewer.jsonl`, `pr-reviewer.final.md` | Events and final answer of the reviewer (written by `lib/agent-call.js`). |
  | `verify-input.md` | Merge base, head, and the findings as JSON. Written only when the review has findings. |
  | `verifier.jsonl`, `verifier.final.md` | Events and final answer of the verifier. |
  | `summary.md` | The summary comment text (see below). Not written when a step failed. |

  In dry-run the job summary gets `## Dry run: AI review of #<n>`, the summary, and one line per inline finding. A
  review skipped for size writes no file.
- **Model calls:** through `callAgent` (`lib/agent-call.js`) and opencode. The answer is validated against a schema of
  `lib/contract.js`.
  - `pr-reviewer`: model `config.models.review` (`AGENT_MODEL_REVIEW`). Schema `review`: `summary`, `risk`
    (`low`, `medium`, `high`), `riskReason`, `impact` (`modules`, `images`, `restApi`, `database`, `deploy`, `e2e`), and
    up to 30 `findings` (`id`, `file`, `line` or null, `severity` `blocker`, `major`, `minor`, or `nit`, `category`,
    `title`, `body`).
  - `verifier`: model `config.models.verify` (`AGENT_MODEL_VERIFY`), called only when the review has findings. Schema
    `verification`: `verdicts` with `id`, `verdict` (`confirmed`, `plausible`, `rejected`), and `reason`.
  - Cost records (flow `review`, roles `pr-reviewer` and `verifier`) go to the `costs` list before anything can throw.
- **GitHub reads (`GITHUB_TOKEN`):** `getPull` (`GET /repos/{repo}/pulls/{n}`), `listPullFiles`
  (`GET /repos/{repo}/pulls/{n}/files`), `listIssueComments` (`GET /repos/{repo}/issues/{n}/comments`, to find the state
  comment, and again inside `state.withFreshCosts` right before the write). Git commands:
  `git fetch --no-tags origin <base>`, `git merge-base FETCH_HEAD HEAD`, `git rev-parse HEAD`.
- **GitHub writes (`GITHUB_TOKEN`, permissions `issues: write`, `pull-requests: write`):**
  - The state comment of the pull request, with `lib/state.js`: `updateIssueComment`
    (`PATCH /repos/{repo}/issues/comments/{id}`) or `createIssueComment` (`POST /repos/{repo}/issues/{n}/comments`). The
    comment
    is written first because it holds the cost record, which must survive a failed review post.
  - The review: `createReview` (`POST /repos/{repo}/pulls/{n}/reviews`) with `commit_id` set to the head SHA and the
    event `COMMENT` (the agent never approves or requests changes). The review body is
    `AI review of <sha7>: <n> inline finding(s). The summary is in the AI review comment of this pull request.` Each
    comment targets `path`, `line`, `side: RIGHT`. The call happens only when at least one finding is inline.
  - The label `agent:pr-reviewed` through `addLabels` (`POST /repos/{repo}/issues/{n}/labels`), only when nothing
    failed.
  - No reaction.
- **Stages:**
  1. Load (`Load the pull request`, `Load the state`): the pull request, its files, and the state comment (parsed, or
     `emptyPullState(number)`).
  2. Size check (`checkSize` of `lib/review-size.js`), before any model call. The size is the sum of `additions` and
     `deletions` of the files of `listPullFiles`, and their count, both without lock files (`LOCK_FILES`: a file whose
     basename is `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `go.sum`, or `go.work.sum`). A size above
     `AGENT_REVIEW_MAX_LINES` lines or `AGENT_REVIEW_MAX_FILES` files (exactly at a limit is allowed) ends the job green
     unless `command.force` is set (`/agent review force`). See "The size skip" below.
  3. Facts (`Compute the facts`): `git fetch`, the merge base, the head, and `computeFacts` (`lib/facts.js`: changed
     files, modules, risk flags from the labeler config, title, body).
  4. `pr-reviewer` writes the review as JSON (see the contract above).
  5. `verifier` checks each finding. `selectFindings` drops `rejected` findings, marks a finding without a verdict as
     `plausible`, and sorts by severity. `placeFindings` puts a finding inline when its file has a patch and its line is
     in `commentableLines(patch)` (`lib/diff.js`); the others go to the summary.
  6. Publish: state comment, review, label (in dry-run, only the job summary).
- **The size skip** (`skipForSize`): no model call, no label, no inline review. The human part of the state comment is
  `### AI review of <sha7> skipped`, then "The diff has N changed lines in M files (lock files not counted), above the
  limit of L lines or F files (AGENT_REVIEW_MAX_LINES, AGENT_REVIEW_MAX_FILES). An AI review of a diff this large costs
  much and finds little. Comment `/agent review force` to review it anyway." (`renderSkip`), with the run link. The
  state keeps its cost records and gets `{ sha, run, at, skipped: 'size', lines, files, trigger }` in `reviews`, so
  `ready_for_review` does not try again. The sha is the head of the pull request from `getPull`.
- **The summary comment:** it is the human part of the state comment (`state.render(human, state)`), so there is one
  comment, with the hidden JSON state under it. `renderSummary` builds it:
  - `### AI review of <sha7>`, the `summary` text, and `**Risk: <risk>.** <riskReason>`.
  - A table `| Impact | |` with Modules, Images, REST API, Database, Deployment (each `changed: yes/no` and, for REST
    and Database, `breaking: yes/no`, plus the notes), and E2E (collections and notes). Model text is put in one line,
    and `|` is escaped.
  - The verification line: "A second model checked the N finding(s): X confirmed, Y plausible (shown, marked as not
    confirmed), Z rejected (not shown). The text above was written before that check." Empty without findings.
  - `<n> finding(s) are inline comments on the diff.`, then `**Findings outside the diff lines**` with a list item per
    finding, or `No findings.`
  - The cost line, in a `<sub>` footer: a link to the run, "AI cost of this pull request so far: $X", and the hint
    to comment `/agent review` or `/agent cost`. `<usd>` is the sum of all cost records of the state plus this run,
    formatted by `usage.formatUsd`.
  - An inline finding reads `<icon> **<severity>**[ (plausible, not confirmed)]: <title>` and the body. Icons: blocker
    `🛑`, major `🔴`, minor `🟡`, nit `⚪`.
  - On failure the summary is `### AI review failed`, the reason, and a footer with the run link and the hint to comment
    `/agent review`. The job then fails after it has written the state and the failure text.
- **State written:** the cost records of this run are added to `costs`, also after a failure. On success an entry
  `{ sha, run, at, trigger }` is added to `reviews`; `trigger` is `command` when `AGENT_COMMAND` is set and `auto`
  otherwise. A failed review adds the same entry with `failed: true`, because it cost model calls. The router reads
  `reviews` to skip a second automatic review on `ready_for_review` (a size skip and a failed review count as a
  review: the failure comment tells the person to comment `/agent review`), and the daily count reads `trigger` and
  `skipped` and counts `failed` entries.
- **Decisions:**
  - No findings -> the verifier is not called.
  - A finding the verifier did not mention -> kept, marked `plausible`.
  - A finding with `line` null, a file outside the diff, or a line outside the hunks -> goes to the summary, not inline.
  - A failed review or verification -> failure text in the state comment, no label, a `reviews` entry with
    `failed: true`, the job fails.
  - A failed inline review post -> the label is not added, the job fails (the state comment is already written).
  - `AGENT_DRY_RUN` is not `false` -> job summary only, no write to GitHub.
  - A diff above a size limit without `force` -> the size skip above; with `force` -> the normal review.
- **Tests:** `tools/agent/review.test.js` covers `selectFindings`, `placeFindings`, `findingBody`, `renderSummary` (the
  table, empty lists, the cost line), and `verificationLine`. `tools/agent/review.main.test.js` runs `main` over a fake
  GitHub client for the size skip (state comment text, the `reviews` entry, kept costs, no label and no review, no
  facts, dry-run). `lib/review-size.test.js` covers the count, the lock files, the limits, and `force`. The path that
  runs the models needs Git and opencode and has no `main` test.

### `tools/agent/analyze.js`

Flow B. Decides whether a Bug or Task issue is suitable for AI implementation. The `analyze` job runs
`node tools/agent/analyze.js`. The job checks out the default branch (`fetch-depth: 0`), so the script, the opencode
config, and the skills are trusted. It has the permissions `contents: read` and `issues: write`, installs opencode, and
uses no `AGENT_PAT`. Its concurrency group is `ai-autonomous-<number>` (shared with `ci-gate`, `implement`, `publish`).
The job exits non-zero when the analysis or a label call failed (`main` throws `result.failure`).

- **Inputs:**
  - `GITHUB_REPOSITORY`, `GITHUB_TOKEN` (the job token), `OPENAI_API_KEY`.
  - `AGENT_NUMBER` (the issue; the matrix entry of the job), `AGENT_TRIGGER` (from the router output `trigger`;
    `unknown` when empty).
  - `AGENT_RUN_URL`, `AGENT_OUT`, `GITHUB_STEP_SUMMARY`, and the `AGENT_*` variables of `lib/config.js`
    (`dryRun`, `models.light`).
- **Outputs:** no step outputs.
  - Under `AGENT_OUT`: `analysis-input.md` (the analyst input), the opencode events and answer files written by
    `callAgent`, and `summary.md` (the human part of the state comment). The job uploads the folder as the artifact
    `ai-autonomous-analysis-<number>-<run_attempt>`.
  - In dry-run: a `## Dry run: AI analysis of #<n>` block in the job summary (the text, the labels to add and remove,
    and the comment that would notify the author).
- **Model calls:** one. Role and agent `analyst`, flow `analyze`, model `config.models.light`, schema `analysis`
  (`lib/contract.js`): `verdict` (`suitable`, `unsuitable`, `needs-info`), `reason`, `questions` (at most 10), and
  `plan` (`modules`, `approach`, `tests`, `risk` of `low`, `medium`, `high`) or `null`. `checkAnalysis` adds two rules
  the schema cannot express: `needs-info` needs at least one non-blank question, and `suitable` needs a plan. A broken
  rule throws `ContractError`.
- **GitHub reads** (all with `GITHUB_TOKEN`, through `createClient` of `lib/github.js`):
  - `gh.getIssue` (`GET /repos/{repo}/issues/{n}`), twice: at the start, and again after the model call to get the
    labels as they are then.
  - `gh.listIssueComments` (`GET /repos/{repo}/issues/{n}/comments`, paginated). The state comment is taken out of the
    list by `state.findStateComment` and not shown to the analyst.
  - `state.withFreshCosts` lists the comments once more right before the state write.
- **GitHub writes** (all with `GITHUB_TOKEN`; nothing in dry-run):
  - Labels, applied before the state: `gh.addLabels` (`POST /repos/{repo}/issues/{n}/labels`) once for all labels to
    add, then `gh.removeLabel` (`DELETE /repos/{repo}/issues/{n}/labels/{name}`, 404 is not an error) per label.
    `applyLabels` logs a failed call and goes on; the first error is returned as `failure`.
  - State comment: `gh.updateIssueComment` (`PATCH /repos/{repo}/issues/comments/{id}`) when a state comment exists,
    else `gh.createIssueComment` (`POST /repos/{repo}/issues/{n}/comments`). The body is `state.render(human, state)`.
  - For `needs-info` only: a separate comment from `questionsComment` that starts with `@<author>`, because only a new
    comment notifies. `analyze(env, deps, { askAuthor: false })` leaves it out.
- **State fields written** (`nextState`, `failedState`):
  - `phase`: `needs-info` for the verdict `needs-info`, else `analyzed`. A failed analysis keeps the old phase.
  - `analysis`: `verdict`, `reason`, `questions`, `plan`, `label` (the `ai:*` label that is the agent's after the
    changes, or `null`), `labelSetBy` (`agent`, or `null` when `label` is `null`), `issueUpdatedAt` (the `updated_at`
    of the issue before the run), `at`, `run`.
  - `analyses`: one entry per run `{ at, run, verdict, trigger }`; a failed run appends `verdict: 'failed'`. The router
    counts this array against `AGENT_MAX_ANALYSES`.
  - `costs`: the cost records of the run (`state.addCost`), also when the analysis failed.
- **Triggers** (decided in `route.js`, passed as `AGENT_TRIGGER`):

  | Trigger | Event | Rule |
  |---|---|---|
  | `opened` | `issues` `opened` | Bug or Task, no person-set `ai:suitable`/`ai:unsuitable`, grace period 0, daily cap not reached; any author |
  | `typed` | `issues` `typed` | Same rules (the type was set after creation) |
  | `sweep` | `schedule` | The grace period is over; the issue has no analysis and no decision label (the sweep, up to 5 per run) |
  | `edited` | `issues` `edited` | Phase is `needs-info`, and the author made the edit; any author; not capped |
  | `author-reply` | `issue_comment` without a command | Phase is `needs-info`, and the author wrote the comment; any author; not capped |
  | `command` | `/agent analyze` | Writer permission; the issue type is still checked; no limit |

  The analysis covers the types `Bug` and `Task` only (`ANALYZED_TYPES` in `route.js`). Bot authors are skipped.
  The analyst input records the trigger as `Analysis trigger: <trigger>`.
- **Decisions:**
  - Skip rules live in the router, not in `analyze.js`: a person-set `ai:suitable` or `ai:unsuitable` label skips
    `opened` and `typed`. `checkAnalysisLimit` skips every trigger except `command` when `state.analyses.length` is
    at or above `AGENT_MAX_ANALYSES` (default 5); the reason is `analysis limit reached; comment /agent analyze`.
    `AGENT_ALLOWED_ACTORS` does not apply to the issue author.
  - The sweep re-check (`sweepSkipReason`): only for the trigger `sweep`, right after the issue and its state are
    loaded. Two sweeps, or a sweep and an event, can pick the same issue, so the job stops without a model call and
    writes nothing (it logs the decision and exits 0, `analyze()` returns `skipped`) when the state already has an entry
    in `analyses`, the issue has `ai:suitable` or `ai:unsuitable`, the issue is closed, or its type is no longer `Bug`
    or `Task`.
  - Label rule (`labelChanges`): a label is the agent's only when the state has `analysis.labelSetBy === 'agent'` and
    `analysis.label` equals it. Any other `ai:suitable` or `ai:unsuitable` on the issue is a person's decision, and
    then the agent adds and removes no decision label. The labels are read again after the model call, so a label set
    during the run wins.
  - `suitable`: add `ai:suitable`, remove `ai:unsuitable` and `agent:needs-human`. The comment ends with
    "Comment `/agent implement` to start the implementation."
  - `unsuitable`: add `ai:unsuitable`, remove `ai:suitable` and `agent:needs-human`. Same implement hint.
  - `needs-info`: add `agent:needs-human`, keep both `ai:*` labels, set the phase `needs-info`, list the numbered
    questions in the state comment, and post the separate mention comment to the issue author.
  - Failure (model, contract, or label call): the state comment becomes `### AI analysis failed`; the phase and the
    last `analysis` stay; the failed run is added to `analyses`; the cost is kept; the job fails.
  - If a label call fails, the state keeps the earlier ownership of the label (`agentLabelAfter` uses only the
    changes that were applied).
- **Exports reused by `implement.js`:** `runAnalysis` (the model part, no GitHub call; used by `implement.js work`,
  which has no token), `labelChanges`, `applyLabels`, `nextState`, `failedState`, `renderAnalysis`. Other exports:
  `main`, `analyze`, `checkAnalysis`, `agentLabelAfter`, `renderFailure`, `renderInput`, `questionsComment`.
  `implement.js` runs the analysis with the trigger `command` when the issue changed since its last analysis.
- **Untrusted text:** `renderInput` puts the title, the body, every comment (each cut at 20,000 characters), and the
  previous reason and questions inside `untrusted()` blocks. Model text in comments goes through `inline()`, which
  defuses `@` mentions.
- **Tests:**
  - `tools/agent/analyze.test.js`: `checkAnalysis`, `labelChanges` (ownership, person labels, needs-info),
    `agentLabelAfter`, `nextState`, `failedState`, the renderers, the state round trip, `renderInput` (untrusted
    blocks, cuts, previous analysis).
  - `tools/agent/analyze.main.test.js`: `analyze()` with injected GitHub and agent clients: each verdict, re-analysis,
    person labels, dry-run, failures, labels re-read after the model call, failed label calls, `askAuthor: false`, and
    the sweep re-check (each skip reason, no call and no write, and the normal path).

### `tools/agent/implement.js`

Flow C of the AI Autonomous agent: it implements a Bug or Task issue up to a draft pull request. One file has three
modes, `preflight`, `work`, and `publish`, selected by `main(argv)` (`node tools/agent/implement.js <mode>`). Any other
argument throws `Usage: node tools/agent/implement.js preflight|work|publish`. The workflow
`.github/workflows/ai-autonomous-agent.yml` runs them in two jobs:

| Mode | Job | Tokens in the step | What runs |
|------|-----|--------------------|-----------|
| `preflight` | `implement` | `GITHUB_TOKEN`, `AGENT_PAT` | Script from the default-branch checkout; no model code yet |
| `work` | `implement` | `OPENAI_API_KEY` only | A copy of `tools/agent` made into `$RUNNER_TEMP/agent-tools`; model-written code runs here |
| `publish` | `publish` | `GITHUB_TOKEN` (`actions: write`, `checks: read`, `statuses: read` for the rerun of an `unrelated` CI fix), `AGENT_PAT` | Script from a sparse checkout of the default branch; no model, no repository code |

The split exists because the tests of the change run model-written code as the same user as the script. The `work`
step has no GitHub token, so that code cannot read one. The `implement` job has a 90-minute timeout, the `publish` job
15 minutes. Both jobs share the concurrency group `ai-autonomous-<issue number>` with `cancel-in-progress: false`.
The `work` step passes artifacts to `publish`: the folder `$RUNNER_TEMP/agent` (`AGENT_OUT`) is uploaded as
`ai-autonomous-implement-<number>-<run_attempt>` and downloaded by `publish`.

Common environment (set at job level in the workflow):

| Variable | Meaning |
|----------|---------|
| `GITHUB_REPOSITORY` | `owner/repo` for every GitHub client |
| `AGENT_NUMBER` | The issue number (required) |
| `AGENT_COMMAND` | JSON of the parsed command from the router; default `{ "name": "implement", "force": false, "notes": "" }`. Invalid JSON throws `AGENT_COMMAND is not valid JSON` |
| `AGENT_ACTOR` | Login of the commenter or reviewer. Required, except for `ci-fix`, where the state supplies it |
| `AGENT_KIND` | `initial` (default), `ci-fix`, `human`, or `review`; anything else throws `AGENT_KIND must be initial, ci-fix, human, or review` |
| `AGENT_PR` | Pull request of a comment or a review (positive integer, else ignored) |
| `AGENT_COMMENT_ID` | The comment that gets the reactions (`eyes`, `rocket`, `confused`); empty for a review or a CI fix |
| `AGENT_RUN_URL` | URL of the workflow run; goes into the state and the `Agent-Run:` trailer (required) |
| `AGENT_OUT` | The artifact folder (required); the workflow sets it to `$RUNNER_TEMP/agent` |
| `AGENT_*` of `lib/config.js` | `AGENT_DRY_RUN`, `AGENT_MODEL_IMPLEMENT`, `AGENT_MODEL_REVIEW`, `AGENT_MODEL_LIGHT`, `AGENT_MAX_REVIEW_ROUNDS` (default 2), and the rest |
| `GITHUB_OUTPUT`, `GITHUB_STEP_SUMMARY` | Step outputs and job summary; without `GITHUB_OUTPUT` the outputs go to stdout |

`AGENT_ALLOWED_ACTORS` is not read here. The router (`tools/agent/route.js`) applies it, and it parses the command
before this script runs. This script does no allow-list check of its own.

The script never gives a token to the model or to the checks. `lib/opencode.js` strips tokens from the model's
environment, and `cleanEnv` drops every variable that matches `SECRET_ENV` plus `OPENAI_API_KEY` from every child
process that `work` starts (Git and the check commands). `readPat(env)` is the only reader of `AGENT_PAT`. The push
URL contains the token, so it is never logged, and `redact(text, [url, pat])` cleans the push error.

Attempt kinds (`AGENT_KIND`):

| Kind | Started by | Decision in `preflight` | Branch | Notes |
|------|------------|-------------------------|--------|-------|
| `initial` | `/agent implement` | `preflightDecision` | New branch, or the recorded one on a later attempt | A second `initial` attempt is recorded as kind `human` (`attemptKindOf`, attempt number above 1) |
| `ci-fix` | The CI gate (`ci-gate.js`) when CI is red | None; only `requireCiFixState` | Must continue the recorded branch | One new commit on top, pushed without force; the implementer gets the CI report (`st.lastCiReport`) and the skill `apihub-ci-failure-triage`; it may answer `unrelated` (no commit, no push, the failed checks are rerun) |
| `human` | `/agent retry`, a free-text change request on a pull request of the agent (command name `chat`), an answer to a hand-off (command name `answer`) | `humanDecision` | Continues the open pull request; new `-v<n>` branch when that pull request is closed | Skips the suitability refusals; fresh CI budget (`budgetFrom`) |
| `review` | A review with change requests on a pull request of the agent | `humanDecision` | Must continue the recorded branch | Unresolved review threads go to the implementer; `publish` replies in each |

#### `preflight`

Decides whether the issue may be implemented, marks the state, and saves the facts that `work` needs.

- **Inputs:** the env above. Reads the issue, its comments, and its state comment.
- **Outputs:**
  - `$GITHUB_OUTPUT`: `proceed` (`true` or `false`) and `outcome` (the decision string).
  - File `context.json` in `AGENT_OUT`, on `proceed=true` only.
  - Job summary in dry-run.
- **Model calls:** none.
- **GitHub reads (`GITHUB_TOKEN`):**
  - `getIssue` (`GET /repos/{owner}/{repo}/issues/{n}`).
  - `listIssueComments` (`GET /repos/{owner}/{repo}/issues/{n}/comments`, paginated), through `loadIssue`.
  - `getPull` (`GET /repos/{owner}/{repo}/pulls/{n}`) for the pull request named in the state, for `human` and `review`.
  - `listReviewThreads` (GraphQL query `repository.pullRequest.reviewThreads(first: 100)` with the first 20 comments
    of each) for `review`.
  - `withFreshCosts` re-reads the issue comments right before the state write.
- **GitHub reads (`AGENT_PAT`):** `getAuthenticatedUser` (`GET /user`) in `resolveIdentity`, built with
  `createClient({ token: readPat(env), repo })`. This is the only use of the PAT before `publish`. In dry-run
  without a PAT, the identity is `github-actions[bot]` with the no-reply address of that bot.
  Outside dry-run, a missing PAT throws `AGENT_PAT is not set` before any write.
- **GitHub writes (`GITHUB_TOKEN`):**
  - `addReaction` (`POST /repos/{owner}/{repo}/issues/comments/{id}/reactions`): `eyes` at the start, `confused` on a
    refusal.
  - On a refusal: `createIssueComment` (`POST .../issues/{n}/comments`) with the reply.
  - On `proceed`: `updateIssueComment` (`PATCH .../issues/comments/{id}`) or `createIssueComment` for the state
    comment.
  - In dry-run nothing is written; the reply or the decision goes to the job summary
    (`## Dry run: AI implementation of #<n> refused` or `... may proceed`).

**Refusals and replies.** Every reply starts with `@<actor>`. A refusal writes `proceed=false`, `outcome=<refusal>`,
and adds the `confused` reaction.

| Outcome | Applies to | Condition | Reply |
|---------|-----------|-----------|-------|
| `refuse-closed` | all but `ci-fix` | `issue.state === 'closed'` | `this issue is closed. Reopen it first if it still needs work.` |
| `refuse-type` | all but `ci-fix` | Issue type is not `Bug` or `Task` | `I implement Bug and Task issues only; this one is <type or untyped>.` |
| `refuse-busy` | all but `ci-fix` | State phase is `implementing` and `implementing.at` is at most 120 minutes old (`BUSY_MS`); an older attempt counts as dead | `an implementation is already running: <run URL>.` |
| `refuse-unsuitable` | `initial` | Label `ai:unsuitable` and no `force` | `I did not start.` plus the analysis reason (when the agent set the label) or `A person marked this issue ai:unsuitable.`, then ``If you want me to try anyway, comment `/agent implement force`.`` |
| `refuse-needs-info` | `initial` | Fresh analysis has verdict `needs-info` | The numbered questions, ``Answer them, or edit the issue, then comment `/agent implement` again.``; mentions the issue author too, when the author is not the asker |
| `refuse-no-branch` | `human` with `changes`, `review` | State has no `branch` or `pr`, or `pr` differs from `AGENT_PR` | `I can change a branch only after an attempt of mine pushed it ...` |
| `refuse-pr-closed` | `human` with `changes`, `review` | Pull request of the state is not open | ``the pull request is closed ... comment `/agent retry` with guidance to start a new pull request.`` |

`changes` is true for kind `review` and for the command name `chat`. The checks run in the order of the table rows
within a kind. `preflightDecision` order: closed, type, busy, `ai:unsuitable` without `force`, stale analysis
(`analyze-first`), `needs-info`, `proceed`. `force` makes the result `forced: true` and keeps the label. An
analysis counts as stale when none exists, or the issue `updated_at` is later than `analysis.issueUpdatedAt`, or
either time is unreadable. A refusal for the command name `answer` with `refuse-busy` posts nothing (the answer
resumes the flow once), but it still sets `proceed=false` and the `confused` reaction.

**Decisions on `proceed`:**

- `ci-fix` -> `requireCiFixState` (phase `implementing`, `implementing.kind === 'ci-fix'`, a recorded `branch` and
  `pr`; else it throws). The actor is `st.implementing.actor`, else `AGENT_ACTOR`. The state comment is not written,
  because the CI gate already set the phase. Output `proceed=true`, `outcome=ci-fix`.
- `initial` -> output `outcome=proceed` or `analyze-first`. `analyzeFirst` is true for `analyze-first`.
- `human` and `review` -> output `outcome=proceed`; `analyzeFirst` is always false. `fresh` is true for a retry or an
  answer when the state has a `pr` and that pull request is not open.

**State written (non-dry-run, not `ci-fix`).** The state comment is created or updated with the human text
`### AI implementation is running` and ``[The run](<run URL>) was started by @<actor>.``. The state is the previous
one with `phase: 'implementing'` and:

```json
{
  "implementing": { "run": "<run URL>", "actor": "<login>", "at": "<ISO time>", "analyzeFirst": true }
}
```

For `human` and `review` (`markedPersonState`) the object also gets `kind` (`human` or `review`), `pr` (when
`AGENT_PR` is set), and `threads` (`[{ id, commentId }]`, only the unresolved threads that the implementer will see,
at most 30, `commentId` is the `databaseId` of the first comment), and `analyzeFirst` is `false`. The state also gets
`budgetFrom` (the number of earlier attempts, so the CI loop starts a fresh count) and loses `stoppedBy` and
`stoppedAt`. On a fresh start it deletes `branch`, `pr`, `ciGate`, `lastCiReport`, `e2eRerun`, and `e2eReruns`, and
appends
`{ pr, branch }` of the old pull request to `retired`.

**`context.json`** (`saveContext`, in `AGENT_OUT`; the file `work` reads, because `work` has no token):

| Field | Content |
|-------|---------|
| `version` | `1` |
| `number` | The issue number |
| `ciFix` | `true` for `ci-fix` |
| `kind` | The env kind (`initial`, `ci-fix`, `human`, `review`) |
| `actor` | The person who asked |
| `command` | The parsed `AGENT_COMMAND` |
| `runUrl` | `AGENT_RUN_URL` |
| `analyzeFirst` | Whether `work` must run the analysis first |
| `fresh`, `changes` | Start a new branch and pull request; change the open pull request |
| `reviewThreads`, `omittedThreads` | The shown unresolved threads (`{ id, isResolved, path, line, comments: [{ author, body, databaseId }] }`) and the count left out |
| `identity` | `{ name, email }` of the PAT owner; the address is the GitHub no-reply address of the owner |
| `issue` | The full issue object |
| `comments` | The issue comments without the state comment |
| `state` | The marked state (the one just written) |

**Tests:** `tools/agent/implement.test.js` (pure functions: decisions, replies, branch name, diff parsing, commit
text, prompts, PR body, state record, `runChecks`, `pushBranch`, `outcomeProblems`) and
`tools/agent/implement.main.test.js` (the three modes from start to finish with fake GitHub and Git clients: preflight
refusals, `context.json`, retry, change request, review threads).

#### `work`

Runs one attempt without GitHub. It reads `context.json` and writes `outcome.json` and, if there is code,
`branch.bundle`.

- **Inputs:** `AGENT_OUT/context.json`, `OPENAI_API_KEY` (used by opencode), `AGENT_MAX_REVIEW_ROUNDS`, the model
  variables. Runs in a checkout of the default branch with Git history.
- **Outputs:** the files below. The step does not set `$GITHUB_OUTPUT`. It does not throw on a stage failure; the
  failure goes to `outcome.failure`.
- **GitHub reads and writes:** none. The Git remote `origin` is used for `ls-remote` and `fetch` only.
- **Model calls:**

| Role (opencode agent) | Model variable | Contract (`lib/contract.js`) | When |
|-----------------------|----------------|------------------------------|------|
| `analyst` | `AGENT_MODEL_LIGHT` (`config.models.light`) | `analysis` | Only when `context.analyzeFirst` (through `runAnalysis` of `analyze.js`) |
| `implementer` | `AGENT_MODEL_IMPLEMENT` (`config.models.implement`) | `implementation` | Every round |
| `self-reviewer` | `AGENT_MODEL_REVIEW` (`config.models.review`) | `selfReview` | Every round that reaches the review |

All three go through `callAgent` (`lib/agent-call.js`), which writes the event stream, the final answer, and a cost
record into `costs` before anything can throw. `implementation` has `status` (`done`, `blocked`, or `unrelated`),
`summary`,
`commitType`, `scope`, `title` (at most 72 characters), `verification`, `notes`, `blockedReason`. `selfReview` has
`verdict` (`approve` or `changes`) and `findings` (at most 20; `severity` is `blocker`, `major`, or `minor`; `file`,
`line`, `body`). Extra rules (`checkImplementation`, `checkSelfReview`): a `bug-fix` must use `commitType: 'fix'`, a
`blocked` or `unrelated` answer needs a non-empty `blockedReason`, `unrelated` is allowed on a `ci-fix` attempt only, a
`changes` verdict needs at least one finding, and an `approve`
cannot carry a `blocker`. A broken contract throws and ends the attempt with `failure`.

**Stages:**

1. **Playbook.** `playbookOf(issue.type.name)`: `Bug` -> playbook `bug-fix`, branch prefix `bugfix`; `Task` -> playbook
   `task`, prefix `feature`. Any other type throws `No playbook for the issue type '<type>'`.
2. **Fresh-analysis check.** Only when `context.analyzeFirst` (set by `preflight`, from `needsAnalysis`: no analysis,
   or the issue was updated after the last one) `work` runs `runAnalysis` with trigger `command` and stores the result
   as `outcome.analysis` (with `issueUpdatedAt`). The verdict then decides:
   - `needs-info` -> `outcome.stopped = 'refuse-needs-info'`, no implementation.
   - `unsuitable` -> `outcome.stopped = 'refuse-unsuitable'`, unless the command has `force` (then
     `outcome.forced = true`) or a person set `ai:suitable` (the label counts as a person's when the state does not show
     that the agent
     set it).
   - `suitable` -> go on; the new plan feeds the implementer.
   Without the analysis step, the plan comes from `st.analysis`.
3. **Branch** (`prepareBranch`). The branch name is `st.branch` or `branchName(type, number, title)`:
   `<prefix>/<number>-<slug>`; the slug is up to five words of the title, lowercased, characters other than `a-z0-9`
   replaced by `-`, at most 40 characters, trailing `-` trimmed (for example `bugfix/123-fix-the-null-pointer`).
   `git ls-remote --heads origin <branch>` looks for the remote head (`parseLsRemote`). Then:
   - A branch on the remote that the state does not record throws
     (`... already exists on the remote and no earlier attempt of the agent made it`): the agent never overwrites
     someone else's branch.
   - `ci-fix` and `changes` attempts must continue: a missing `st.branch`, or a branch gone from the remote, throws.
   - A recorded branch that exists on the remote is continued: `git fetch --no-tags origin <branch>`,
     `git checkout -B <branch> FETCH_HEAD`, `git fetch --no-tags origin develop`, and the base is
     `git merge-base origin/develop HEAD`. `previousSha` is the remote head, except for `ci-fix` (`null`, no lease).
   - Otherwise a new branch: `git checkout -B <branch> origin/develop`, base is `HEAD`. A recorded branch gone from
     the remote also starts here (no lease).
   - `fresh`: the first free name among `<name>`, then `<name>-v2` to `<name>-v9` (`MAX_BRANCH_VERSION`); all taken
     throws `The branches <a> to <b> exist on the remote; delete one of them`.
   The base is the branch point of the whole pull request, so the checks, the self-review, and the limits cover the
   whole pull request, not only this attempt.
4. **Git identity.** `git config user.name` and `user.email` from `context.identity`.
5. **Rounds** (`implementRounds`), from round 1 up to `AGENT_MAX_REVIEW_ROUNDS` (default 2):
   1. Write `implement-input.md` (`renderImplementInput`) and call `implementer`. If `status` is `blocked`, the attempt
      is blocked with `implementation.blockedReason`. If `status` is `unrelated` (only on a `ci-fix` attempt; the
      `check` of the call is `checkImplementation(output, playbook, kind)`, so any other kind is a contract failure and
      the repair prompt goes back to the model), `work` commits nothing, runs `git checkout -- .` and `git clean -fd` to
      discard the working tree, and runs no checks, no self-review, no diff limit, and no bundle. The outcome is
      `result: 'unrelated'` with `blockedReason` set to the reason, `checks` and `review` `null`, and `bundle: false`.
      For a CI fix, `renderImplementInput` tells the implementer about the verdict (`UNRELATED_HINT`) next to the task.
   2. Commit: `git status --porcelain`. No changes in round 1 means blocked with
      `The implementer reported done, but the working tree has no changes.` No new changes in a later round keeps the
      earlier commit. Otherwise
      `git add -A` and `git commit --no-verify -m <message>`; later rounds add `--amend`, so an attempt is one commit.
   3. Local checks (`runChecks`, below).
   4. Write `self-review-input.md` (`renderSelfReviewInput`: base and head commit, `git diff <base> <head>`, the
      issue, the notes, the plan, the implementer's summary) and call `self-reviewer`.
   5. Stop with status `done` when the checks passed and `effectiveVerdict(review) === 'approve'`, or when
      `round >= maxReviewRounds`. Otherwise the next round gets `previous = { findings, checks }`: the open findings
      (`blocker` and `major`; `minor` alone count as `approve`) and the output tails of the failed commands.
   Reaching the round limit is not a block: the result becomes `draft`.
6. **Local checks** (`runChecks`, `checkCommands(base, changedFiles)`), run in order, stopping at the first failure,
   each with a 40-minute timeout (`CHECK_TIMEOUT_MS`) and `cleanEnv`:
   1. `pnpm exec nx affected -t build test --base=<base> --head=HEAD --parallel=3 --output-style=static`
      (name `nx affected`; `<base>` is the commit from step 3).
   2. `pnpm test:tools`, only when `git diff --name-only <base> HEAD` lists a file under `tools/`.
   Each result is `{ command, exitCode, timedOut, tail }` (last 200 lines, ANSI colors removed). `checks` is
   `{ passed, results }`.
7. **Diff limits and protected paths** (`diffBlockReason`, step `Diff size`), measured with
   `git diff --shortstat <base> HEAD` and `git diff --name-only <base> HEAD`. They run after the rounds, not inside
   them:

   | Playbook | Files | Changed lines (insertions plus deletions) |
   |----------|-------|-------------------------------------------|
   | `bug-fix` | more than 20 | more than 600 |
   | `task` | more than 30 | more than 1000 |

   Exceeding either number blocks. Protected paths (a match blocks):
   - `.github/workflows/` (the PAT has no Workflows permission).
   - The agent's own files: `.claude/`, `.cursor/`, `tools/agent/`, `agent-packages/` at the start of the path, and
     any `AGENTS.md` or `CLAUDE.md` at any depth.
8. **Result.** `blocked` when the implementer said so, the tree was clean, or step 7 gave a reason. `pr-opened` when
   not blocked, the checks passed, and the effective verdict is `approve`. Otherwise `draft` (checks red or changes
   still requested after the last round).
9. **Bundle and diff preview**, only for `pr-opened` and `draft`:
   `git bundle create <AGENT_OUT>/branch.bundle <base>..HEAD`, `git diff --stat <base> HEAD`, and the first 300 lines
   of `git diff <base> HEAD` (read with a 200000-byte cap) go to `outcome.diff = { stat, preview }`.

**What makes an attempt `blocked`:**

- `implementation.status === 'blocked'` (reason: `blockedReason` of the implementer).
- The result `unrelated` is not a block: `publish` reruns the failed checks (see `publish`).
- No changes in the working tree after a `done` answer in round 1.
- A diff over the limit, or a change to a protected path. The reason texts start with "The change has outgrown the
  issue", "The change edits workflow files", or "The change edits the agent's own instructions or tools", and the last
  two end with "A person has to make that part of the change."
- `publish` repeats the limit check and can turn `draft` or `pr-opened` into `blocked` (see `publish`).

**Files written under `AGENT_OUT`:**

| File | Written by | Content |
|------|-----------|---------|
| `context.json` | `preflight` | See above |
| `analysis-input.md` | `runAnalysis` | Analyst input; only when the analysis ran |
| `analyst.jsonl`, `analyst.final.md` | `callAgent` | Event stream and final answer of the analyst |
| `implement-input.md` | each round | The latest implementer input (overwritten) |
| `implement-input-r<N>.md` | each round | The implementer input of round N |
| `implementer-r<N>.jsonl` | `callAgent` | Event stream of the implementer, round N |
| `implementer-r<N>.final.md` | `callAgent` | Final answer of the implementer, round N |
| `self-review-input.md` | each round | The latest self-review input (overwritten) |
| `self-review-input-r<N>.md` | each round | The self-review input of round N |
| `self-reviewer-r<N>.jsonl`, `self-reviewer-r<N>.final.md` | `callAgent` | Event stream and final answer of the self-reviewer, round N |
| `branch.bundle` | step 9 | Commits `<base>..HEAD`; absent for `blocked`, `unrelated`, `stopped`, and failures |
| `outcome.json` | end of `work` | Written always, also after a failure |

`outcome.json` fields (`version` is `1`):

| Field | Content |
|-------|---------|
| `number`, `kind`, `attemptNo`, `at` | Issue, attempt kind (`attemptKindOf`), `attempts.length + 1`, ISO time |
| `forced` | `command.force` while the issue has `ai:unsuitable`, or set by the analysis step |
| `playbook` | `bug-fix` or `task` |
| `analysis` | The analysis output plus `issueUpdatedAt`, or `null` |
| `stopped` | `refuse-needs-info`, `refuse-unsuitable`, or `null` |
| `failure` | `{ message, stage }` with stage `setup`, `analysis`, or `implementation`; or `null` |
| `result` | `blocked`, `pr-opened`, `draft`, `unrelated` (a CI fix only), or `null` |
| `blockedReason` | Text, or `null` |
| `rounds` | Rounds run |
| `implementation`, `checks`, `review` | Output of the last implementer round; `{ passed, results }`; output of the last self-review |
| `branchInfo` | `{ branch, continuing, previousSha, base, head }` |
| `diff` | `{ stat, preview }` or `null` |
| `bundle` | `true` when `branch.bundle` exists |
| `costs` | The cost records (`usage.costRecord`) of every model call, also after a failure |

- **Decisions:** all of the stage rules above. A throw anywhere sets `failure` with the stage reached and still writes
  `outcome.json`.
- **Tests:** `implement.main.test.js` covers the green path, a Task, contract failure with the cost recorded, round
  limits (`AGENT_MAX_REVIEW_ROUNDS`), minor-only findings, red checks, diff-limit blocking, the analysis outcomes, a
  continued branch with lease, a fresh start, a CI fix, and the `work` tests with no GitHub client. `implement.test.js`
  covers `runChecks` (200-line tail, timeout, stop at first failure), `checkCommands`, `diffBlockReason`,
  `prepareBranch`, and `defaultExec` (no secrets, long output, timeout).

#### `publish`

Reads the artifact of the `work` step, pushes the branch, opens or updates the pull request, writes the state and the
labels, and mentions the person who asked. It runs no model and no repository code.

- **Inputs:** the env above, `outcome.json` and `branch.bundle` from the downloaded artifact, `AGENT_PAT`.
- **Outputs:** `summary.md` in `AGENT_OUT` (uploaded as `ai-autonomous-publish-<number>-<run_attempt>`), and the job
  summary in dry-run. No `$GITHUB_OUTPUT` keys.
- **Model calls:** none.
- **GitHub reads (`GITHUB_TOKEN`):** `getIssue`, `listIssueComments` (through `loadIssue` and `withFreshCosts`).
- **GitHub reads (`GITHUB_TOKEN`):** also `getPull` (`GET .../pulls/{n}`) for the pull request of the state.
- **GitHub writes:**

| Call | Endpoint or query | Token |
|------|------------------|-------|
| Push | `git push --no-verify [--force-with-lease=refs/heads/<branch>:<previousSha>] <push URL with the PAT> <head>:refs/heads/<branch>` | `AGENT_PAT` |
| `createPull` (`openPull`) | `POST /repos/{owner}/{repo}/pulls` with `draft: true`, `base: develop`, `head: <branch>` | `AGENT_PAT` |
| `updatePull` | `PATCH /repos/{owner}/{repo}/pulls/{n}` (title, body) | `AGENT_PAT` |
| `convertPullToDraft` | GraphQL mutation `convertPullRequestToDraft` | `AGENT_PAT` |
| `createIssueComment`, `updateIssueComment` | `POST .../issues/{n}/comments`, `PATCH .../issues/comments/{id}` | `GITHUB_TOKEN` |
| `addLabels`, `removeLabel` | `POST .../issues/{n}/labels`, `DELETE .../issues/{n}/labels/{name}` | `GITHUB_TOKEN` |
| `replyToReviewComment` | `POST .../pulls/{n}/comments/{commentId}/replies` | `GITHUB_TOKEN` |
| `addReaction` | `POST .../issues/comments/{id}/reactions` | `GITHUB_TOKEN` |

The PAT opens and edits the pull request so that its events start the workflows of the repository. `publish` never
marks a pull request ready; only the CI gate does, after CI is green on GitHub.

**Flow of `publishAttempt`:**

1. Load the issue and the state. For `ci-fix`, `requireCiFixState` runs first (nothing is written before it). The
   actor is `st.implementing.actor || AGENT_ACTOR` for `ci-fix`; no actor throws.
2. Read `outcome.json`. **Missing outcome path:** the log warns, and `failedOutcome` is built with
   `stage: 'work'` and the message "The work step left no outcome: it crashed, timed out, or was cancelled. Its job
   log has the details."
   `recoverCosts` re-creates cost records from the files `analyst*.jsonl`, `implementer*.jsonl`, and
   `self-reviewer*.jsonl` in `AGENT_OUT` (the models come from `AGENT_MODEL_LIGHT`, `AGENT_MODEL_IMPLEMENT`,
   `AGENT_MODEL_REVIEW`).
3. **Trust check** (`outcomeProblems`). The outcome comes from a job that ran model-written code, so it is data of
   an untrusted source. The problems it names:
   - `result` not in `blocked`, `pr-opened`, `draft`, `unrelated`; `stopped` not `refuse-needs-info` or
     `refuse-unsuitable`.
   - `result` `unrelated` is accepted only for the kind that `publish` derives itself (`ci-fix`; `outcomeProblems` takes
     `kind`, else the outcome's own claim), needs a non-blank `blockedReason`, and carries no bundle.
   - **Branch derivation:** `branchInfo.branch` must equal `st.branch`, else `branchName(type, number, title)`. A
     fresh start (no `st.branch`) may also use `<expected>-v<digits>` (`branchAllowed`).
   - `branchInfo.head` (and `previousSha`) must match `^[0-9a-f]{40,64}$`.
   - **Contracts:** `implementation`, `review` (`selfReview`), and `analysis` (without `issueUpdatedAt`) are validated
     again with `lib/contract.js`; `checks` needs `results` (array) and `passed` (boolean).
   - A result with code (`pr-opened` or `draft`) needs `implementation`, `review`, `checks`, and `branchInfo`.
   Any problem replaces the outcome with a `failedOutcome` (message
   `The outcome of the work step is not trusted: <problems>`), keeping only cost records that have a numeric `usd`.
4. **Stopped by a person.** When the state phase is `stopped` and `implementing.run` equals `AGENT_RUN_URL`,
   `publishStopped` records the costs and an attempt with `result: 'stopped'` (notes
   `@<stoppedBy> stopped this attempt.`), removes `implementing`, keeps the phase `stopped`, writes the state comment,
   and posts nothing else.
5. **Analysis of this run.** If `outcome.failure.stage === 'analysis'`, the state goes through `failedState`. If
   `outcome.analysis` exists, `labelChanges` and `applyLabels` apply the analysis labels (`ai:suitable`,
   `ai:unsuitable`; not in dry-run), and `nextState` records the analysis. Costs are added with `state.addCost`.
6. **Stop after the analysis** (`outcome.stopped`; `publishStop`). The state loses `implementing`, the state comment
   shows the analysis (`renderAnalysis`), and a second comment carries the refusal reply (`refusalReply` for
   `refuse-needs-info` or `refuse-unsuitable`, mentioning the actor). The phase stays what the analysis set
   (`needs-info` or `analyzed`). If `outcome.failure` is set, `publish` throws after writing.
7. **`finish`**, for the rest:
   0. When the result is `unrelated` and nothing failed (`rerunUnrelated`, after the code step; there is no code): read
      the pull request of the state (`rerunnableChecks`: it must be open, else the attempt is an `error`), its relevant
      check runs (`relevantChecks` of `ci-gate.js`, loaded lazily because `ci-gate.js` requires this module), and its
      statuses, take the failed ones that belong to a workflow run, and call `gh.rerunFailedJobs` for each run
      (`rerunTargets`). In dry-run nothing is called. With no workflow run to rerun, the attempt is recorded as
      `blocked`, and the reason gets the sentence "I think this change does not cause the failure, but I found no
      failed check that I can rerun."
   1. When there is code (`hasCode`: no failure, result is `pr-opened` or `draft`): build the title, the body, and
      `toDraft = (result !== 'pr-opened')`. In dry-run, nothing more happens here.
   2. **Push** (`Push the branch`): `git fetch --no-tags <AGENT_OUT>/branch.bundle HEAD`; the fetched commit must
      equal `branchInfo.head`, else it throws `The bundle holds <a>, but the outcome names <b>`.
   3. **Re-measure the diff** (`pushedDiffProblem`): `git merge-base origin/develop <head>`, then
      `git diff --shortstat <base> <head>` and `git diff --name-only <base> <head>` and the same `diffBlockReason`
      as `work` (20 files or 600 lines for `bug-fix`, 30 files or 1000 lines for `task`, workflow files, agent files).
      A reason means no push, and the attempt becomes `blocked` with that `blockedReason` and `bundle: false`.
   4. `pushBranch` with `--force-with-lease=refs/heads/<branch>:<previousSha>` when the branch of an earlier attempt
      is continued; a new branch and a `ci-fix` push without it. Never a plain `--force`. `--no-verify` is always set.
   5. **Pull request** (`Pull request`): if the state's `pr` is open, `updateOpenPull` runs: it calls `updatePull` with
      the new title and body except for `ci-fix` and `review` (those keep the description), and `convertPullToDraft`
      when
      the attempt is not `pr-opened` and the pull request is not a draft. Otherwise, for `ci-fix` and for a change
      request it throws `Pull request #<n> is not open, so the CI fix|change has no place to go`. Otherwise it
      opens a new pull request: `createPull({ title, head, base: 'develop', body, draft: true })`. Every pull request
      opens as a draft.
   6. **State.** The attempt record is appended, `implementing` is removed, and the fields below are set.
   7. Write the state comment (`state.render(human, merged)`; `merged` re-reads the cost records right before the
      write), apply labels, post the mention comment, and reply in review threads.
8. A failure of the work step or of the publishing throws after the state comment is written, so the job turns red and
   the state records what exists.

**Commit message** (`commitMessage`): the commit that `work` made, in this shape:

```text
<type>(<scope>): <title>

Closes #<number>.

Agent-Run: <run URL>
```

`<type>` is `implementation.commitType`; `(<scope>)` is left out when `scope` is empty (characters other than letters,
digits, `.`, `_`, `/`, `-` become `-`); the title has whitespace collapsed and trailing periods removed. The pull
request title is the first line (`commitTitle`).

**Pull request body** (`prBody`), following `.github/pull_request_template.md`:

- `## Why`: the issue title, the first sentence of the implementer's summary, and `Closes #<number>.`
- `## What`: the summary.
- `## How to verify`: `implementation.verification`, or `No verification was described.`, and a line
  `Local checks passed, as reported by the work job: ...` or `Local checks failed, as reported by the work job: ...`
  with the
  failed commands.
- `## Checklist`: the three template items (issue linked is checked; documentation and breaking change are not).
- A line with the self-review result (`approved after <N> round(s).` or
  `changes were still requested after <N> round(s).`) and, when there are findings, one bullet per finding
  (`<severity> at <file>:<line>: <body>`).
- ``Implemented by the AI Autonomous agent on request of @<actor>.``
- The marker on its own last line: `<!-- ai-autonomous-agent issue=<number> -->`. The router trusts this marker.

**State fields written** (non-dry-run). The state is the loaded one, without `implementing`, plus:

| Field | Value |
|-------|-------|
| `phase` | `waiting-ci` when the result is `pr-opened` or a rerun of an `unrelated` CI fix, and there is no error; else `needs-human` |
| `ciGate` | Deleted for an `unrelated` rerun, so the gate decides the commit again; kept otherwise |
| `branch` | The pushed branch, only when the push succeeded (`progress.pushed`) |
| `pr` | The pull request number, when one exists |
| `playbook` | `outcome.playbook`, when set |
| `forced` | `outcome.forced` or the earlier `forced` |
| `attempts` | The old list plus the new record |
| `costs` | Old cost records plus the costs of this run |

Other phases come from other scripts. This script also leaves `analyzed` or `needs-info` (analysis stops), and
`stopped` (kept as is) in the state.

**Attempt record** (`attemptRecord`, one entry of `attempts[]`):

| Field | Content |
|-------|---------|
| `n` | Attempt number |
| `kind` | `initial`, `ci-fix`, `human`, or `review` (`attemptKindOf`) |
| `actor` | The person who asked (when known) |
| `run` | `AGENT_RUN_URL` |
| `result` | `pr-opened`, `draft`, `blocked`, `unrelated`, `error`, or `stopped` |
| `rounds` | Rounds run |
| `checks` | `green`, `red`, or `null` |
| `selfReview` | `approve`, `changes`, or `null` (the effective verdict) |
| `reason` | The `blockedReason`; only when `result` is `blocked` or `unrelated` |
| `notes` | `The attempt failed: <message>` for `error`; otherwise the implementer's `notes`, else the block reason |
| `at` | ISO time of the attempt (from `outcome.at`) |

**Labels** (`GITHUB_TOKEN`; the issue):

- `pr-opened` and `unrelated` (with a rerun): remove `agent:needs-human` from the issue (`removeLabel` treats a 404 as
  already done).
- Any other result (`draft`, `blocked`, `error`): add `agent:needs-human`.
- The labels `ai:suitable` and `ai:unsuitable` are touched only by the analysis step (step 5).

**Comments** (non-dry-run):

1. The state comment: the human text plus the machine-readable state. The human text is built by `renderOutcome`
   (the same text goes to `summary.md`):
   - `error`: `### AI implementation failed`.
   - `blocked`: `### AI implementation is blocked`, with "What I tried" and "What I need from you". For a CI fix:
     `### AI implementation needs a person: CI is red`, with the failed checks (at most 5, then "and N more"), the
     first error line, and the reason, all read from the CI report in the state (`ciHandOffLines`, which uses
     `reportFacts` and `failureLines` of `ci-gate.js`), then "What I tried" and the two ways on (`waysOnLines`).
   - `unrelated`: `### AI implementation: CI failed, but not because of this change`, with the failed checks, why the
     agent thinks the change does not cause them, and "I reran the failed checks (attempt N of M)", where the
     attempt number counts the attempts of the budget (`countedAttempts`).
   - `pr-opened`: `### AI implementation: pull request #<n> is open` (a CI fix:
     `### AI implementation: CI fix pushed to pull request #<n>`), with the branch, the rounds, and "It stays a draft
     until CI is green on GitHub."
   - `draft`: `### AI implementation needs a person: draft pull request #<n>` (a CI fix:
     `... needs a person: CI fix for pull request #<n>`), with "What I tried", "What is open" (failing checks and open
     findings), and "What I need
     from you".
   Each ends with ``<sub>[Run](<run URL>) · AI cost of this issue so far: $<usd> · <hint>``.
2. The mention comment (`actorComment`, a new comment so that the person is notified; none for `pr-opened`):
   - `draft`: ``@<actor>, I opened draft pull request #<n>, but it is not green yet. The AI implementation comment on
     this issue says what is open.`` (a CI fix: `I pushed a fix to pull request #<n>, but it is not green yet. ...`).
   - `blocked`:
     `@<actor>, I could not implement this issue: <reason> The AI implementation comment on this issue has the details.`
     (a CI fix: `@<actor>, I could not fix CI on #<n>.` and the same bullets and ways on as the state comment).
   - `unrelated`: none to the actor (`actorComment` has a text for the result, but `finish` posts none). Instead, one
     comment on the pull request, without a mention: "CI failed in X, which this change does not cause: Y.
     I reran the failed checks; the CI gate decides again."
   - `error`: `@<actor>, the implementation failed: <message>`.
3. Review-thread replies, only for kind `review`, a successful push, no error, and recorded threads: for each thread
   of `implementing.threads` with a `commentId`, `replyToReviewComment(pr, commentId, text)` where `text` is
   `The AI Autonomous agent pushed <first 7 characters of head> for this review. A person resolves the thread.` The
   agent
   never resolves a thread. A failed reply is logged and the others still go out; the first error is thrown at the
   end.

**Reactions** (on `AGENT_COMMENT_ID`, in a `finally` block): `rocket` when the result is `pr-opened` or an `unrelated`
with a rerun, otherwise `confused`. A failed reaction is a warning only.

**Dry-run** (`AGENT_DRY_RUN` is not `false`): nothing is pushed or written. The job summary shows the state comment
text, the commit message, the pull request title and body (labelled as a draft), the labels, the mention comment, the
state as JSON, the diff stat, and the first 300 lines of the diff.

**Attempt `result` values (exact strings):** `pr-opened`, `draft`, `blocked`, `unrelated`, `error` (the work or the
publishing failed), `stopped` (written by `publishStopped`). In `outcome.json` only `pr-opened`, `draft`, `blocked`,
`unrelated`, or `null` occur.
**Phases written by this script:** `implementing` (`preflight`), `waiting-ci` and `needs-human` (`publish`; the
`waiting-ci` of an `unrelated` CI fix also deletes `ciGate`). It also
keeps `stopped`, and passes on `analyzed` and `needs-info` from `analyze.js` functions.

- **Decisions:** summarized in the flow above (trust check, stopped run, analysis stop, blocked by re-measure, error).
- **Tests:** `implement.main.test.js` covers the green path, the PAT never reaching a comment, state, summary, log, or
  non-push call, a failed push (redacted, recorded, run fails after the state is written), missing `outcome.json`,
  a bundle with a wrong head, pushing only to the derived branch, an open draft updated or turned back into a draft,
  a stopped attempt, the review-thread replies (including more than 30 threads), and the `unrelated` verdict (no
  commit, bundle, or push; the rerun, the state, the labels, and the comment on the pull request; nothing to rerun;
  not on an initial attempt; dry-run). `implement.test.js` covers `checkImplementation` and
  `outcomeProblems` (also with `unrelated`), `prBody`, `renderOutcome`, `actorComment`, `attemptRecord`, `recoverCosts`,
  `pushBranch`
  (token in the URL only, lease, redaction, pushes the given commit).

### `tools/agent/ci-gate.js`

Flow C, after the pull request is open. The `ci-gate` job runs `node tools/agent/ci-gate.js` with no model. It starts
when the router sees a finished `workflow_run` of a branch that belongs to an open pull request of the agent whose
issue is in the phase `waiting-ci` at that commit. The job checks out `tools/agent` only, runs in the group
`ai-autonomous-<issue>`, and has the permissions `contents: read`, `issues: write`, `pull-requests: write`,
`actions: write` (reruns), `checks: read`, `statuses: read`. The step output `next` feeds the `implement` job
(`needs.ci-gate.outputs.next == 'implement'`, kind `ci-fix`).

`main(argv)` takes an optional mode. No argument runs the gate (`gate`). `rerun` runs the command `/agent rerun` in the
`rerun` job (`rerunCommand`, see [Rerun mode](#rerun-mode-agent-rerun)). Any other argument throws
`Usage: node tools/agent/ci-gate.js [rerun]`.

- **Inputs:**
  - `GITHUB_REPOSITORY`, `GITHUB_TOKEN` (job token), `AGENT_PAT` (only to take a draft pull request out of draft).
  - `AGENT_NUMBER` (the issue), `AGENT_PR` and `AGENT_HEAD_SHA` (router outputs `pr` and `head_sha`),
    `AGENT_WORKFLOW_RUN_ID` (`github.event.workflow_run.id`), `AGENT_RUN_URL`, `AGENT_OUT`, `GITHUB_OUTPUT`,
    `GITHUB_STEP_SUMMARY`, and the `AGENT_*` variables of `lib/config.js` (`dryRun`, `limits.maxAttempts`).
- **Outputs:**
  - Step outputs through `writeOutputs`: `outcome` (always) and `next` (`implement`, else empty).
  - `ci-report.md` in `AGENT_OUT` for a red result; `summary.md` for a green one. The job uploads `AGENT_OUT` as the
    artifact `ai-autonomous-ci-gate-<number>-<run_attempt>`.
  - The job summary gets one line per decision, and the full dry-run report in dry-run.
- **Model calls:** none. Check logs hold output of code the model wrote, so the report is untrusted; it reaches a model
  only inside `untrusted()` (the `implement` job does that).
- **GitHub reads** (`GITHUB_TOKEN`):
  - `gh.getIssue` and `gh.listIssueComments` (`loadIssue` of `implement.js`), the state comment.
  - `gh.getPull` (`GET /repos/{repo}/pulls/{n}`), at the start and again before the first write.
  - `gh.listCheckRuns` (`GET /repos/{repo}/commits/{sha}/check-runs?filter=latest`, paginated).
  - `gh.getCombinedStatus` (`GET /repos/{repo}/commits/{sha}/status`, paginated; only the single `statuses` count).
  - `gh.getJobLog` (`GET /repos/{repo}/actions/jobs/{id}/logs`, follows the redirect) for failed Actions jobs.
  - `gh.listIssueComments` once more in `phaseMovedOn` and in `state.withFreshCosts`.
- **GitHub writes:**
  - `GITHUB_TOKEN`: `gh.updateIssueComment` or `gh.createIssueComment` for the state; `gh.addLabels` and
    `gh.removeLabel`; `gh.createIssueComment` for the message to the person; `gh.rerunFailedJobs`
    (`POST /repos/{repo}/actions/runs/{id}/rerun-failed-jobs`).
  - `AGENT_PAT`: `markPullReady` (GraphQL mutation `markPullRequestReadyForReview`), through a second client. Reason:
    a ready-for-review event made by the job token does not start the repository workflows.
- **Decision sequence:**
  1. Load the issue and its state. The pull request number is `AGENT_PR`, else `state.pr`; none gives `skipped`.
  2. `gateGuard` (outcome `skipped` with a reason): the phase must be `waiting-ci`; `state.pr` must equal the pull
     request (and `AGENT_PR`); the pull request must be open; `AGENT_HEAD_SHA` must equal the current head.
     No recorded actor (`state.actorOf`: the running attempt's actor, else the actor of the last attempt) throws.
  3. Collect checks. Check runs of the agent's own jobs are dropped (`isOwnCheck`): a workflow name that starts with
     `AI Autonomous`, or a job name in `route`, `review`, `analyze`, `implement`, `ci-gate`, `levels`. Statuses (the CLA
     check reports there) are kept.
  4. Wait (`pendingChecks`), outcome `waiting` with the pending names as the reason; nothing is written. Pending are:
     check runs that are not `completed`; the required check `ci-ok` (`REQUIRED_CHECKS`) when it does not exist yet;
     statuses in `pending`. A completed run with the conclusion `cancelled` is not pending: it is finished, nobody
     reruns it by itself, and waiting for it would never end (it was seen on #943). It is a failed check.
     A commit with no check run and no status also waits ("no check reported yet"). The workflow run that finishes last
     decides.
  5. Once per commit: `state.ciGate.sha === headSha` with `decided: true` gives `already-decided`. This check comes
     after the wait check.
  6. All green (`allGreen`: at least one check, none pending, none failed) goes to `handleGreen`; otherwise
     `handleRed`. Green conclusions are `success`, `neutral`, `skipped`; a status fails as `failure` or `error`; every
     other conclusion fails a check run, `cancelled` included (`failedChecks` keeps the conclusion, so the texts say
     "`run-lint` (cancelled)", see `checkNames`).
  7. Re-read before write (`staleResult`), before the first write of both branches. For red, this comes after the logs
     are read. `supersededBy` reads the pull request again: another head sha gives `superseded`. `phaseMovedOn`
     reads the state comment again: a phase other than `waiting-ci` (a `/agent stop` came in) gives `state-changed`.
     Neither writes anything.
- **Green** (`handleGreen`):
  - If the pull request is a draft and not dry-run: `markPullReady(pull.node_id)` with `AGENT_PAT`. A failure is kept
    as `readyError` (also when `AGENT_PAT` is missing); the rest is still written, and the job fails at the end.
  - State: `greenState` sets `phase: 'completed'`, the last attempt `result: 'ci-green'`, removes `lastCiReport`, and
    sets `ciGate: { sha, decided: true, at, run }`. `withLastAttempt`, which `greenState`, `stoppedState`, and
    `nextAttemptState` use, keeps `unrelated: true` on a last attempt whose result was `unrelated` when the CI verdict
    replaces it. Header `### AI implementation: CI is green on pull request #<n>`.
  - Labels: pull request gets `agent:completed` and `ai:l1-executor`; issue gets `agent:completed`; both lose
    `agent:needs-human`.
  - Comment on the issue: `@<actor>, CI is green on #<pr>. A person reviews and merges it.`
  - Order of writes: state, labels, comment. Outcome `green`.
- **Red** (`handleRed`):
  1. `failedChecks` lists the failures, sorted by name, with `jobId` (from the link, else the check run id for the
     `github-actions` app) and `runId`.
  2. `collectLogs` reads the logs of the first 10 failed jobs with a job id (`MAX_LOG_JOBS`); a missing log gets a note
     in the report; jobs beyond 10 get "too many failed jobs". Statuses and other apps have no log.
  3. `extractErrors` keeps, per job, the lines that match `##[error]`, `FAIL`, `Error:`, `error:`, `failed`, a
     cross mark, or `AssertionError` (not "0 failed", "0 errors", "failed: 0"), with 2 lines before and 3 after; the
     block after an Nx "Failed tasks" line gets 15 lines after. ANSI codes, timestamps, and blank lines go, and so
     does the echo of a step script: a raw line whose text after the timestamp starts with the ANSI sequence
     `\u001b[36;1m` (`isScriptEcho`) is dropped before anything is matched, so `echo "::error::..."` in a workflow
     step is not taken for a failure. Lines are
     cut at 300 characters, a job at 120 lines (the first ones), and all jobs together at 400 lines (`capTotalLines`).
  4. CI report (`buildReport`, `ci-report.md`, also stored as `lastCiReport`): commit (12 characters), signature, the
     failed checks (up to 20, then "and N more"), and the error lines per job in a code fence. At most 12,000
     characters (`MAX_REPORT_CHARS`); a longer text is cut with `[cut: the report is too long]`.
  5. Failure signature (`failureSignature`): the failed check names sorted; for each name, the first 5 error lines (the
     first 5 non-blank lines when the log has none), each normalized by `normalizeLine`. Normalization replaces
     temporary paths with `<tmp>`, durations with `<dur>`, `file:line:col` with `:<pos>`, `(line,col)` with `(<pos>)`,
     hex strings of 7 or more characters with `<hex>`, and every other number with `<n>`; it also collapses
     whitespace. The text is joined as `names` + `\n--\n` + `name\nlines` per check, hashed with SHA-1, and the first
     12 hex characters are the signature. The failed checks with the conclusion `cancelled` are left out when any other
     check failed, so a changing set of cancelled checks does not change the signature of the same real failure; when
     only cancelled checks failed, they make it.
  6. `staleResult` (see step 7 above).
  7. Free rerun: when every failed item, the verdict check `ci-ok` (`REQUIRED_CHECKS`) aside, is a check run whose name
     matches `/e2e/i`, and at least one failed item remains (`isE2eOnly`), or is a check run with the conclusion
     `cancelled` (`isCancelledOnly`: nothing really failed, the checks were stopped by a timeout, a person, or a newer
     run; a cancelled `ci-ok` alone counts, because the workflow was stopped after its other jobs passed; a mix of
     cancelled and really failed checks is a normal red result; a result that is both is treated as cancelled), the
     head commit has no rerun left unused
     (`e2eRerunLeft`: `state.e2eRerun.sha !== headSha` or `count < MAX_E2E_RERUNS`, which is 1), and there is a run to
     rerun (`rerunTargets`: the distinct `runId`s of the failed jobs, else `AGENT_WORKFLOW_RUN_ID`; a cancelled-only
     result has no such fallback, so a cancelled check of another app never reruns an unrelated workflow): call
     `gh.rerunFailedJobs` per run (that includes the run of `ci-ok`, which depends on the E2E job), set `e2eRerun` to
     `{ sha, count }` in the state (`rerunState`; a new commit starts at 1, and an old `e2eReruns` field is deleted),
     and write the state comment (`### AI implementation: waiting for CI on pull request #<n>`; it says "Only E2E jobs
     failed" or "The failed checks were cancelled, so nothing really failed", see `renderRerun`). The one free rerun per
     commit covers both cases and keeps the field name `e2eRerun`. The phase stays `waiting-ci`, `ciGate` is not set,
     and the outcome is `rerun`. The next result is decided like any red result. The state is written only when GitHub
     accepted at least one rerun; when it rejects every one, no workflow run will wake the gate, so the decision is
     `stop` with the reason `rerun-rejected` (step 8).
  8. Stop rule. A rejected free rerun gives `stop` with the reason `rerun-rejected`. When `isCancelledOnly(failed)`
     holds here (the free rerun is used up, or no run can be rerun), the decision is `stop` with the reason `cancelled`:
     nothing failed, so no attempt starts, and the hand-off says that the checks were cancelled again
     (`reasonSentence`). Otherwise `stopDecision`, in this order: the signature equals the latest signature recorded on
     an attempt (`lastSignature`) gives `stop` with reason `same-failure`, whatever the budget; counted attempts at or
     above `AGENT_MAX_ATTEMPTS` gives `stop` with reason `budget`; otherwise `next-attempt` (reason `new-failure`).
     Counted attempts (`countedAttempts`) are the attempts of kind `initial` or `ci-fix` from index `state.budgetFrom`
     on, so a person's `retry`, answer, or change request gives a fresh budget.
  9. Stop: `stoppedState` sets `phase: 'needs-human'`, the last attempt `result: 'ci-red'` and `signature`,
     `lastCiReport`, and `ciGate`. The state comment (`### AI implementation needs a person`) starts with the failed
     checks (`checkNames`: at most 5, then "and N more"), the first error line of the first failed check
     (`failureLines`), and the reason, then the two ways on (`waysOnLines`: `/agent rerun` for a failure the change does
     not cause, `/agent retry` with guidance for another fix), then the attempts table (`#`, `Kind`, `Result`,
     `Signature`, `Notes`), the current failure, and the report in a `<details>` block (cut to 3,000 characters). Then
     `agent:needs-human` is added to the issue and to the pull request, and a comment mentions the actor with the same
     three facts and the two ways on. Outcome `stopped`, with `reason`.
  10. Next attempt: `nextAttemptState` sets `phase: 'implementing'`, `implementing: { run, actor, at, kind: 'ci-fix' }`,
      the last attempt `result: 'ci-red'` and `signature`, `lastCiReport`, and `ciGate`. It writes the state
      comment (`Attempt <n> of <max> fixes it`) and returns outcome `next-attempt` with `next=implement`.
- **Rerun mode** is described [below](#rerun-mode-agent-rerun).
- **Exit outcomes** (the `outcome` step output and the return value): `skipped`, `waiting`, `already-decided`,
  `superseded`, `state-changed`, `green`, `rerun`, `stopped`, `next-attempt`. The JSDoc `@returns` of `gate` lists only
  the first set without `state-changed`. Only `next-attempt` sets `next=implement`. Every other outcome gives
  `next=` (empty).
- **Dry-run:** no GitHub write, no rerun, no `next`. The summary shows the decision, the state, the labels, and the
  comment that would be posted. The re-read checks (`superseded`, `state-changed`) still run, because they only read.
  Dry-run returns `next-attempt` without `next`.
- **Tests:**
  - `tools/agent/ci-gate.test.js`: own-check filter, pending and failed checks (a cancelled check is failed, not
    pending), `allGreen`, `isE2eOnly` and `isCancelledOnly` (with `ci-ok`), `e2eRerunLeft` and `rerunState` (per
    commit), error extraction (with the script echo), line caps, `normalizeLine`, `failureSignature`, `buildReport`
    (12,000 cap, fences), stop rule and `budgetFrom`, the state builders, `gateGuard`, `rerunTargets`, `checkNames`,
    `failureLines`, `reportFacts`, `rerunRefusal`, `rerunRequestState`, the renderers and comments.
  - `tools/agent/ci-gate.main.test.js`: `gate()` with injected clients: waiting, own jobs, skips, already decided, green
    (with and without PAT), red (next attempt, same failure, budget, statuses, missing logs, caps), the E2E rerun (per
    commit, with `ci-ok`), the rerun of cancelled-only results (shared with the E2E budget, mixed results), dry-run,
    token leaks, `superseded`, `state-changed`, cost records written during the run; and `rerunCommand()`: every
    refusal, the rerun, statuses only, pending, green, a stop between the two reads, a failed rerun call, dry-run, and
    the reactions.
  - `tools/agent/route.ci.test.js`: the routing of `workflow_run` events to `ci-gate`.

#### Rerun mode (`/agent rerun`)

`node tools/agent/ci-gate.js rerun` is the `rerun` job. The router (`route.js`) sends it a `/agent rerun` comment on an
issue (`number` is the issue) or on a pull request of the agent (`number` is the issue, `pr` the pull request). It
checks out `tools/agent` of the default branch and holds no model. It shares the group `ai-autonomous-<issue>`, and it
is no attempt: it neither spends nor resets the attempt budget.

- **Inputs:** `GITHUB_REPOSITORY`, `GITHUB_TOKEN`, `AGENT_PAT` (only to take a green draft pull request out of draft),
  `AGENT_NUMBER`, `AGENT_PR` (empty for a comment on the issue), `AGENT_COMMAND`, `AGENT_ACTOR` (the commenter),
  `AGENT_COMMENT_ID`, `AGENT_RUN_URL`, `AGENT_OUT`, and the `AGENT_*` variables of `lib/config.js`. `AGENT_NUMBER`,
  `AGENT_ACTOR`, `AGENT_RUN_URL`, and `AGENT_OUT` are required.
- **Outputs:** `reply.md` in `AGENT_OUT`, and, on the green path, `summary.md`. The artifact is
  `ai-autonomous-rerun-<number>-<run_attempt>`. No step outputs. The return value is `{ ok, outcome }` with the outcome
  `refused`, `rerun`, `pending`, `green`, `superseded`, or `state-changed`.
- **Sequence** (`rerunCommand`, then `rerunRequest`):
  1. Reaction `eyes` on `AGENT_COMMENT_ID`.
  2. Load the issue and its state. `rerunRefusal` refuses with a reply and `confused` when the state has no `pr` or
     `branch` (or `pr` differs from `AGENT_PR`): `there is no pull request of the agent to rerun CI for`; when the
     phase is `implementing` and the attempt is younger than 120 minutes (`BUSY_MS`; the reply is the `refuse-busy`
     text with the link to the run); when the phase is `stopped`. A closed pull request is refused after it is loaded.
  3. Read the head commit of the pull request, its check runs without the agent's own (`relevantChecks`), and its
     statuses. Failed checks without a workflow run (statuses, other apps) cannot be rerun: when no failed check has
     one, the reply names them, the state stays as it is, and the outcome is `refused`.
  4. Read the state comment again and refuse if it now fails `rerunRefusal` (a stop came in).
  5. With failed checks: rerun them first (`gh.rerunFailedJobs` per run), before any write. When GitHub rejects every
     rerun, nothing is written, `agent:needs-human` stays, and the reply says why (outcome `refused`): no workflow run
     would wake the gate otherwise. When it rejects some of them, the reply names how many.
  6. Write the state (`rerunRequestState`): `phase: 'waiting-ci'`, `ciGate` and `implementing` deleted, and an entry
     `{ at, actor, sha, runs, run }` appended to `reruns` (`runs` are the workflow runs that were rerun). The state
     comment is `### AI implementation: waiting for CI on pull request #<n>`. `agent:needs-human` is removed from the
     issue and the pull request.
  7. The reply by the checks: failed checks rerun (which checks, and that no new attempt and no model call follow);
     checks still pending (CI still runs; the gate decides); nothing failed and only the verdict check `ci-ok` is
     missing (`stillRunning` is empty: the reply says that no CI verdict is reported, not that CI still runs; both are
     outcome `pending`); all green (`handleGreen` of the gate: the pull request
     leaves draft, `agent:completed` and `ai:l1-executor`, phase `completed`, and its comment, which is the only reply).
  8. The reply goes where the comment was written (the pull request when `AGENT_PR` is set, else the issue), the green
     comment too (`commentNumber`). Reaction `rocket` at the end, `confused` on a refusal or an error; an error also
     fails the job.
- **Dry-run:** no write, no rerun, no reaction. The job summary shows the state, the labels, the workflow runs that
  would be rerun, and the reply. The green path skips its re-read of the phase (`skipStale`), because the state was not
  written.

### `tools/agent/chat.js`

Flow D, the conversation. One script, two jobs. The `chat` job handles `help`, `cost`, and free-text questions. The
`stop` job handles `/agent stop` and runs the same script without a model. The router sends `stop` to its own job
because `stop` has no concurrency group, so it never queues behind a running attempt or a 15-minute answer. The `chat`
job uses the group `ai-autonomous-chat-<number>`.

- **Inputs:**
  - `GITHUB_REPOSITORY`, `GITHUB_TOKEN` (the job token, no `AGENT_PAT`), `OPENAI_API_KEY` (questions only).
  - `AGENT_NUMBER`, `AGENT_COMMAND` (JSON from the router, for example
    `{ "name": "chat", "force": false, "notes": "..." }`), `AGENT_ACTOR` (who asked), `AGENT_COMMENT_ID` (gets the
    reactions), `AGENT_RUN_URL`,
    `AGENT_OUT`, and `AGENT_PR_HEAD_REF` (chat job only; `refs/remotes/pull/<n>/head`, fetched by the workflow).
  - Required: `AGENT_NUMBER`, `AGENT_ACTOR`, `AGENT_RUN_URL`, `AGENT_OUT`. An unknown command name throws
    `The chat job does not handle the command '<name>'`.
- **Outputs:** `reply.md` and `chat-input.md` in `AGENT_OUT` (artifacts `ai-autonomous-chat-...` and
  `ai-autonomous-stop-...`). In dry-run the reply goes to the job summary as `## Dry run: reply to #<n>`. No step
  outputs.
- **Model calls:** only for a question. Role and agent `assistant`, flow `chat`, model `config.models.light`, schema
  `chatAnswer` (`answer`, 1 to 6,000 characters). The assistant is read-only.
- **GitHub reads** (`GITHUB_TOKEN`): `gh.getIssue` (`GET /repos/{repo}/issues/{n}`, also for a pull request),
  `gh.listIssueComments` for the target and, where needed, for the linked issue or pull request, `gh.getPull`
  (`GET /repos/{repo}/pulls/{n}`, question on a pull request only, for the base ref).
- **GitHub writes** (`GITHUB_TOKEN`): reactions through `lib/reactions.js` (`gh.addReaction`,
  `POST /repos/{repo}/issues/comments/{id}/reactions`): `eyes` at the start, then `rocket` when the command returned
  `ok`, else `confused` (also on an error). A failed reaction only logs a warning. The reply is
  `gh.createIssueComment`. `stop` also uses `gh.updateIssueComment`, `gh.cancelRun`
  (`POST /repos/{repo}/actions/runs/{id}/cancel`, 409 returns `false`), and `gh.removeLabel`. A question uses
  `gh.updateIssueComment` or `gh.createIssueComment` to record its cost.
- **Target loading** (`loadTarget`): the issue or pull request plus its state comment. For a pull request,
  `agentIssueOf(body)` reads the marker in the description, and the issue counts only when its own state has
  `pr` equal to this pull request number. Otherwise the pull request is "of a person". The marker is editable text, so
  the state of the issue is the proof.
- **Commands:**
  - `help` (`helpReply`): a table of the commands that work in the place: `issue`, `pull` (a pull request of a person),
    or `agentPull`. Every table has `/agent cost`, `/agent help`, and `/agent <question>` (or `/agent <text>` as a
    change request on a pull request of the agent). Issues also list `analyze`, `implement`, `retry`, `rerun`, `stop`.
    Pull requests list `review` and `ci_check`; an agent pull request adds `retry`, `rerun`, and `stop`.
  - `cost` (`doCost`, `costTable`, `costReply`): see the table format below.
  - `stop` (`doStop`): see the stop sequence below.
  - `chat` (a question, `doQuestion`): see the assistant context below.
- **Cost table:**
  - Sources: the `costs` of the state of the target, plus the linked one: for an issue with `state.pr`, the state of
    that pull request; for a pull request of the agent, the state of its issue. The scope text names them, for example
    `issue #200 and pull request #70`.
  - Columns: `When` (the first 10 characters of `at`), `Flow`, `Role`, `Model` (`model` plus `:variant`), `Uncached`
    (`input`), `Cached`, `Output` (token counts with thousands separators), `USD`.
  - Records are sorted by `at`. The table shows the last 50 (`MAX_TABLE_ROWS`). When older ones exist, a line says
    "N older record(s) are left out of the table. The totals include them."
  - After the table: one line per flow (`- <flow>: <n> call(s), $<usd>`, sorted by flow name), then
    `**Total: $<usd>** in <n> call(s).` The totals cover all records, not only the shown ones.
  - A closing note says the numbers are estimates and the OpenAI bill is the authority.
  - No records gives `@<asker>, no AI call is recorded for <scope> yet.`
  - Cell text goes through `inline()` and escapes `|`.
- **Stop sequence** (`doStop`), in this order:
  1. On a pull request of a person: refuse (`ok: false`). On a pull request of the agent: use its issue.
  2. Read the issue state again. No state comment or no phase: reply "there is nothing to stop". Phase `stopped`:
     reply "already stopped" (`ok: false`).
  3. Compute `runId` from `implementing.run` (a run link) only when the phase is `implementing`, and only when the link
     names this repository (`runIdOf`).
  4. Write the state first (`gh.updateIssueComment`): `stoppedState` sets `phase: 'stopped'`, `stoppedBy`, `stoppedAt`
     and keeps `implementing`, so `implement.js publish` of the cancelled run can see that a person stopped it. The
     human text is `### AI implementation was stopped`.
  5. Cancel the run (`gh.cancelRun(runId)`). A failed cancel is kept as `cancelError`.
  6. Remove `agent:needs-human` from the issue and from `state.pr` (`gh.removeLabel`).
  7. Reply with what was stopped (`stoppedWhat`, per phase: `implementing`, `waiting-ci`, `needs-human`, other) and
     how to start again (`/agent implement` or `/agent retry` with guidance). When the cancel failed, the reply says
     so, and the job rethrows the error after the reply.
  8. In dry-run, steps 4 to 6 are skipped and only the reply goes to the job summary.
- **Assistant context** (`renderChatInput`, written to `chat-input.md`): facts (asker, state of the issue or pull
  request); for a pull request the base ref `origin/<base>` and the head ref, with the note that the head is fetched
  and never checked out (read it with `git show` and `git diff base...head`); then, each in an `untrusted()` block,
  the question (cut at 20,000 characters), the title and description (cut at 20,000), the last 20 comments without the
  state comment (each cut at 5,000, with a note when some are left out), and `stateSummary` (phase, analysis verdict,
  pull request, attempts, review count). The working tree is the default branch.
- **Defusing:** the answer goes through `defuseMentions` (every `@name` gets a zero-width space), and every model or
  user text in tables and sentences goes through `inline()`. The reply starts with `@<asker>`.
- **Cost of an answer:** `recordCosts` reads the state comment again, adds the cost records, and writes with
  `state.replaceState` (the human part stays). With no state comment it creates one. This happens also when the answer
  failed. The reply ends with a `<sub>` line: run link, the cost of this answer, the total on the issue or pull
  request, and a hint for `/agent cost`. A failed answer replies `I could not answer: ...` and then fails the job.
- **Decisions:**
  - `help`, `cost` -> reply only; no state write.
  - `stop` on a pull request not of the agent -> refuse; nothing to stop or already stopped -> refuse (`ok: false`,
    reaction `confused`).
  - Question on an issue -> assistant reads the default branch. Question on a pull request -> also the head ref.
  - Dry-run: no reaction, no comment, no state write; the model still runs for a question.
- **Tests:**
  - `tools/agent/chat.test.js`: `helpReply`, `costTable` (columns, 50-row cap, totals), `costReply`, `runIdOf`,
    `stoppedState`, `stoppedWhat`, `renderStopped`, `stopReply`, `stateSummary`, `renderChatInput`, `answerReply`,
    `failedAnswerReply`.
  - `tools/agent/chat.main.test.js`: `chat()` with injected clients: help per place, cost sources, the stop sequence
    (running attempt, 409, failed cancel, nothing to stop, dry-run), questions on an issue and a pull request,
    contract failure, reactions, environment checks.
  - `tools/agent/route.chat.test.js`: the routing of `help`, `cost`, `stop`, and free text to the `chat` and `stop`
    actions.

### `tools/agent/ci-check.js`

Flow D, the command `/agent ci_check`: the root cause of a red CI on a pull request. The `Check CI` step of the
`ci-check` job runs it. The router sends it every `ci_check` comment on a pull request, of the agent or not, also one
from a fork or one of Dependabot. The job writes the state comment of the pull request (the cost) and, when it hands a
flaky failure back to the CI gate, the state comment of the issue. So it uses the group of the issue (`AGENT_ISSUE`, the
`issue` output of the router) for a pull request of the agent, else the group of the pull request, which is the group of
`review`. It still merges the cost records on write.

- **Inputs:**
  - `GITHUB_REPOSITORY`, `GITHUB_TOKEN` (the job token, no `AGENT_PAT`), `OPENAI_API_KEY` (red CI only).
  - `AGENT_NUMBER` (the pull request), `AGENT_ISSUE` (the issue of an agent pull request, from the router; empty
    otherwise), `AGENT_COMMAND`, `AGENT_ACTOR`, `AGENT_COMMENT_ID`, `AGENT_PR_HEAD_REF` (default
    `refs/remotes/pull/<n>/head`), `AGENT_RUN_URL`, `AGENT_OUT`, and the `AGENT_*` variables of `lib/config.js`.
  - Required: `AGENT_NUMBER`, `AGENT_ACTOR`, `AGENT_RUN_URL`, `AGENT_OUT`. - **Exports:** `main`, `ciCheck` (the same,
    with injectable `deps.gh`, `deps.runAgent`, and `deps.mergeBase`), `checkTriage`, `effectiveVerdict`,
    `renderCheckInput`, `renderTriage`, `failedCheckReply`, `hintFor`. It reuses `relevantChecks`, `failedChecks`,
    `pendingChecks`, `stillRunning`, `allGreen`, `collectLogs`, `buildReport`, `failureSignature`, `rerunTargets`, and
    `rerunRequestState` from `ci-gate.js`.
- **Model calls:** one, only for a red CI. Role and agent `ci-triager`, flow `ci-check`, model `config.models.triage`,
  schema `ciTriage`, semantic check `checkTriage`. The files are `ci-triager.jsonl` and `ci-triager.final.md`.
- **Sequence** (`ciCheck`, then `checkCi`):
  1. React with `eyes`. Load the pull request (`gh.getPull`) and the checks of its head commit
     (`gh.listCheckRuns`, `gh.getCombinedStatus`), without the agent's own jobs (`relevantChecks`).
  2. No check run and no status: reply that no check is reported. Any check running or pending (`stillRunning`; a
     missing `ci-ok` is not one, and a cancelled check is finished, so it is not one either): reply with the checks that
     run (at most five, then "and N more"). Nothing failed and only a missing `ci-ok` is pending: outcome `no-verdict`,
     the reply says that no CI verdict is reported for the head commit, for example because CI waits for an approval of
     the workflows of a fork. All green: reply that CI is green. None of these calls a model. The reply asks to comment
     `/agent ci_check` again when CI ends. With failed checks and a missing `ci-ok`, the command goes on to step 3.
  3. Red: collect the logs (`collectLogs`), the signature, and the report (`buildReport`, at most 12,000
     characters), and write `ci-report.md`. Compute the merge base with `git merge-base origin/<base> <head ref>`
     (`null` with a warning when Git cannot) and write `ci-check-input.md` (`renderCheckInput`): the refs, the
     signature, the count of cancelled checks, then the title with the failed checks (a cancelled one is marked
     "[cancelled: it was stopped, it did not fail by itself]"), the CI report, and the notes of the person, each inside
     an `<untrusted>` block. The failed checks include the cancelled ones, so `/agent ci_check` triages a result such as
     two cancelled `run-lint`, a failed `js`, and a failed `ci-ok`, and the rerun of step 6 covers the runs of the
     cancelled checks too.
  4. Run the `ci-triager`. When the call or its contract fails, record the cost, reply "I could not finish the CI
     check:" followed by the error message, add the cost line, and throw (the job fails, the reaction is `confused`). A
     `change` verdict without a fix breaks the contract.
  5. Find out whether the pull request is the agent's (`loadAgent`): `AGENT_ISSUE` is set, the marker in the
     description names that issue, and the state of the issue has `pr` equal to this pull request.
  6. `flaky` or `infra` (`effectiveVerdict`: low confidence counts as `unknown`): rerun the failed jobs of every
     workflow run (`gh.rerunFailedJobs` per run from `rerunTargets`). A rejected run is logged and counted. All
     rejected: the reply says GitHub did not rerun, nothing else changes, the reaction is `confused`, and the job
     does not fail. No failed check has a workflow run: nothing to rerun, and the reply says so.
  7. Write the state of the pull request: the cost records and the `ciChecks` entry (`recordOnPull`, read again,
     `state.replaceState`; a state comment is created when there is none).
  8. After an accepted rerun on the agent's pull request, when the state of the issue (read again right before the
     write) has the phase `needs-human` or `waiting-ci` and `pr` equal to this pull request: write
     `rerunRequestState` (phase `waiting-ci`, `ciGate` and `implementing` deleted, an entry in `reruns`) and remove
     `agent:needs-human` from the issue and the pull request, so the CI gate decides when the checks end. Any other
     phase is left alone.
  9. Reply (`renderTriage`) and react with `rocket`.
- **Reply:** the verdict sentence with the confidence, the root cause, the places to fix (when there are any), the
  evidence in a `text` fence (when there is any), what the agent did, a hint, and the cost line. All model text goes
  through `inline` or `defuseMentions`, and a backtick in a code span becomes an apostrophe. Hints: `change` on the
  agent's pull request suggests `/agent retry` with the guidance; `unknown` (also a low-confidence `flaky` or `infra`)
  suggests `/agent rerun` on the agent's pull request and a rerun from the Actions page elsewhere, because
  `/agent rerun` works only on the agent's pull requests.
- **GitHub writes** (`GITHUB_TOKEN`): the reply (`gh.createIssueComment`), the state comment of the pull request
  (`gh.updateIssueComment` or `gh.createIssueComment`), the rerun
  (`POST /repos/{repo}/actions/runs/{id}/rerun-failed-jobs`), the state comment of the issue and `gh.removeLabel` (the
  hand-back), and the reactions.
- **Dry-run:** the model still runs. Nothing is written, rerun, or reacted with. The job summary shows the reply
  (`## Dry run: reply to #<n>`), the workflow runs that would be rerun, and the hand-back that would happen.
- **Tests:**
  - `tools/agent/ci-check.test.js`: `checkTriage`, `effectiveVerdict`, `hintFor`, `renderTriage` (each verdict, empty
    lists, mention defusing, fences, the rerun and hand-back texts), and `renderCheckInput`.
  - `tools/agent/ci-check.main.test.js`: `ciCheck()` over fake clients: pending, no verdict, green, no checks (no
    model), change, flaky, and infra, the hand-back to the gate per phase, a phase that moved on, a rejected rerun, low
    confidence, a check that is no Actions job, contract failures with the cost kept, dry-run, secrets, and reactions.

### `tools/agent/levels.js`

Copies the execution level of a merged pull request to the issues it closes. It uses no model. The `levels` job of
`.github/workflows/ai-autonomous-levels.yml` runs it on `pull_request_target` (`closed`, `labeled`). The job runs only
when `AGENT_ENABLED` is `true`, the pull request is merged, and either the pull request was closed or the label starts
with `ai:l`. It checks out only `tools/agent` of the base branch and never runs code of the pull request.

- **Inputs:** `GITHUB_REPOSITORY`, `GITHUB_TOKEN`, `AGENT_NUMBER` (the pull request), `AGENT_RUN_URL` (set, not used by
  the script), `GITHUB_STEP_SUMMARY`, and the `AGENT_*` variables of `lib/config.js` (`AGENT_ENABLED`, `AGENT_DRY_RUN`,
  `AGENT_ALLOWED_ACTORS`).
- **Outputs:** none as step outputs. In dry-run it appends a report (`## Dry run: AI execution levels for #<n>` and one
  line per issue and per comment) to the job summary.
- **Model calls:** none.
- **GitHub reads (`GITHUB_TOKEN`):**
  - `getPull` (`GET /repos/{repo}/pulls/{n}`): `merged`, author, labels.
  - GraphQL `CLOSING_ISSUES_QUERY` through `graphql` (`POST /graphql`): `pullRequest.closingIssuesReferences(first: 20)`
    with number and labels of each issue.
  - GraphQL `CLOSING_PULLS_QUERY`, once per closed issue:
    `issue.closedByPullRequestsReferences(first: 20, includeClosedPrs: true)` with `number`, `merged`, and labels. Only
    merged pull requests count. The pull request of
    this run replaces its own entry (or is added), because the GitHub index can lag behind a merge or a label.
  - `listIssueComments` (`GET /repos/{repo}/issues/{n}/comments`) on the pull request, to find earlier comments of the
    workflow bot.
  - `listPullCommits` (`GET /repos/{repo}/pulls/{n}/commits`), only for a pull request of the agent that has no commits
    comment yet.
- **GitHub writes (`GITHUB_TOKEN`; `issues: write`, `pull-requests: write`):** `addLabels`
  (`POST /repos/{repo}/issues/{n}/labels`) and `removeLabel` (`DELETE /repos/{repo}/issues/{n}/labels/{name}`, 404 is
  ignored) on each closed issue, and `createIssueComment` (`POST /repos/{repo}/issues/{n}/comments`) on the pull
  request.
  Nothing is written in dry-run.
- **The level computation:**
  - The labels are `LEVELS`, from least to most autonomous: `ai:l0-assistant`, `ai:l1-executor`, `ai:l2-agent`,
    `ai:l3-autonomous`.
  - `levelOfLabels`: the lowest level label of one pull request, or `null`. A pull request with two level labels counts
    with the lower one.
  - `lowestLevel`: the lowest level among all merged pull requests that close an issue and have a level. Pull requests
    without a level are ignored. The issue was as autonomous as its least autonomous part.
  - `levelChanges`: the issue gets the lowest level and loses every other `LEVELS` label. With no level (`null`) the
    issue stays as it is. Labels that only look similar are left alone.
- **The reminder comment:** when the merged pull request itself has no level, it closes at least one issue, and no
  comment of `github-actions[bot]` with the marker `<!-- ai-autonomous-levels -->` exists, the script posts a
  reminder: "This pull request has no execution level label (ai:l0-assistant ... ai:l3-autonomous). Add one; the agent
  copies it to issue(s) #N." A later `labeled` event with a level label runs the job again and copies the level.
- **The people's commits count:** when the pull request body holds the agent marker and no comment with the
  marker `<!-- ai-autonomous-levels-commits -->` exists, the script lists the commits of the pull request and counts
  those whose message has no line matching `^Agent-Run:\s*\S` (case-insensitive, multiline). When the count is above
  zero it posts: "N of M commits on this pull request have no Agent-Run: trailer, so people wrote them.
  The level stays as it is, because it is a human judgment. If the people's commits were substantial, consider
  ai:l0-assistant." The script does not change the level.
- **Decisions:**
  - `AGENT_ENABLED` is not `true` -> stop.
  - The pull request is not merged -> stop.
  - The author is not in `AGENT_ALLOWED_ACTORS` -> stop.
  - No closing issue -> no label change and no reminder; the commits note still applies to an agent pull request.
  - Both comments use the marker of the workflow bot as the "already done" test, so they appear once.
- **Tests:** `tools/agent/levels.test.js` covers the level functions (`levelOfLabels`, `lowestLevel`, `levelChanges`),
  `countCommitsWithoutRun`, `hasMarker`, the comment bodies, the GraphQL response parsers, and `main` with an injected
  client (copy and removal of labels, one reminder, no reminder without a closing issue, the commits note once, dry-run,
  and the skips). The fixture `tools/agent/fixtures/pull_request_target.closed.json` is a merged pull request with a
  level.

### `tools/agent/report.js`

The weekly report: how far the team has come toward autonomy, in numbers. It uses no model. The `report` job of
`.github/workflows/ai-autonomous-report.yml` runs it on a schedule (Monday, 06:00 UTC) and on demand
(`workflow_dispatch`, input `days`). It checks out the default branch.

- **Inputs:** `GITHUB_REPOSITORY`, `GITHUB_TOKEN`, `AGENT_REPORT_DAYS` (a positive integer; default 7; the manual `days`
  input wins over the repository variable), `AGENT_REPORT_ISSUE` (optional issue number), `GITHUB_STEP_SUMMARY`, and the
  `AGENT_*` variables of `lib/config.js`. An invalid number throws before any call.
- **Outputs:** the report always goes to the job summary, followed by one note line (`Dry run: nothing is posted.`,
  `Dry run: the report would be posted to #<n>.`, `No AGENT_REPORT_ISSUE is set: the report stays in the job summary.`,
  or `Posted to #<n>.`). The report starts with the hidden marker `<!-- ai-autonomous-report -->`.
- **Model calls:** none.
- **GitHub reads (`GITHUB_TOKEN`; `issues: write`, `pull-requests: read`):** `searchIssues`
  (`GET /search/issues`, paginated; it throws when the search finds more than 1000 results or reports partial results,
  so a report is never short without notice) and `listIssueComments` (`GET /repos/{repo}/issues/{n}/comments`) for each
  state comment.
- **GitHub writes:** `createIssueComment` (`POST /repos/{repo}/issues/{n}/comments`) on `AGENT_REPORT_ISSUE`, with
  `GITHUB_TOKEN`, a new comment each week. Only when `AGENT_REPORT_ISSUE` is set and the run is not a dry run (dry-run
  is on unless `AGENT_DRY_RUN` is `false`). The report holds numbers only, no names of people.
- **Queries (`queriesOf`; `from` is the start of the period, UTC, no milliseconds):**

  | Key | Search query |
  |---|---|
  | `bugs` | `repo:<repo> is:issue type:Bug created:>=<from>` |
  | `tasks` | `repo:<repo> is:issue type:Task created:>=<from>` |
  | `merged` | `repo:<repo> is:pr is:merged merged:>=<from>` |
  | `opened` | `repo:<repo> is:pr created:>=<from>` (filtered in code by the marker of the agent, `agentIssueOf`) |
  | `reviewed` | `repo:<repo> is:pr label:"agent:pr-reviewed" updated:>=<from>` |

  Then the script reads the state comment (`lib/state.js`) of every issue, merged pull request, agent pull request,
  reviewed pull request, and every issue an agent pull request names (the attempts and costs of an implementation live
  in
  the state of the issue, which may be older than the period). A damaged state comment is counted as unreadable and left
  out, with a warning.
- **Metrics (sections of the report):**
  - Issues created: `Bug` and `Task` issues created (unique by number); suitable (`ai:suitable`); unsuitable
    (`ai:unsuitable`; an issue with both labels counts as unsuitable); not assessed; waiting for a person now
    (`agent:needs-human`, on top of the other counts).
  - Merged pull requests by execution level: a row per level in `LEVELS` order (imported from `levels.js`) and a row
    `No level`, with count and share (percent of the merged total); the lowest level counts for a pull request with two.
  - Pull requests of the agent: opened in the period; reached `agent:completed`; draft or `agent:needs-human`; merged
    (`merged_at`); reviewed by the agent (`agent:pr-reviewed`).
  - Attempts: the `attempts` entries of the states of issues (states with `kind: 'pull'` are left out) whose `at` is in
    the period, by `result` (`pr-opened`, `draft`, `blocked`, `unrelated`, `ci-green`, `ci-red`, `error`, `stopped`,
    then others), and how many belong to an issue marked `forced`. An attempt with `unrelated: true` counts as
    `unrelated`, whatever the CI verdict was, so the report shows that the agent found a failure unrelated and does
    not show how the rerun ended.
  - AI calls: the `costs` records of all states whose `at` is in the period, by flow (`review`, `analyze`, `implement`,
    `ci-fix`, `chat`, then others), by model (with `:variant`), and in total (calls and USD). The text says the costs
    are
    estimates from the price table of opencode; the OpenAI bill is the authority.
  - A closing line `State comments read: <n>.` with the number of unreadable ones when above zero.
- **Decisions:** `AGENT_ENABLED` is not `true` -> stop without any call. A failed search stops the run with no post.
- **Tests:** `tools/agent/report.test.js` covers the pure functions (`periodOf`, `inPeriod`, `issueCounts`,
  `levelCounts`,
  `agentPrCounts`, `costByFlow`, `attemptCounts`, `renderReport`, `queriesOf`). `tools/agent/report.main.test.js` covers
  `main` with an injected client and clock: posting, the dry run, no issue set, an empty period, a disabled agent,
  invalid input, and a failed search.

## Library modules

The modules under `tools/agent/lib/` hold everything the entry scripts share. They have no side effects at load time.
Each one has a test file next to it (`<name>.test.js`), run with `node --test`.

### `tools/agent/lib/agent-call.js`

One call of an opencode agent, shared by `review.js`, `analyze.js`, `implement.js`, and `chat.js`.

- **Exports:** `callAgent`.
- **Flow:** `callAgent` runs `runAgent` (`lib/opencode.js`), sums the events with `usage.summarize`, and pushes the cost
  record onto the caller's `costs` array before anything can throw. It writes `<agent><suffix>.final.md` (the last
  text of the model) into `out`, next to `<agent><suffix>.jsonl` (the events). Then it parses and validates the answer.
- **Parameters:** `flow`, `role`, `agent`, `model` (`{ id, variant }`), `message`, `inputFile`, `out`, `costs`,
  `runUrl`, `schema` (a key of `SCHEMAS` in `lib/contract.js`), optional `check` (semantic check that throws
  `ContractError`), optional `suffix` (for example `-r2` for round 2), and `deps.runAgent` (injected by tests).
- **Decisions:**
  - Exit code other than 0 and no final text: throws `Error('<agent> exited with <code>: <stderr tail>')` (last 500
    characters). The cost record is already stored.
  - Exit code other than 0 with a final text: the text is used.
  - No parsable JSON block, or a schema violation, or a failed `check`: logs `::error::`, rethrows the
    `ContractError`. The cost record stays in `costs`.
- **Tests:** `agent-call.test.js` covers the valid answer and the cost record, the suffix, a failed run with and without
  an answer, a broken contract, a schema violation, and `check`.

### `tools/agent/lib/commands.js`

Parser of `/agent ...` comments.

- **Exports:** `parseCommand(body)`. Returns `null` for an ordinary comment, else `{ name, force, notes }`.
- **Grammar:** only the first non-empty line decides. It must match `^/agent(?=\s|$)` (case-insensitive), so
  `/agentx` is not a command.

  | Input | Result |
  |---|---|
  | `/agent` alone (nothing on later lines) | `name: 'help'` |
  | `/agent <word> ...` with `<word>` (case-insensitive) in `review`, `analyze`, `implement`, `fix`, `retry`, `rerun`, `ci_check`, `ci-check`, `stop`, `cost`, `help` | `name: <word>`, with `fix` reported as `implement`, and `ci_check` and `ci-check` as `ci-check` |
  | `/agent implement force ...`, `/agent fix force ...`, or `/agent review force ...` | `force: true`; `force` counts only after `implement`, `fix`, or `review` |
  | `/agent` followed by any other word, or by text on a later line only | `name: 'chat'`, `notes` holds all the text |

  `notes` is the rest of the first line plus every following line, trimmed. Who may issue the command is decided by the
  caller (`route.js`). The command name `answer`, which `implement.js` and `chat.js` test for, is not produced here:
  `route.js` sets it.
- **Tests:** `commands.test.js` covers ordinary comments, `/agentx`, bare `/agent`, case, `fix` mapping, blank leading
  lines, `force` (also after `review`), `notes` (also of `rerun` and `ci-check`), and the chat fallback.

### `tools/agent/lib/config.js`

The configuration from the environment, with safe defaults. A bad value throws an `Error` that names the variable.

- **Exports:** `loadConfig(env)`, `parseModel(value, name)`, `isActorAllowed(config, login)`.
- **Result of `loadConfig`:** `{ enabled, dryRun, allowedActors, models, limits }`.

  | Variable | Field | Default and rule |
  |---|---|---|
  | `AGENT_ENABLED` | `enabled` | `true` only for the exact value `true` |
  | `AGENT_DRY_RUN` | `dryRun` | `true` unless the value is exactly `false` |
  | `AGENT_ALLOWED_ACTORS` | `allowedActors` | comma-separated logins, trimmed and lowercased; unset or empty gives `null` (no restriction) |
  | `AGENT_MODEL_IMPLEMENT` | `models.implement` | `openai/gpt-6.1-sol:high` |
  | `AGENT_MODEL_REVIEW` | `models.review` | `openai/gpt-6-luna:max` |
  | `AGENT_MODEL_VERIFY` | `models.verify` | `openai/gpt-6.1-sol:medium` |
  | `AGENT_MODEL_LIGHT` | `models.light` | `openai/gpt-6-luna:medium` |
  | `AGENT_MODEL_TRIAGE` | `models.triage` | `openai/gpt-6.1-sol:medium` |
  | `AGENT_MAX_ATTEMPTS` | `limits.maxAttempts` | 3 |
  | `AGENT_MAX_REVIEW_ROUNDS` | `limits.maxReviewRounds` | 2 |
  | `AGENT_MAX_ANALYSES` | `limits.maxAnalyses` | 5 |
  | `AGENT_ANALYSIS_GRACE_MINUTES` | `limits.analysisGraceMinutes` | 30; a non-negative integer, `0` means analyze at once |
  | `AGENT_REVIEW_MAX_LINES` | `limits.reviewMaxLines` | 5000 |
  | `AGENT_REVIEW_MAX_FILES` | `limits.reviewMaxFiles` | 150 |
  | `AGENT_DAILY_ANALYSES` | `limits.dailyAnalyses` | 10 |
  | `AGENT_DAILY_REVIEWS` | `limits.dailyReviews` | 15 |

- **Model syntax:** `provider/model[:variant]`. The variant is whatever follows the last colon, else `null`. A blank
  variable counts as unset. Limits must be positive integers in plain digits; the grace period also allows 0.
- **Decisions:** `models.implement.id` equal to `models.review.id` throws (the variants are not compared, so
  `:high` and `:max` of one model are still refused).
- `isActorAllowed` is true without a list; with a list it compares lowercased logins.
- **Tests:** `config.test.js` covers defaults, the exact-value rules, actor parsing, model and limit parsing, the
  grace period, and the same-model refusal.

### `tools/agent/lib/daily-usage.js`

The pure part of the daily caps (see [Daily caps and the sweep](#daily-caps-and-the-sweep)).

- **Exports:** `WINDOW_MS` (24 hours), `MAX_STATES_READ` (100), `AUTOMATIC_ANALYSIS_TRIGGERS` (`opened`, `typed`,
  `sweep`), `windowStart(now)`, `toSearchTime(date)` (UTC ISO without milliseconds), `isInWindow(at, since)`,
  `countAnalyses(states, since)`, and `countReviews(states, since)`.
- **Rules:** an entry counts when `at` is a string at or after `since`. `countAnalyses` counts the automatic triggers.
  `countReviews` counts `trigger: 'auto'` and entries without a trigger, failed ones included, and leaves out `command`
  and `skipped: 'size'`.
- **Tests:** `daily-usage.test.js` covers the window edges, each trigger, old entries, and missing fields.

### `tools/agent/lib/review-size.js`

The size limit of the review (see [`tools/agent/review.js`](#toolsagentreviewjs)). All functions are pure.

- **Exports:** `LOCK_FILES`, `measureDiff(files)` (changed lines and file count without lock files),
  `exceedsLimit(size, limits)` (above, not at, a limit), `checkSize(files, limits, force)`, and `renderSkip(...)`.
- **Tests:** `review-size.test.js`.

### `tools/agent/lib/contract.js`

The JSON contract between the model and the scripts. See "Model output contracts" below for every schema.

- **Exports:** `ContractError` (with `problems`, one string per problem and path), `extractJson(text)`,
  `validate(schemaName, value)`, `SCHEMAS`.
- `extractJson` returns the object of the LAST fenced `json` block, matched line by line (a fence inside a JSON string
  cannot end the block). Without such a block it parses the whole trimmed text. An unclosed block, invalid JSON, or a
  non-object throws `ContractError`.
- `validate` supports only the JSON Schema subset the schemas use: `type` (one name or an array; `integer` and `number`
  are checked), `enum`, `required`, `properties`, `additionalProperties: false`, `items`, `minLength`, `maxLength`,
  `maxItems`. An unknown schema name throws a plain `Error`.
- **Tests:** `contract.test.js` covers extraction, every validator rule, and each schema.

### `tools/agent/lib/diff.js`

Which lines of a pull request file accept a review comment.

- **Exports:** `commentableLines(patch)`. Input: the `patch` field of the pull request files API. Output:
  `Set<number>` of new-file line numbers (added lines and context lines inside the hunks, for `side: 'RIGHT'`).
  Returns an empty set for `undefined` or an empty patch (binary or too large file).
- The hunk header counts decide where a hunk ends, so a blank line outside a hunk is never counted.
- **Used by:** `review.js` to place findings inline or in the summary.
- **Tests:** `diff.test.js` covers hunks, removed lines, no-newline marker, header without counts, CRLF, empty patches.

### `tools/agent/lib/facts.js`

Facts about a pull request that need no model.

- **Exports:** `computeFacts({ files, labelerYaml, title, body, affected })`, `globToRegExp(glob)`.
- **Result:** `{ changedFiles (sorted), modules (sorted, unique), affectedProjects (sorted, or null), flags }`.
  `flags` holds `openapi` (`docs/api/*.yaml|yml|json`), `migrations` (`migrations/*.sql`), `deploy` (`deploy/`,
  `docs/configuration-reference.md`, `config.template.yaml`), `workflows` (`.github/workflows/`, `.github/actions/`),
  `dependencies` (`go.mod`, `go.sum`, `package.json`, `pnpm-lock.yaml`, `pom.xml`), and `breakingMarker` (a `type!:`
  title or a `BREAKING CHANGE:` line in the body).
- **Modules** come from the `module:<name>` labels of `.github/labeler.yml`. Only `any-glob-to-any-file` conditions
  under `changed-files` are read. The glob dialect: `**`, `*`, `?`, and nested `{a,b}`.
- **Dependency:** the `yaml` package. CI installs it next to the tools; in a checkout the module falls back to the copy
  that Nx brings.
- **Used by:** `review.js`, which writes the result as the section `impact-facts.json` of `review-input.md`.
- **Tests:** `facts.test.js` covers the glob dialect, module detection, the flags, and the real `labeler.yml`.

### `tools/agent/lib/github.js`

The GitHub REST and GraphQL client.

- **Exports:** `createClient({ token, repo, fetchImpl, apiUrl, sleep, now })`, `GitHubError` (`status`, `body`),
  `hasWriteAccess(permission)` (true for `admin`, `maintain`, `write`).
- **Requests:** base `https://api.github.com`, headers `Authorization: Bearer <token>`,
  `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: ai-autonomous-agent`.
  `{repo}` in a path is replaced with `owner/name`.
- **Retries:** up to 3 retries, on 502, 503, 504 (backoff 1, 2, 4 seconds, or `retry-after`), and on 403 or 429 with a
  `retry-after` header or `x-ratelimit-remaining: 0` (wait until `x-ratelimit-reset`). A wait is capped at 60 seconds.
  Any other non-2xx response throws `GitHubError`. A 204 returns `null`.
- **Pagination:** `paginate` reads `per_page=100` pages until a short page. `searchIssues` throws when the search
  reports more than 1000 results or `incomplete_results`, because a short list would falsify a report.
- **Tokens:** every script builds its client from `GITHUB_TOKEN` of the job. The exceptions use `AGENT_PAT` (a client of
  its own): the Git identity lookup, opening and editing the pull request, and marking it ready. The PAT is needed so
  that events of the pull request start workflows.

| Method | Call | Used by |
|---|---|---|
| `request`, `paginate`, `graphql` | generic helpers | `graphql` directly by `levels.js` |
| `getPull(n)` | `GET /repos/{repo}/pulls/{n}` | `chat.js`, `ci-gate.js`, `implement.js`, `levels.js`, `review.js`, `route.js` |
| `listPullFiles(n)` | `GET /repos/{repo}/pulls/{n}/files` (paginated) | `review.js` |
| `listPullCommits(n)` | `GET /repos/{repo}/pulls/{n}/commits` (paginated) | `levels.js` |
| `getIssue(n)` | `GET /repos/{repo}/issues/{n}` | `analyze.js`, `chat.js`, `implement.js` |
| `listIssueComments(n)` | `GET /repos/{repo}/issues/{n}/comments` (paginated) | `analyze.js`, `chat.js`, `ci-gate.js`, `implement.js`, `levels.js`, `report.js`, `review.js`, `route.js`; also `state.withFreshCosts` |
| `createIssueComment(n, body)` | `POST /repos/{repo}/issues/{n}/comments` | `analyze.js`, `chat.js`, `ci-gate.js`, `implement.js`, `levels.js`, `report.js`, `review.js`, `route.js` (the decline) |
| `updateIssueComment(id, body)` | `PATCH /repos/{repo}/issues/comments/{id}` | `analyze.js`, `chat.js`, `ci-gate.js`, `implement.js`, `review.js` |
| `addLabels(n, labels)` | `POST /repos/{repo}/issues/{n}/labels` | `analyze.js`, `ci-gate.js`, `implement.js`, `levels.js`, `review.js` |
| `removeLabel(n, label)` | `DELETE /repos/{repo}/issues/{n}/labels/{label}`; a 404 is not an error | `analyze.js`, `chat.js`, `ci-gate.js`, `implement.js`, `levels.js` |
| `createReview(n, ...)` | `POST /repos/{repo}/pulls/{n}/reviews`, `event: 'COMMENT'` always, comments with `side: 'RIGHT'` | `review.js` |
| `getPermission(login)` | `GET /repos/{repo}/collaborators/{login}/permission`; 404 gives `none` | `route.js` |
| `getAuthenticatedUser()` | `GET /user` (PAT) | `implement.js` (Git identity) |
| `createPull(...)` | `POST /repos/{repo}/pulls` (PAT) | `implement.js` |
| `updatePull(n, ...)` | `PATCH /repos/{repo}/pulls/{n}` (PAT) | `implement.js` |
| `listPulls({ head, state })` | `GET /repos/{repo}/pulls?head=owner:branch&state=open` (paginated) | `route.js` |
| `convertPullToDraft(nodeId)` | GraphQL mutation `convertPullRequestToDraft` (PAT) | `implement.js` |
| `markPullReady(nodeId)` | GraphQL mutation `markPullRequestReadyForReview` (PAT) | `ci-gate.js` |
| `listCheckRuns(sha)` | `GET /repos/{repo}/commits/{sha}/check-runs?filter=latest` | `ci-gate.js` |
| `listWorkflowRuns(file, { status, created })` | `GET /repos/{repo}/actions/workflows/{file}/runs` with the optional filters `status` and `created` (the list is wrapped in `workflow_runs`, paginated by hand) | `route.js` (the busy check) |
| `getCombinedStatus(sha)` | `GET /repos/{repo}/commits/{sha}/status` | `ci-gate.js` |
| `getJobLog(jobId)` | `GET /repos/{repo}/actions/jobs/{jobId}/logs` (text, redirect followed) | `ci-gate.js` |
| `rerunFailedJobs(runId)` | `POST /repos/{repo}/actions/runs/{runId}/rerun-failed-jobs` | `ci-gate.js` (the gate and `rerun`), `implement.js` (`publish`, `unrelated`) |
| `cancelRun(runId)` | `POST /repos/{repo}/actions/runs/{runId}/cancel`; 409 returns `false` | `chat.js` (`/agent stop`) |
| `addReaction(commentId, content)` | `POST /repos/{repo}/issues/comments/{commentId}/reactions` | via `lib/reactions.js`: `chat.js`, `implement.js`, `ci-gate.js` (`rerun`), `ci-check.js`, `route.js` (the decline) |
| `replyToReviewComment(n, commentId, body)` | `POST /repos/{repo}/pulls/{n}/comments/{commentId}/replies` | `implement.js` |
| `listReviewThreads(n)` | GraphQL query `repository.pullRequest.reviewThreads(first: 100)` with `comments(first: 20)` | `implement.js` |
| `searchIssues(query)` | `GET /search/issues` (paginated) | `report.js` |

`levels.js` also calls `gh.graphql` with two queries of its own: `closingIssuesReferences(first: 20)` on a pull request,
and `closedByPullRequestsReferences(first: 20, includeClosedPrs: true)` on an issue.

- **Tests:** `github.test.js` covers headers, query encoding, every retry rule, pagination, search limits, GraphQL
  errors, and each helper's path and body.

### `tools/agent/lib/log.js`

Logging for the job log.

- **Exports:** `info`, `warn`, `error`, `group`, `json`, `modelEvent`, `modelEventLine`, `setWriter`.
- `info(message, fields)` prints `[agent] message key=value ...` (values with spaces or quotes are JSON-quoted).
  `warn` and `error` print `::warning::` and `::error::` on one line. `group(title, fn)` wraps `fn` in
  `::group::`/`::endgroup::` and logs the duration; `json(title, value)` prints pretty JSON in its own group.
- `modelEventLine(role, event)` turns one opencode event into one line: `tool_use` (tool, target, status),
  `step_finish` (reason, uncached and cached tokens, output, reasoning, cost), `text` (first 400 characters),
  `error` (a `::warning::`). Other event types return `null`.
- **Tests:** `log.test.js` covers field formatting, groups (also on failure), one-line annotations, and event lines.

### `tools/agent/lib/opencode.js`

Runs one opencode agent headless and keeps its JSON event stream.

- **Exports:** `CONFIG_DIR`, `SECRET_ENV`, `runEnv`, `runArgs`, `logArgs`, `runAgent`.
- **Command line** (the binary is `opencode` from `PATH`; the job installs `opencode-ai@1.19.4`, the workflow variable
  `OPENCODE_VERSION`):

  ```text
  opencode [--print-logs --log-level <LEVEL>] run <message> --format json --agent <agent> --model <provider/model>
           [--variant <variant>] [--title <title>] [--file <path>]...
  ```

  The message comes first and `--file` last, because `--file` takes several values and a message after it would be read
  as one more file. `callAgent` passes no `--title`. The working directory is `process.cwd()`; stdin is ignored.
- **Log level:** `AGENT_LOG_LEVEL` (`DEBUG`, `INFO`, `WARN`, `ERROR`, case-insensitive; default `INFO`) becomes
  `--print-logs --log-level <LEVEL>`. A value outside the list adds no log flags. opencode's logs go to stderr, which
  the job log shows. The last 4000 characters of stderr are kept as `stderrTail`.
- **Environment of the run:** the parent environment minus every variable that matches
  `^(GITHUB_TOKEN|GH_TOKEN|AGENT_PAT|ACTIONS_.*|INPUT_.*)$`, plus `OPENCODE_CONFIG` (path to
  `tools/agent/opencode/opencode.json`), `OPENCODE_CONFIG_DIR` (`tools/agent/opencode/`), and
  `OPENCODE_DISABLE_AUTOUPDATE=1`. The OpenAI key stays; no GitHub token reaches the model.
- **Events:** stdout is written to the events file as it arrives. Each complete line that starts with `{` is parsed and
  passed to `log.modelEvent`, so a long run shows progress live. Non-JSON lines stay in the file only.
- **Result:** resolves `{ exitCode, eventsText, stderrTail }`; a non-zero exit does not reject (the cost must still be
  recorded). It rejects only when the process cannot start.
- **How events are read afterwards:** see `lib/usage.js`.
- **Tests:** `opencode.test.js` covers the stripped environment, argument order, the missing variant, `SECRET_ENV`.

### `tools/agent/lib/prompt.js`

- **Exports:** `untrusted(text)`. Returns `<untrusted>\n<text>\n</untrusted>`, with every `<untrusted>` or
  `</untrusted>` tag inside the text (whitespace and case tolerant) turned into `[untrusted]` or `[/untrusted]`, so
  the text cannot close the block. `null` and `undefined` give an empty block.
- **Used by:** `analyze.js`, `chat.js`, `implement.js`, `review.js` for text written by people.
- **Tests:** `prompt.test.js`.

### `tools/agent/lib/reactions.js`

- **Exports:** `react({ gh, commentId, content, dryRun })`, `commentIdOf(value)`.
- Allowed reactions: `eyes` (work starts), `rocket` (ends well), `confused` (refusal or failure). Another value throws.
- Decisions: no comment id (a review run, a CI fix) returns `false`; dry-run only logs; a failed API call logs a
  warning and returns `false` (never fails the job). `commentIdOf` returns a positive safe integer or `null`.
- **Used by:** `chat.js` and `implement.js` (`AGENT_COMMENT_ID`).
- **Tests:** `reactions.test.js`.

### `tools/agent/lib/state.js`

The hidden state block in one comment per issue or pull request. See "State comment" below.

- **Exports:** `MARKER`, `render`, `replaceState`, `parse`, `findStateComment`, `emptyIssueState`, `emptyPullState`,
  `addCost`, `mergeCosts`, `withFreshCosts`, `actorOf`.
- `render(human, state)` builds `<!-- ai-autonomous-state -->`, the Markdown for people, and the JSON in an HTML
  comment opened by `<!-- ai-autonomous-state-json` and closed by `-->`. Each `--` in the JSON is written as
  `--`, so `-->` never appears inside it; `JSON.parse` reads the escape back.
- `parse(body)` takes the LAST opener, so a human part that quotes the opener cannot hide the real block. It returns
  `null` without a block and throws on an unclosed block, invalid JSON, or a non-object.
- `findStateComment(comments)` accepts only a comment by `github-actions[bot]` whose body starts with the marker. A
  copy pasted by anyone else is ignored.
- `replaceState(body, state)` swaps the JSON block and keeps the human part. `addCost` returns a copy with one more
  cost record.
- `mergeCosts(fresh, mine)` and `withFreshCosts(gh, number, mine)` keep the cost records of both states (one record per
  run, role, time, and price), because `chat` and `publish` write the same comment from different concurrency groups.
  `withFreshCosts` re-reads the comment right before a write.
- `actorOf(state)` returns `implementing.actor`, else the actor of the last attempt, else `null`. The CI gate uses it.
- **Tests:** `state.test.js` covers round trip, dash escaping, damaged blocks, author check, empty shapes, cost merging.

### `tools/agent/lib/text.js`

- **Exports:** `inline`, `defuseMentions`, `clip`, `tailLines`, `stripAnsi`.
- `defuseMentions` inserts a zero-width space after every `@` that is followed by a word character or a hyphen, so a
  model or a person cannot notify anyone through the bot. `inline` also joins lines into one line.
  `clip(text, max)` cuts and appends a note. `tailLines(text, n)` keeps the last `n` lines. `stripAnsi` removes color
  and cursor sequences.
- **Used by:** `analyze.js`, `chat.js`, `ci-gate.js`, `implement.js`.
- **Tests:** `text.test.js`.

### `tools/agent/lib/usage.js`

Tokens and cost of one opencode run, from the event stream.

- **Exports:** `parseEvents(text)`, `summarize(events)`, `costRecord({ ... })`, `formatUsd(n)`.
- **Events read:** `step_finish` (`part.tokens.input`, `part.tokens.cache.write`, `part.tokens.cache.read`,
  `part.tokens.output`, `part.tokens.reasoning`, `part.cost` in USD), `text` (`part.text`), `error` (`error`). Blank
  lines, non-JSON lines, and a truncated last line are skipped. A missing field counts as 0.
- **Summary:** `{ steps, input, cached, output, reasoning, usd, finalText, errors }`. `input` is
  `tokens.input + tokens.cache.write`: opencode 1.19 reports the uncached OpenAI prompt as `cache.write`. `finalText`
  is the text of the LAST `text` event, not a concatenation.
- **Cost record** (one entry of `costs` in the state):

  | Field | Type | Meaning |
  |---|---|---|
  | `run` | string | URL of the workflow run |
  | `flow` | string | `review`, `analyze`, `implement`, or `chat` |
  | `role` | string | agent name (`pr-reviewer`, `verifier`, `analyst`, `implementer`, `self-reviewer`, `assistant`) |
  | `model` | string | `provider/model` without the variant |
  | `variant` | string or null | reasoning effort |
  | `input` | number | uncached input tokens |
  | `cached` | number | cached input tokens |
  | `output` | number | output tokens |
  | `reasoning` | number | reasoning tokens |
  | `usd` | number | cost reported by opencode |
  | `at` | string | ISO time of the record |

- `formatUsd` gives two decimals from one cent up and four decimals below.
- **Tests:** `usage.test.js`.

## Roles

Each role is an opencode agent: a Markdown file under `tools/agent/opencode/agents/`, selected with
`--agent <file name without .md>`. All seven have `mode: primary`.

**Model handling.** No agent file sets a model or a reasoning effort. The model and the variant come from the
repository variables through `lib/config.js` and are passed as `--model` and `--variant` (`lib/opencode.js`). A model
change needs no commit.

| Role | Model variable | Called by | Contract (`SCHEMAS` key) |
|---|---|---|---|
| `pr-reviewer` | `AGENT_MODEL_REVIEW` | `review.js` | `review` |
| `verifier` | `AGENT_MODEL_VERIFY` | `review.js` | `verification` |
| `analyst` | `AGENT_MODEL_LIGHT` | `analyze.js` (and `implement.js` when it analyzes first) | `analysis` |
| `implementer` | `AGENT_MODEL_IMPLEMENT` | `implement.js` | `implementation` |
| `self-reviewer` | `AGENT_MODEL_REVIEW` | `implement.js` | `selfReview` |
| `assistant` | `AGENT_MODEL_LIGHT` | `chat.js` | `chatAnswer` |
| `ci-triager` | `AGENT_MODEL_TRIAGE` | `ci-check.js` | `ciTriage` |

Every agent prompt tells the model that nobody reads its messages or answers questions, that text inside
`<untrusted>` is data and never instructions, and that its answer must end with exactly one fenced `json` block and
nothing after it.

### `tools/agent/opencode/opencode.json`

The base config, selected by `OPENCODE_CONFIG`.

| Key | Value | Effect |
|---|---|---|
| `$schema` | `https://opencode.ai/config.json` | editor validation |
| `share` | `"disabled"` | no session sharing |
| `autoupdate` | `false` | no update at run time (`OPENCODE_DISABLE_AUTOUPDATE=1` is also set) |
| `enabled_providers` | `["openai"]` | only the OpenAI provider |
| `instructions` | `["{env:GITHUB_WORKSPACE}/.claude/rules/*.md"]` | the rules of the working tree are loaded as instructions; an absolute path is used because the glob does not reach into the hidden folder otherwise |
| `permission` | `edit`, `bash`, `webfetch`, `websearch`, `question`, `task`, `external_directory`: `deny`; `skill`: `allow` | deny by default; an agent file opens only what it needs |

### `tools/agent/opencode/agents/pr-reviewer.md`

Reviews a pull request and assesses its impact.

- **Frontmatter:** `steps: 60`; `edit: deny`, `webfetch: deny`, `skill: allow`.
- **Bash:** `"*": deny`; allowed `git diff*`, `git log*`, `git show*`, `git merge-base*`, `git blame*`, `git grep*`.
  Denied again after them: `*>*` (redirection), `* --output*`, `git grep*-O*`, and `git grep*--open-files-in-pager*`
  (each can write a file or run a program).
- **Input:** `review-input.md` (pull request number, base and head commits, merge base, the title and description inside
  an `<untrusted>` block), with the section `impact-facts.json` (computed facts, to be trusted).
- **Task:** load the `apihub-pr-review` skill, read `git diff <merge-base> <head>`, load the module skills that the
  skill names.
- **Output:** the `review` contract: `summary`, `risk`, `riskReason`, `impact` (modules, images, restApi, database,
  deploy, e2e), and at most 30 `findings` (`id`, `file`, `line` in the new version or `null`, `severity`, `category`,
  `title`, `body`). An empty `findings` list is valid.

### `tools/agent/opencode/agents/verifier.md`

Checks each finding of the reviewer against the code.

- **Frontmatter:** `steps: 40`; `edit: deny`, `webfetch: deny`, `skill: allow`.
- **Bash:** `"*": deny`; allowed `git diff*`, `git log*`, `git show*`, `git blame*`, `git grep*`; the same four denials
  as the reviewer.
- **Input:** `verify-input.md` (base and head commits, merge base, the findings as JSON).
- **Task:** read the code each finding points at; give `confirmed`, `plausible`, or `rejected`. It may not add findings.
- **Output:** the `verification` contract: `verdicts`, one entry per finding in input order, each with `id`, `verdict`,
  `reason`.

### `tools/agent/opencode/agents/analyst.md`

Decides whether an issue suits AI implementation.

- **Frontmatter:** `steps: 40`; `edit: deny`, `webfetch: deny`, `skill: allow`.
- **Bash:** `"*": deny`; allowed `git log*`, `git show*`, `git grep*`; the same four denials. (No `git diff`.)
- **Input:** `analysis-input.md` (issue number, type, labels; title, description, and comments inside `<untrusted>`
  blocks; the earlier verdict and questions when the issue was analyzed before).
- **Task:** load `apihub-issue-analysis`, search the code, check whether new comments answer earlier questions.
- **Output:** the `analysis` contract: `verdict` (`suitable`, `unsuitable`, `needs-info`), `reason`, `questions`,
  `plan`.

### `tools/agent/opencode/agents/implementer.md`

Changes the working tree for a Bug or Task issue.

- **Frontmatter:** `steps: 200`; `webfetch: deny`, `websearch: deny`, `skill: allow`.
- **Edit:** `"*": allow`, with these denials (paths the model must not change, because a change there would steer the
  reviewer of the same run): `*.claude/*`, `*.cursor/*`, `*tools/agent/*`, `*agent-packages/*`, `*AGENTS.md`,
  `*CLAUDE.md`, `*.github/workflows/*`.
- **Bash:** `"*": deny`; allowed `pnpm exec nx *`, `pnpm nx *`, `go test*`, `go build*`, `go vet*`, `gofmt*`,
  `node --test*`, `git status*`, `git diff*`, `git log*`, `git show*`, `git grep*`, `ls*`. Explicitly denied:
  `git push*`, `git commit*`, `git checkout*`, `git switch*`, `git reset*`, `git rebase*`, `gh *`, `curl *`, `wget *`.
  Commits, branches, and pushes belong to `implement.js`. This agent has no `*>*` denial.
- **Input:** `implement-input.md` (the playbook `bug-fix` or `task`, the issue, the analysis plan, notes of earlier
  attempts, and on a later round the self-review findings, the failing checks, or the CI report).
- **Task:** load `apihub-bug-fix` or `apihub-task`; with a CI report also `apihub-ci-failure-triage`. Run the module
  checks through Nx.
- **Output:** the `implementation` contract: `status` (`done`, `blocked`, `unrelated`), `summary`, `commitType`,
  `scope`,
  `title` (at most 72 characters), `verification`, `notes`, `blockedReason`. `implement.js` adds rules: a `bug-fix` must
  use `fix`, `blocked` and `unrelated` need a non-empty `blockedReason`, and `unrelated` is for a CI fix only.
- **`unrelated`:** on a CI fix, when the evidence shows that the failure is not caused by the change (a flaky or
  infrastructure failure, a test the change does not touch), the role changes no code and puts the evidence in
  `blockedReason`: which checks failed and why the change cannot cause them. `blocked` stays for "I cannot continue".

### `tools/agent/opencode/agents/self-reviewer.md`

Reviews the implementer's change before it becomes a pull request. It runs on `AGENT_MODEL_REVIEW`, a different model
than the implementer (`lib/config.js` enforces that).

- **Frontmatter:** `steps: 60`; `edit: deny`, `webfetch: deny`, `skill: allow`.
- **Bash:** `"*": deny`; allowed `git diff*`, `git log*`, `git show*`, `git blame*`, `git grep*`; the same four denials.
- **Input:** `self-review-input.md` (the issue inside `<untrusted>`, the plan, the implementer's summary, base and
  head).
- **Task:** read `git diff <base> <head>`; load `apihub-backend-self-review` for `backend/portal-backend`,
  `apihub-go-self-review` for other Go modules, and the review guidance of `apihub-pr-review` for the rest. Judge
  whether the change does what the issue asks, is correct, and stays inside the issue.
- **Output:** the `selfReview` contract: `verdict` (`approve`, `changes`) and at most 20 `findings` (`severity`
  `blocker|major|minor`, `file`, `line`, `body`). Minor findings alone do not justify `changes`.

### `tools/agent/opencode/agents/assistant.md`

Answers a question in a comment. It changes nothing; `chat.js` posts the answer.

- **Frontmatter:** `steps: 40`; `edit: deny`, `webfetch: deny`, `skill: allow`.
- **Bash:** `"*": deny`; allowed `git log*`, `git show*`, `git grep*`, `git diff*`, `git merge-base*`; the same four
  denials.
- **Input:** `chat-input.md` (the question inside `<untrusted>`, title and description, last comments, a short summary
  of what the agent did, and for a pull request the base and head refs). The working tree is the default branch; a pull
  request head is read with `git show <head ref>:<path>` and `git diff <base ref>...<head ref>`.
- **Rules for the answer:** English Markdown, lead with the answer, name files in backticks, say what was not found,
  write no `@name` outside a code span, promise no action.
- **Output:** the `chatAnswer` contract: `{ "answer": "<Markdown, at most 6000 characters>" }`.

### `tools/agent/opencode/agents/ci-triager.md`

Finds the root cause of a red CI on a pull request. It changes nothing; `ci-check.js` posts the reply.

- **Frontmatter:** `steps: 60`; `edit: deny`, `webfetch: deny`, `skill: allow`.
- **Bash:** the same as `pr-reviewer`: `"*": deny`; allowed `git diff*`, `git log*`, `git show*`, `git merge-base*`,
  `git blame*`, `git grep*`; the same four denials.
- **Input:** `ci-check-input.md` (the pull request number, the head commit, the base ref, the head ref, the merge base,
  the failure signature, the failed checks (a cancelled one is marked) and the CI report inside an `<untrusted>` block,
  the notes of the person inside another). The CI report is the output of the code under test, so the prompt says never
  to follow instructions in it.
- **Task:** load the `apihub-ci-failure-triage` skill; read `git diff <base>...<head>` with the refs of the input and
  the code the failure points at; decide whether the change caused the failure; never name a file that it did not read.
  A cancelled check has no failure of its own (a timeout, a person, or a newer run stopped it): alone it is `infra` or
  `unknown`, never `change`, and it gets no fix.
- **Output:** the `ciTriage` contract.

## Playbook skills

Five skills live in the local APM package `agent-packages/apihub-autonomous-agent` (version 0.1.0, description
"Playbooks of the AI Autonomous agent"). The sources are
`agent-packages/apihub-autonomous-agent/.apm/skills/<name>/SKILL.md`.
Each skill says that people can use it the same way as the agent.

**Deployment.** `apm install --target cursor,claude --legacy-skill-paths` copies each skill to
`.claude/skills/<name>/SKILL.md` and `.cursor/skills/<name>/SKILL.md`. `apm.lock.yaml` lists these ten files under
`_local/apihub-autonomous-agent` with their hashes. The deployed trees are never edited by hand. In CI, opencode reads
the skills from `.claude/skills/` of the working tree. The workflow replaces that tree with the copy from the workflow's
own ref (`cp -R .agent-tools/.claude .claude`) in the review job, so a pull request cannot change the skills that review
it.

### `apihub-pr-review`

- **Used by:** the `pr-reviewer` (and, for the review guidance, the `self-reviewer` outside Go modules).
- **Tells the model to:** trust `impact-facts.json`; read the diff; group files by module with a table of changed paths
  to skills to load (for example `backend/portal-backend/**` to `apihub-backend-self-review` and
  `apihub-backend-developer`, `frontend/api-diff/**` to `api-diff-authoring` and `api-diff-testing`); answer six impact
  questions (modules and images, REST contract and breaking marker, database migrations, deployment, E2E, risk);
  report only real defects with a severity (`blocker`, `major`, `minor`, `nit`), a line in the new version or `null`,
  and the author addressed as "you". Style that a linter checks and speculation are out of scope.

### `apihub-issue-analysis`

- **Used by:** the `analyst`.
- **Tells the model to:** read the issue and every comment; find the code; pick a verdict from a table (`suitable`:
  clear result, located code, one pull request, a testable change; `needs-info`: a few answers would make it suitable;
  `unsuitable`: a decision of people, missing access, other repositories, a many-module change, or a bug that cannot be
  reproduced in a test). For `suitable`, write a plan (modules as in `.github/labeler.yml`, approach, tests, risk). For
  `needs-info`, write short questions (three at most is a good limit).

### `apihub-bug-fix`

- **Used by:** the `implementer` when the playbook is `bug-fix` (a Bug issue).
- **Tells the model to:** locate the code from the plan; write a test that fails for the reason in the issue; make the
  smallest fix of the cause (no catch-all handling, no silent fallback); run module tests and build through Nx; make the
  follow-ups in the same change (OpenAPI and Postman, Helm, Compose, and `docs/configuration-reference.md`, SQL
  migration rules). Out of bounds: refactoring, workflow changes, weakened checks. When blocked, say why. End with notes
  for the next attempt.

### `apihub-task`

- **Used by:** the `implementer` when the playbook is `task` (a Task issue).
- **Tells the model to:** write two to five checkable done criteria first; locate; change only what the criteria need;
  run checks through Nx (documentation changes follow `english-developer-style` and `markdown-line-length-120`); make
  the same follow-ups as for a bug. It carries a table that maps a change to the Conventional Commit type (`feat`,
  `refactor`, `perf`, `chore` or `build`, `ci`, `docs`, `test`) and says the scope is the module name or empty. Same
  out-of-bounds list as `apihub-bug-fix`.

### `apihub-ci-failure-triage`

- **Used by:** the `implementer` on a CI-fix attempt (the input holds a CI report).
- **Tells the model to:** start from the verdict job `ci-ok`; read a skipped job as a `plan` problem; reproduce Nx
  targets of `js`, `go`, `java` locally; treat screenshot diffs, E2E setup failures, super-linter output, and the
  `PR: Title` and `PR: Commit messages` checks each in their own way; decide whether the change caused the failure
  (same job red on `develop` at the merge base, timeouts, network and registry errors mean "not the change"); fix the
  cause and never skip or loosen a test.

## State comment

The state is one comment per issue or pull request, written by `github-actions[bot]` (the `GITHUB_TOKEN` of the job).
The body is `<!-- ai-autonomous-state -->`, Markdown for people, and the JSON block described under `lib/state.js`.
`findStateComment` takes the first bot comment that starts with the marker. Scripts that replace the comment read it
again first and merge cost records (`withFreshCosts`), so `chat` and `publish` do not drop each other's records.

**Shapes.**

- Issue: `{ schema: 1, kind: 'issue', number, phase: null, costs: [] }` (`emptyIssueState`).
- Pull request: `{ schema: 1, kind: 'pull', number, phase: null, costs: [], reviews: [] }` (`emptyPullState`).
  Only `review.js` writes a pull request state. A pull request of the agent carries the marker
  `<!-- ai-autonomous-agent issue=<n> -->` in its description; `chat.js` follows it to the issue state.

**Phase values of an issue.** `null` (no work yet), `needs-info` and `analyzed` (after an analysis), `implementing`,
`waiting-ci`, `completed`, `needs-human`, `stopped`.

### Issue state fields

| Field | Type | Writer | Meaning |
|---|---|---|---|
| `schema` | number | `state.js` | always `1` |
| `kind` | string | `state.js` | `issue` |
| `number` | number | `state.js` | issue number |
| `phase` | string or null | `analyze.js`, `implement.js` (`preflight`, `publish`), `ci-gate.js`, `chat.js` (`stop`) | phase values above. `analyze.js`: `needs-info` or `analyzed`. `implement.js preflight`: `implementing`. `publish`: `waiting-ci` (pull request opened and green locally) or `needs-human`. `ci-gate.js`: `completed`, `needs-human`, or `implementing` (a CI fix); `ci-gate.js rerun`: `waiting-ci` (or `completed` on the green path). `chat.js stop`: `stopped` |
| `costs` | array | every script that calls a model (`review.js`, `analyze.js`, `implement.js`, `chat.js`, `ci-check.js`); `state.addCost` | cost records, see `lib/usage.js` |
| `analysis` | object | `analyze.js`, `implement.js publish` (analyze-first run) | last analysis: `verdict`, `reason`, `questions`, `plan`, `label` (`ai:suitable`, `ai:unsuitable`, or `null`), `labelSetBy` (`agent` or `null`), `issueUpdatedAt` (the issue's `updated_at` when analyzed), `at`, `run` |
| `analyses` | array | `analyze.js`, `implement.js publish` | one entry per analysis run: `at`, `run`, `verdict` (`suitable`, `unsuitable`, `needs-info`, or `failed`), `trigger`. Counted against `AGENT_MAX_ANALYSES` |
| `implementing` | object | `implement.js preflight` (initial: `run`, `actor`, `at`, `analyzeFirst`; person: `run`, `actor`, `at`, `kind`, `analyzeFirst: false`, optional `pr`, optional `threads`); `ci-gate.js` (`run`, `actor`, `at`, `kind: 'ci-fix'`) | the running attempt. Removed by `publish` and `publishStopped`. A new run within the busy window refuses with `refuse-busy` |
| `implementing.threads` | array | `implement.js preflight` | for a `review` attempt: `{ id, commentId }` of each unresolved review thread the implementer sees, so `publish` replies only in those |
| `budgetFrom` | number | `implement.js preflight` (person attempts) | index in `attempts` where the CI loop budget (`AGENT_MAX_ATTEMPTS`) starts counting; `ci-gate.js` reads it |
| `attempts` | array | `implement.js publish`, `publishStopped`; `ci-gate.js` patches the last entry | one entry per attempt, see below |
| `branch` | string | `implement.js publish` | branch of the agent, set only once it exists on the remote (not after a dry run or a blocked attempt) |
| `pr` | number | `implement.js publish` | number of the pull request |
| `playbook` | string | `implement.js publish` | `bug-fix` or `task` |
| `forced` | boolean | `implement.js publish` | true once a `/agent implement force` overrode `ai:unsuitable`; stays true. `report.js` counts it |
| `retired` | array | `implement.js preflight` | `{ pr, branch }` of a closed pull request when a person starts fresh; the keys `branch`, `pr`, `ciGate`, `lastCiReport`, `e2eRerun`, `e2eReruns` are deleted at the same time |
| `ciGate` | object | `ci-gate.js` | `{ sha, decided: true, at, run }`: the CI gate decided once for this head commit |
| `lastCiReport` | string | `ci-gate.js` (red) | the CI report of the last red run; the next CI-fix attempt gets it as input; removed on green |
| `e2eRerun` | object | `ci-gate.js` | `{ sha, count }`: the free reruns used for the head commit `sha` (limit 1 per commit), for an E2E-only or a cancelled-only failure; the two share the budget. An old number field `e2eReruns` is ignored and deleted on write |
| `reruns` | array | `ci-gate.js rerun`, `ci-check.js` | one entry per `/agent rerun`, and per rerun that `/agent ci_check` made on a `flaky` or `infra` verdict: `{ at, actor, sha, runs, run }` (the commit, the workflow run ids that were rerun, and the URL of the workflow run of the command) |
| `stoppedBy` | string | `chat.js` (`stop`) | login that sent `/agent stop` |
| `stoppedAt` | string | `chat.js` (`stop`) | ISO time of the stop |

`stoppedBy` and `stoppedAt` are deleted when a person starts a new attempt (`markedPersonState`).

### Attempt entries (`attempts[]`)

Built by `attemptRecord` in `implement.js`:

| Field | Type | Meaning |
|---|---|---|
| `n` | number | attempt number, starting at 1 |
| `kind` | string | `initial`, `ci-fix`, `human`, or `review` (a second `initial` becomes `human`) |
| `actor` | string, optional | login of the person who asked |
| `run` | string | URL of the workflow run |
| `result` | string | from `implement.js`: `pr-opened`, `draft`, `blocked`, `unrelated`, `error`, `stopped`; `ci-gate.js` overwrites it with `ci-green` or `ci-red` once CI decides, and then keeps `unrelated: true` on an attempt that was `unrelated` |
| `rounds` | number | implement and check rounds used |
| `checks` | string or null | `green`, `red`, or `null` (no checks ran) |
| `selfReview` | string or null | effective verdict of the self-review: `approve` or `changes`, or `null` |
| `reason` | string, optional | blocked reason |
| `notes` | string | what was tried; for a failed attempt `The attempt failed: <message>` |
| `at` | string | ISO time |
| `signature` | string, optional | added by `ci-gate.js` on a red result: 12 hex characters of the SHA-1 of the failed check names and their first error lines. The same signature as the attempt before stops the loop (`same-failure`) |

### Pull request state fields

| Field | Type | Writer | Meaning |
|---|---|---|---|
| `schema`, `kind`, `number`, `phase`, `costs` | as above | `state.js`, `review.js` | `kind` is `pull`; `phase` stays `null` |
| `reviews` | array | `review.js` | one `{ sha, run, at, trigger }` per finished review (`trigger` is `auto` for a `pull_request` event and `command` for `/agent review`; an entry from before it existed has none and counts as automatic); a review skipped for its size adds `{ sha, run, at, trigger, skipped: 'size', lines, files }`; a failed review adds `{ sha, run, at, trigger, failed: true }` |
| `ciChecks` | array | `ci-check.js` | one `{ at, actor, sha, verdict, confidence, runs }` per finished `/agent ci_check` on a red CI; `verdict` and `confidence` are what the model said, and `runs` are the workflow runs that were rerun (empty when none). A failed call adds only its cost record |

`report.js` only reads states. `levels.js` and `route.js` read no model-written field except `phase` and `pr`
(`route.js`).

## Model output contracts

Defined in `SCHEMAS` of `tools/agent/lib/contract.js`. Every object is strict: all listed keys are required and no other
key is allowed (`additionalProperties: false`), except the `plan` object of `analysis`, which is strict too but may be
`null`. The model ends its answer with one fenced `json` block; the last block counts.

| Contract | Role | Check after validation |
|---|---|---|
| `review` | `pr-reviewer` | none |
| `verification` | `verifier` | none |
| `analysis` | `analyst` | `checkAnalysis` in `analyze.js` |
| `implementation` | `implementer` | `checkImplementation` in `implement.js` |
| `selfReview` | `self-reviewer` | `checkSelfReview` in `implement.js` |
| `chatAnswer` | `assistant` | none |
| `ciTriage` | `ci-triager` | `checkTriage` in `ci-check.js` |

### `review`

| Field | Type and limits |
|---|---|
| `summary` | string, at least 1 character |
| `risk` | `low`, `medium`, `high` |
| `riskReason` | string |
| `impact.modules` | array of strings |
| `impact.images` | array of strings |
| `impact.restApi` | `{ changed: boolean, breaking: boolean, notes: string }` |
| `impact.database` | `{ changed: boolean, breaking: boolean, notes: string }` |
| `impact.deploy` | `{ changed: boolean, notes: string }` |
| `impact.e2e` | `{ collections: string[], notes: string }` |
| `findings` | array, at most 30 items |
| `findings[].id`, `.file`, `.category` | string |
| `findings[].line` | integer or `null` |
| `findings[].severity` | `blocker`, `major`, `minor`, `nit` |
| `findings[].title`, `.body` | string, at least 1 character |

### `verification`

| Field | Type and limits |
|---|---|
| `verdicts` | array (no size limit) of `{ id: string, verdict: 'confirmed' or 'plausible' or 'rejected', reason: string }` |

### `analysis`

| Field | Type and limits |
|---|---|
| `verdict` | `suitable`, `unsuitable`, `needs-info` |
| `reason` | string, at least 1 character |
| `questions` | array of strings, at most 10 items |
| `plan` | `null` or an object with `modules` (string[]), `approach` (string, at least 1 character), `tests` (string), `risk` (`low`, `medium`, `high`) |

`checkAnalysis`: `needs-info` needs at least one non-blank question; `suitable` needs a non-null `plan`.

### `implementation`

| Field | Type and limits |
|---|---|
| `status` | `done`, `blocked`, `unrelated` |
| `summary` | string, at least 1 character |
| `commitType` | `fix`, `feat`, `perf`, `refactor`, `revert`, `build`, `chore`, `style`, `docs`, `test`, `ci` |
| `scope` | string (module name, or empty for several modules) |
| `title` | string, 1 to 72 characters |
| `verification`, `notes`, `blockedReason` | string; `blockedReason` explains `blocked` and `unrelated`, and is empty otherwise |

`checkImplementation(output, playbook, kind)`: the `bug-fix` playbook requires `commitType` `fix`; `status: blocked` and
`status: unrelated` require a non-blank `blockedReason`; `status: unrelated` is allowed only when `kind` is `ci-fix`.

### `selfReview`

| Field | Type and limits |
|---|---|
| `verdict` | `approve`, `changes` |
| `findings` | array, at most 20 items, each `{ severity: 'blocker' or 'major' or 'minor', file: string, line: integer or null, body: string (at least 1 character) }` |

`checkSelfReview`: `changes` needs at least one finding; `approve` cannot carry a `blocker`. `implement.js` also
treats `changes` with only `minor` findings as `approve` (`effectiveVerdict`).

### `chatAnswer`

| Field | Type and limits |
|---|---|
| `answer` | string, 1 to 6000 characters |

### `ciTriage`

| Field | Type and limits |
|---|---|
| `verdict` | `change`, `flaky`, `infra`, `unknown` |
| `confidence` | `low`, `medium`, `high` |
| `rootCause` | string, 1 to 2000 characters |
| `fixes` | array, at most 10 items, each `{ file: string, line: integer or null, what: string (at least 1 character) }`; may be empty |
| `evidence` | array, at most 10 strings of at most 300 characters each; may be empty |

`checkTriage`: `change` needs at least one fix. `effectiveVerdict` in `ci-check.js` treats `flaky` and `infra` with
`confidence` `low` as `unknown` for the rerun decision.

## Artifacts

Each job uploads `AGENT_OUT` (`$RUNNER_TEMP/agent`) with `if: always()` and a retention of 30 days. Nothing reads an
artifact back except `publish`, which downloads the one of `implement` in the same run. The files of a model call are
written by `lib/agent-call.js`: `<role><suffix>.jsonl` (the opencode events) and `<role><suffix>.final.md` (the last
text of the model). The token in `AGENT_PAT` never appears in an artifact.

| Artifact | Job | Files |
|---|---|---|
| `ai-autonomous-review-<number>-<attempt>` | `review` | `review-input.md`, `pr-reviewer.jsonl`, `pr-reviewer.final.md`, `verify-input.md`, `verifier.jsonl`, `verifier.final.md`, `summary.md` |
| `ai-autonomous-analysis-<number>-<attempt>` | `analyze` | `analysis-input.md`, `analyst.jsonl`, `analyst.final.md`, `summary.md` |
| `ai-autonomous-ci-gate-<number>-<attempt>` | `ci-gate` | `summary.md`, and `ci-report.md` for a red result |
| `ai-autonomous-rerun-<number>-<attempt>` | `rerun` | `reply.md`, and `summary.md` on the green path; may be empty |
| `ai-autonomous-ci-check-<number>-<attempt>` | `ci-check` | `ci-report.md` and `ci-check-input.md` for a red CI, `ci-triager.jsonl`, `ci-triager.final.md`, `reply.md` |
| `ai-autonomous-implement-<number>-<attempt>` | `implement` | `context.json`, the analysis files when the work step analyzed, `implement-input.md` and `implement-input-r<N>.md`, `implementer-r<N>.jsonl` and `.final.md`, `self-review-input.md` and `self-review-input-r<N>.md`, `self-reviewer-r<N>.jsonl` and `.final.md`, `branch.bundle`, `outcome.json` |
| `ai-autonomous-publish-<number>-<attempt>` | `publish` | `summary.md` |
| `ai-autonomous-stop-<number>-<attempt>` | `stop` | `reply.md` |
| `ai-autonomous-chat-<number>-<attempt>` | `chat` | `chat-input.md`, `assistant.jsonl`, `assistant.final.md` (a question), `reply.md` |

`<attempt>` is `github.run_attempt`. The fields of `context.json` and `outcome.json` are in
[`tools/agent/implement.js`](#toolsagentimplementjs).

## Tests

The tests use the Node.js test runner and no other dependency. Run them from the repository root:

```bash
node --test "tools/agent/**/*.test.js"
```

`pnpm test:tools` runs them with the tests of `tools/release` and `tools/ci`. There are 36 test files: 20 next to the
scripts and 16 next to the library modules.

- `<script>.test.js` and `lib/<module>.test.js` test the pure functions.
- `<script>.main.test.js` run a whole `main` over fake GitHub, Git, and opencode clients (`analyze`, `chat`, `ci-check`,
  `ci-gate`, `implement`, `report`; `review` for the size skip only). `route.analysis.test.js`, `route.chat.test.js`,
  `route.ci.test.js`, and `route.sweep.test.js` cover the routing of each phase.
- `tools/agent/fixtures/` holds 30 recorded event payloads, one per case, named `<event>.<case>.json`, for example
  `issue_comment.implement-force.json`, `pull_request.fork.json`, and `workflow_run.completed.human.json`.
- `lib/facts.test.js` needs the `yaml` package, which a checkout gets with `node_modules`
  (see [the `yaml` package](#the-yaml-package)).

Test data must not look like a secret or an e-mail address: the CyberFerret pre-commit hook rejects such commits.
