# AI Autonomous agent

An AI agent that runs in GitHub Actions, reviews pull requests, implements issues, and talks to you through `/agent`
comments. It is a proof of concept; the design is in [the internal docs](../internal/autonomous-agent/design.md).

## What it does now

- **Reviews a pull request** when the pull request opens outside draft, or when it leaves draft for the first time,
  whoever its author is. It posts one comment with the impact (modules, images, REST contract, database, deployment,
  E2E, risk) and inline comments on the lines it has findings for, and adds the label `agent:pr-reviewed`. A second
  model checks every finding first: it drops the ones it rejects and marks the ones it cannot confirm as "plausible,
  not confirmed". A pull request from a fork is reviewed only on request.
- **Skips a huge diff.** A review of a diff above `AGENT_REVIEW_MAX_LINES` changed lines (default 5000) or
  `AGENT_REVIEW_MAX_FILES` files (default 150) costs much and finds little, so the agent makes no model call. Lock
  files (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `go.sum`, `go.work.sum`) are not counted. The agent
  says so in its comment, and `/agent review force` reviews the pull request anyway.
- **Reviews again on request:** comment `/agent review` on the pull request. This also works for a pull request from
  a fork. Text after the command tells the reviewer what to look at, for example `/agent review check the migration`.
  Start the text with `force` to review a diff above the size limit.
- **Assesses every new `Bug` and `Task` issue**, whoever its author is, and sets `ai:suitable` or `ai:unsuitable`,
  with the reason and, for a suitable issue, a short plan in its comment on the issue. People keep editing a new issue
  for a while, so the agent waits for the grace period `AGENT_ANALYSIS_GRACE_MINUTES` (default 30) and then picks the
  issue up in a sweep that runs every 10 minutes. It analyzes at most 5 issues per sweep. The sweep needs
  `AGENT_DRY_RUN=false`: a dry-run analysis writes no state, so the same issues would come up again and again. In dry
  run the sweep does nothing; comment `/agent analyze` to try the analysis. When the issue lacks
  information, it asks the author and sets `agent:needs-human`; the author's answer in a comment, or an edit of the
  issue, starts the analysis again at once. Comment `/agent analyze` to run it again yourself. The agent never changes
  an `ai:*` label that a person set.
- **Caps its automatic work.** In any 24 hours the agent starts at most `AGENT_DAILY_ANALYSES` analyses of new issues
  (default 10) and `AGENT_DAILY_REVIEWS` reviews of new pull requests (default 15), so a flood of issues or pull
  requests cannot run up a bill. Commands, answers of an author, and edits do not count and are never capped. The job
  summary says why a skipped run did nothing; an issue over the cap stays in line for a later sweep, and a pull
  request over the cap gets a review on `/agent review`. A review that failed after its model calls counts too, because
  it cost money; the failure comment tells you to comment `/agent review`, and a pull request that left draft with
  such a review is not reviewed again on its own.
- **Implements a `Bug` or `Task` issue** on request, up to a pull request. See
  [Implement an issue](#implement-an-issue).
- **Talks with you** in comments that start with `/agent`: it answers questions, shows what the AI calls cost,
  stops its work, retries with your guidance, and changes its pull request on request. See [Commands](#commands).
- **Copies the execution level** (`ai:l0-assistant` to `ai:l3-autonomous`) of a merged pull request to the issues it
  closes. When several merged pull requests close one issue, the issue gets the lowest level. A merged pull request
  without a level gets a reminder comment. This is the workflow `AI Autonomous: Execution levels`.
- **Reports weekly** on the progress toward autonomy. See [Weekly report](#weekly-report).

The agent never approves or requests changes; its review is a comment. The review comment ends with what the AI calls
on the pull request have cost so far. Dependabot pull requests are never reviewed, also not with `/agent review`: a
dependency bump has nothing to review, and a review costs money. The only command the agent takes on a Dependabot pull
request is `/agent ci_check`.

Who can use it: anyone who opens a pull request or a `Bug` or `Task` issue gets the automatic review and the automatic
analysis. A command, an answer to a hand-off, and an implementation need a user with write access to the repository,
and, while `AGENT_ALLOWED_ACTORS` is set, only the users it names. The agent ignores comments of everyone else and of
bots.

## Commands

A command is a comment whose first non-empty line starts with `/agent`. Only a user with write access can give one, and
only the users in `AGENT_ALLOWED_ACTORS` while it is set. The agent ignores bots and Dependabot pull requests, except
for `/agent ci_check` on a Dependabot pull request. It reacts to your comment with an eyes emoji when it starts, then
with a rocket when it ends well or a confused face when it refuses or fails.

| Command | Where | What happens |
|---|---|---|
| `/agent` or `/agent help` | issue or pull request | The agent lists the commands that work there. |
| `/agent cost` | issue or pull request | The agent shows the cost table. |
| `/agent stop` | issue or pull request of the agent | The agent stops its work on the issue. |
| `/agent retry [notes]` | issue or pull request of the agent | A new attempt with a fresh budget; the notes are guidance. |
| `/agent rerun [notes]` | issue or pull request of the agent | Reruns the failed CI checks; no new attempt, no model. |
| `/agent ci_check [notes]` | pull request | Finds the root cause of a red CI; reruns the failed jobs when it is flaky or an outage. |
| `/agent <question>` | issue, or pull request of a person | The assistant answers in a comment and changes nothing. |
| `/agent <text>` | pull request of the agent | A change request: one attempt on the branch of the pull request. |
| a comment without `/agent` | issue or pull request of the agent that waits for a person | The comment answers the hand-off. |
| a review with change requests | pull request of the agent | One attempt over the unresolved review threads. |
| `/agent review [notes]` | pull request | The agent reviews again. `/agent review force` also reviews a diff above the size limit. |
| `/agent analyze` | `Bug` or `Task` issue | The agent assesses the issue again. |
| `/agent implement [notes]` | `Bug` or `Task` issue | See [Implement an issue](#implement-an-issue). |

### One command at a time

The agent works on one command at a time per issue or pull request. The title of every run of the workflow ends with
the number of the issue or pull request it is about. When you comment a command that starts a worker job (`review`,
`analyze`, `implement`, `retry`, `rerun`, `ci_check`, a question, an answer to a hand-off, or a change request in a
review) and an older run of the workflow still works on the same number, the agent declines it:

- It posts one comment where you wrote the command: "I am already working on the number, with a link to the run, so I
  did not start the command. Comment it again when that run ends." It reacts to your comment with a confused face.
- An issue and the pull request of the agent that implements it are one piece of work. A run on the pull request
  blocks a command on its issue (the agent reads the pull request from the state of the issue), and a run on the issue
  blocks a command on its pull request. One gap remains: the run of the CI gate for a push may carry no pull request
  number in its title, so a command that arrives while only that run is active is not declined. The concurrency group
  of the number then keeps the writes in order.
- When several commands arrive at about the same time, the first comment wins and the others are declined. The router
  cannot yet tell whether an older run will skip your command, so a decline in that window costs a retry, never a
  double run.
- `/agent stop`, `/agent help`, and `/agent cost` are never declined. Neither are the automatic reviews, analyses, and
  CI gate runs; the concurrency group of each number still keeps their writes in order.
- With `AGENT_DRY_RUN` on, nothing is posted. The job summary shows the comment that the agent would post.

### Questions

`/agent <question>` starts the assistant. It uses the light model, reads the issue or pull request, its last 20
comments, a short summary of what the agent did, and the code. For a pull request it also reads the diff of the pull
request, which it fetches but never checks out. It cannot edit files or run anything but read-only Git commands. The
answer is a reply that starts with a mention of you and ends with its cost. Mentions inside the answer are defused, so
the answer notifies nobody else.

### Cost

`/agent cost` replies with a table of the AI calls: date, flow, role, model, uncached, cached, and output tokens, and
the cost in USD. Below it come the totals per flow and the grand total. On an issue it covers the issue and its pull
request. On a pull request it covers the pull request and, for a pull request of the agent, its issue. The table shows
the last 50 calls and says how many older ones it left out; the totals always cover all of them. The numbers are
estimates from the price table of opencode. The OpenAI bill is the authority.

### Stop

`/agent stop` writes the phase `stopped` to the state of the issue, cancels the workflow run of a running attempt,
removes `agent:needs-human`, and replies with what it stopped. The cancelled attempt records its cost and ends as
`stopped`: it pushes nothing and posts nothing. The CI gate ignores a stopped issue: when you stop the work while the
gate reads the checks, the gate finds the new phase before it writes anything and exits. To start again, comment
`/agent implement` on the issue, or `/agent retry`.

A stop runs at once. It has its own job without a concurrency group, so it never waits behind an answer of the
assistant or another agent job of the same number, and a later comment cannot replace it.

### Retry, answers, and change requests

These start one attempt that a person asked for. They skip the refusals about suitability (`ai:unsuitable`, open
questions of the analysis), because you explicitly asked to go on. They still refuse when an attempt is running,
and when the issue is closed or is not a `Bug` or a `Task`.

- **`/agent retry [notes]`** continues the pull request of the earlier attempt when it is open. When that pull request
  is closed or merged, the attempt starts a new branch (the old name with `-v2` if it is still taken) and a new pull
  request. The notes reach the implementer as "The maintainer's guidance".
- **An answer.** When the agent hands over (`agent:needs-human` after a blocked, draft, or failed attempt, or after a
  red CI), the first comment of a person with write access, with or without `/agent`, resumes the flow. The whole
  comment is the guidance. A second comment while the attempt runs changes nothing.
- **A change request.** `/agent <text>` on a pull request of the agent makes one attempt on its branch with the text
  as guidance. It needs a branch that an earlier attempt pushed and an open pull request.
- **A fresh budget.** Each of these attempts gives the CI loop a fresh budget of `AGENT_MAX_ATTEMPTS`. The attempt
  itself does not count against it.

### Rerun CI

`/agent rerun` is the way on when CI is red for a reason the change does not cause, such as a flaky test or an outage.
It checks the CI of the pull request of the agent again: it reruns the failed checks of the head commit and puts the
issue back to waiting for CI, so the [CI gate](#the-ci-loop) decides when they end. It is not an attempt and calls no
model, so it costs nothing and does not touch the attempt budget. Any text after the command is ignored.

- It removes `agent:needs-human` from the issue and the pull request, and it records the request in the state.
- It replies and refuses, with a confused face, when there is no pull request of the agent to rerun CI for, when an
  attempt is running (a record older than two hours counts as dead), when the work is stopped, when the pull request
  is not open, or when the only failed checks are commit statuses or checks of another app, which the agent cannot
  rerun.
- When the checks still run, it only hands the decision back to the gate. When they are all green, it takes the gate's
  green path: the pull request leaves draft, gets its labels, and the issue is `completed`.
- A missing verdict check `ci-ok` is not a running CI. With failed checks, the command reruns them as usual. When
  nothing failed and `ci-ok` is missing, the reply says that no CI verdict is reported for the head commit (CI may
  wait for an approval of the workflows of a fork), instead of "CI still runs".
- Cancelled checks are rerun like failed ones.
- It runs in its own job `rerun`, which holds `AGENT_PAT` only to take a green pull request out of draft.

### CI check

`/agent ci_check [notes]` answers the question "why is CI red here?" on any pull request, also one from a fork. The
notes tell the triager what to look at. The agent reads the checks of the head commit, and what follows depends on
what it finds:

- **CI still runs.** The reply lists the checks that run. Ask again when they end. No model call. A cancelled check
  does not count as running: it is finished, and it is handled as a failed check (see below).
- **No CI verdict.** Nothing failed, but the verdict check `ci-ok` is not reported for the head commit, for example
  because CI waits for an approval of the workflows of a fork. The reply says so. No model call. When checks failed,
  the missing `ci-ok` is ignored and the command goes on with the failed checks.
- **CI is green.** The reply says so and names the commit. No model call.
- **No check at all.** The reply says so. No model call.
- **CI is red.** The agent collects the failed jobs and their logs, cleaned the same way as for the
  [CI gate](#the-ci-loop), and asks the `ci-triager` (model `AGENT_MODEL_TRIAGE`, read-only) for the root cause. The
  reply gives the verdict, the root cause, where to fix it (file, line, and what to change), the evidence from the
  logs, and what the agent did.

A cancelled check (stopped by a timeout, a person, or a newer run) is part of the failed checks. It has no failure of
its own, so the input of the triager marks it, and on its own it is `infra` or `unknown`, never `change`. A rerun of the
failed jobs reruns the cancelled ones too.

The verdict is one of four:

| Verdict | Meaning | What the agent does |
|---|---|---|
| `change` | The failure comes from this change. | Nothing. On the pull request of the agent it suggests `/agent retry` with this guidance. |
| `flaky` | A flaky test, not caused by the change. | Reruns the failed jobs. |
| `infra` | A network, registry, or runner problem. | Reruns the failed jobs. |
| `unknown` | The evidence does not settle it. | Nothing. It suggests `/agent rerun` on the pull request of the agent, and a rerun from the Actions page elsewhere. |

A `flaky` or `infra` verdict with low confidence counts as `unknown`: the agent does not rerun on a guess, and the
reply says so. A `change` verdict always names at least one place to fix.

- On the pull request of the agent, when its issue waits for a person (`agent:needs-human`) or for CI, an accepted
  rerun also puts the issue back to waiting for CI and removes `agent:needs-human`, as `/agent rerun` does, so the
  CI gate decides again when the checks end. In any other phase the state stays as it is.
- When GitHub rejects the rerun, the reply says so and nothing else changes. The reaction is a confused face.
- The cost of the call goes to the state of the pull request (flow `ci-check`), also when the call fails, together
  with a record of the check in `ciChecks`. `/agent cost` shows it.
- When the triager fails or breaks its answer contract, the reply says "I could not finish the CI check", and the job
  fails.
- The CI report is the output of code under test, so the triager reads it as untrusted data. It reads the diff of the
  pull request, which the job fetches but never checks out.
- It runs in its own job `ci-check`. Its concurrency group is the one of the issue for a pull request of the agent,
  else the one of the pull request, so it never writes a state comment at the same time as another job.

### Reviews with change requests

When a person with write access submits a review with the state "changes requested" on a pull request of the agent,
the agent makes one attempt. The implementer gets the review text and the unresolved review threads (file, line, and
the conversation), at most 30 of them; the prompt says how many more were left out. After the push, the agent replies
once in each thread the implementer saw, with the short commit id, and in no other. It never resolves a thread: a
person does. The title and the description of the pull request stay, and the pull request goes back to a draft when
the new result is not green.

## Implement an issue

Comment `/agent implement` on a `Bug` or `Task` issue. `/agent fix` does the same. The agent runs one attempt and ends
with a pull request into `develop`. Text after the command, on the same line or below it, goes to the implementer as
guidance, for example `/agent implement the bug is in the changelog builder, not in the parser`.

When the agent refuses, it answers in a comment that mentions you and says why:

| Situation | The agent says |
|---|---|
| The issue is not a `Bug` or a `Task` | it implements these two types only |
| An implementation is already running | where the running attempt is |
| The issue has `ai:unsuitable` | the reasons of the analysis, or that a person set the label, and how to force it |
| The analysis still has open questions | the questions; answer them or edit the issue, then ask again |

### Force

`/agent implement force` starts the work on an issue that has `ai:unsuitable`. The label stays, because it describes
the issue and not the outcome. The state records that the attempt was forced, so the reports can show how often a
forced attempt succeeds. `force` has no effect on the other refusals.

### What the agent does

1. Analyzes the issue again when it changed since the last analysis. A `needs-info` or `unsuitable` result stops the
   run with the same reply as above.
2. Creates the branch `bugfix/<issue>-<slug>` for a `Bug` or `feature/<issue>-<slug>` for a `Task` from `develop`. A
   later attempt continues the branch of the earlier one.
3. Implements the change with the playbook for the issue type: `apihub-bug-fix` or `apihub-task`. It commits as the
   owner of `AGENT_PAT`, so the CLA check knows the author.
4. Runs the affected builds and tests of the whole pull request (`nx affected -t build test`, from the branch
   point of the pull request). A change under `tools/` also runs `pnpm test:tools`.
5. Asks a second model to review the change against the issue.
6. Repeats steps 3 to 5 while a check fails or the review asks for changes, up to `AGENT_MAX_REVIEW_ROUNDS` rounds
   (default 2). Minor findings alone do not count as a request for changes.
7. Stops at once when the change grows past 20 files or 600 changed lines (`Bug`), or 30 files or 1,000 changed lines
   (`Task`).
8. Hands the commits to the `publish` job, which pushes one Conventional Commit with a `Closes #<issue>.` line and
   an `Agent-Run:` trailer, then opens the pull request with the sections of the pull request template.

### What it posts

- **A comment on the issue** that the agent keeps up to date. It shows the outcome, what was tried, what is open, and
  what the AI calls of the issue have cost so far.
- **A pull request into `develop`.** It always opens as a draft. Its description gives the result of the local checks
  and of the self-review, labeled as reported by the work job, and lists the failing checks and the open findings
  when there are any. The CI gate takes it out of draft after the checks on GitHub are green, and only then.
- **The label `agent:needs-human`** on the issue when the pull request is a draft or when the agent could not finish.
  A green result removes the label.
- **A short comment that mentions you** when the result is a draft, a block, or an error, because an edit of the
  state comment notifies nobody.

The agent blocks, and pushes nothing, when the implementer reports that it cannot continue, when the working tree has
no changes, or when the change is too large. The reason is in the comment on the issue.

A person merges the pull request. The agent never merges.

A later attempt on an issue that already has an open pull request updates that pull request: it gets the new title and
description. A ready pull request goes back to a draft when the new result is not green; `publish` never marks a
pull request ready.

### Two jobs, so that model code never sees a token

The tests of the change run code that the model wrote, as the same user as the agent's scripts. A GitHub token in the
environment of such a step could be read by that code. So the attempt runs in two jobs:

- **`implement`** (the work job) holds only the OpenAI key. Its preflight step has the workflow token and `AGENT_PAT`,
  because no model code has run yet; it checks the issue, marks the state, and saves the issue, its comments, and the
  Git identity of the `AGENT_PAT` owner to a file. The `work` step then runs the analysis when needed, the
  implementer, the local checks, and the self-review without any GitHub access. It writes `outcome.json` and a Git
  bundle of the commits, and the job uploads them as an artifact.
- **`publish`** holds `GITHUB_TOKEN` and `AGENT_PAT` and runs no model and no repository code. It downloads the
  artifact, checks the outcome (the branch must be the one it derives itself from the state, and the answers must
  match their contracts), and measures the diff of the commits in the bundle itself, from the branch point. The diff
  size limit and the protected paths (workflow files, the agent's own instructions and tools) apply again to that
  diff, whatever the outcome says; a violation means no push, a blocked attempt, and `agent:needs-human`. Then it
  pushes the bundle, opens or updates the pull request as a draft, and writes the state, the labels, and the
  comments. When the work job crashed or timed out and left no outcome, `publish` records the failure and the costs it
  can find in the event files, sets `agent:needs-human`, and tells you.

The OpenAI key itself stays reachable by the code under test in the work job. That is accepted for the proof of
concept: give the key its own OpenAI project and set a budget on that project.

## The CI loop

After the push, CI runs on the pull request as for any other. The workflow `AI Autonomous: Agent` also starts when
`CI`, `Lint: Code base`, `PR: Title`, `PR: Commit messages`, `Lint: Markdown links`, or `PR: CLA` finishes, so the end
of the CLA check wakes the gate. The gate treats the CLA status like any other status and does not require it to
exist. For a branch that belongs to an open pull request of the agent, whose issue waits for CI at this very commit,
the `ci-gate` job decides. It acts only for the head commit of the pull request, and it ignores pull requests from
forks.

1. **It waits.** The gate reads every check run and every commit status of the head commit (the CLA check reports as a
   status). While any is still running or pending, it exits; the workflow run that finishes last decides. The agent's
   own jobs do not count. A cancelled check has finished, so the gate does not wait for it: it counts as failed.
2. **It decides once** per commit. A second workflow run of the same commit changes nothing. Right before it writes
   anything, the gate reads the pull request and the state again. When a newer commit is on the branch, it writes
   nothing and exits as `superseded`; the checks of the newer commit start their own gate run. When the issue is no
   longer in the phase `waiting-ci` (for example after `/agent stop`), it writes nothing and exits as `state-changed`.
3. **Green:** every check succeeded, was neutral, or was skipped. The pull request leaves draft (the gate is the only
   place where that happens), gets `agent:completed` and `ai:l1-executor`, and the issue gets `agent:completed`.
   `agent:needs-human` goes away from both. The agent comments on the issue and mentions the person who asked: a
   person reviews and merges the pull request.
4. **Red:** the gate reads the logs of the failed jobs, cuts them to the error blocks, and builds a CI report of at
   most 12,000 characters. Its failure signature is a hash of the failed check names and the first normalized error
   lines, so timestamps, run IDs, and durations do not change it. Cancelled checks are left out of the hash when any
   other check failed, so a changing set of cancelled checks does not make the same failure look new.
5. **One free rerun per commit.** When every failed check is an E2E job, or every failed check is cancelled, the gate
   reruns the failed jobs once for that head commit and decides on the result of the rerun. Both cases share that one
   rerun. A new commit gets its own free rerun. E2E jobs flake more than the rest, and a cancelled check (a timeout, a
   person, a newer run) has no failure of its own. The verdict check `ci-ok` of `ci.yml` fails together with them, so
   it does not count: a red result of E2E jobs and `ci-ok` is still an E2E-only failure. The gate reruns the workflow
   runs of all failed checks, including the run of `ci-ok`, which depends on the other jobs. Cancelled checks together
   with a really failed check are a normal red result. When the free rerun is used up (or no run can be rerun) and
   only cancelled checks remain, nothing failed, so the agent does not start a CI fix: it hands over as in the next
   step, saying that the checks were cancelled again, and `/agent rerun` is the way on. In any other red result the
   stop rule below decides.
6. **The stop rule.** The agent stops, sets `agent:needs-human` on the issue and the pull request, and hands over when
   the failure has the same signature as the attempt before (the same fix twice would only spend money), or when
   `AGENT_MAX_ATTEMPTS` attempts are spent (default 3, counting the first attempt and every CI fix). The state comment
   lists every attempt with its result, signature, and notes, and shows the current failure. See
   [What a hand-off says](#what-a-hand-off-says).
7. **Otherwise the next attempt starts.** The `implement` job runs a CI fix: it continues the branch of the pull
   request, reads the CI report, adds one new commit, and pushes without force. The local checks, the self-review, the
   diff size limit, and the workflow-file block apply to the whole pull request, measured from its branch point. A
   green result moves the issue back to waiting for CI; anything else is a draft and `agent:needs-human`.
8. **The CI fix may find that the change is not the cause.** When the CI report shows a flaky or infrastructure
   failure, or a test that the change does not touch, the implementer answers `unrelated` with its evidence and
   changes no code. The agent then pushes nothing: it reruns the failed checks, puts the issue back to waiting for CI,
   removes `agent:needs-human` from the issue, and comments on the pull request, without a mention, which checks
   failed and why it thinks the change does not cause it. The attempt counts toward `AGENT_MAX_ATTEMPTS`, so a flake
   loop ends, and a rerun that fails the same way ends by the stop rule. When no failed check can be rerun, the
   agent hands over as for a blocked attempt.

The log excerpts in the CI report leave out the echo of the step scripts that Actions prints before each step, so a
command such as `echo "::error::..."` in a workflow does not look like a failure.

### What a hand-off says

When the agent hands over on a red CI, after the stop rule or after a blocked CI fix, the comment lists, in this order:
the failed checks (at most five, then "and N more"), the first error line of the first failed check, and the reason of
the agent. It then offers two ways on:

- If the failure is not caused by the change, comment `/agent rerun`: it reruns the failed checks, with no new attempt
  and no model cost.
- To try another fix, comment `/agent retry` with guidance (see
  [Retry, answers, and change requests](#retry-answers-and-change-requests)).

In dry-run the gate writes its decision to the job summary and starts no attempt.

Who can use it: a user with write access to the repository, and, while `AGENT_ALLOWED_ACTORS` is set, only the users
it names. While `AGENT_DRY_RUN` is not `false`, the agent runs the whole attempt on the runner but does not push, open
a pull request, label, or comment. The job summary shows the commit message, the pull request description, the labels,
the state, and the start of the diff.

## Weekly report

The workflow `AI Autonomous: Weekly report` runs on Mondays at 06:00 UTC, and on demand with an optional `days`
input. It uses no model and costs nothing. It counts, for the last `AGENT_REPORT_DAYS` days (default 7):

- the `Bug` and `Task` issues created, and how many are `ai:suitable`, `ai:unsuitable`, or not assessed yet;
- the pull requests merged, by execution level and with the share of each level;
- the pull requests the agent opened, and how many are `agent:completed`, draft or `agent:needs-human`, or merged;
- the pull requests the agent reviewed;
- the attempts by result, and how many were forced;
- the AI calls and their estimated cost, by flow and by model, from the state comments.

The report shows numbers only. It always goes to the job summary. When `AGENT_REPORT_ISSUE` names an issue and
`AGENT_DRY_RUN` is `false`, it is also posted there as a new comment. A forced attempt is an attempt on an issue that
a person forced; the state keeps one flag per issue, so all its attempts count as forced.

## Settings

The workflow is [`ai-autonomous-agent.yml`](../../.github/workflows/ai-autonomous-agent.yml) (`AI Autonomous: Agent`);
the scripts are in [`tools/agent/`](../../tools/agent/).

| Name | Kind | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | secret | the OpenAI key of every model call |
| `AGENT_PAT` | secret | gives the Git identity, pushes the branch, opens and updates the pull request, and takes it out of draft; held by the preflight, `publish`, and `ci-gate` only; fine-grained, Contents and Pull requests read and write, no Workflows |
| `AGENT_ENABLED` | variable | `true` to act; anything else makes every run a no-op, and the 10-minute schedule starts no runner |
| `AGENT_DRY_RUN` | variable | `false` to write to GitHub; otherwise the agent writes its comments to the job summary only, and the sweep of new issues does nothing |
| `AGENT_ALLOWED_ACTORS` | variable or secret | comma-separated logins the agent answers; empty means everyone with write access; it limits commands, answers, and implementation, not the automatic analysis and review |
| `AGENT_MODEL_REVIEW`, `AGENT_MODEL_VERIFY`, `AGENT_MODEL_IMPLEMENT`, `AGENT_MODEL_LIGHT`, `AGENT_MODEL_TRIAGE` | variables | `provider/model:variant`, for example `openai/gpt-6-luna:max`; defaults in `tools/agent/lib/config.js` |
| `AGENT_MAX_ATTEMPTS` | variable | attempts per issue before the agent hands over on red CI (default 3): the first attempt and every CI fix; a retry, an answer, a change request, or a review starts a fresh count |
| `AGENT_MAX_ANALYSES` | variable | analyses per issue started by edits and answers (default 5); `/agent analyze` is not counted |
| `AGENT_ANALYSIS_GRACE_MINUTES` | variable | minutes a new `Bug` or `Task` issue waits before the sweep analyzes it (default 30); `0` analyzes it at once, on the event |
| `AGENT_REVIEW_MAX_LINES`, `AGENT_REVIEW_MAX_FILES` | variables | the largest diff the agent reviews on its own: changed lines (default 5000) and files (default 150), lock files not counted; `/agent review force` goes beyond |
| `AGENT_DAILY_ANALYSES`, `AGENT_DAILY_REVIEWS` | variables | automatic analyses (default 10) and reviews (default 15) in the last 24 hours; commands are not counted |
| `AGENT_REPORT_ISSUE` | variable | the number of the issue that gets the weekly report as a comment; empty means the job summary only |
| `AGENT_REPORT_DAYS` | variable | the length of the weekly report period in days (default 7); the `days` input of a manual run overrides it |
| `AGENT_LOG_LEVEL` | variable | opencode's own log level in the job log: `DEBUG`, `INFO` (default), `WARN`, or `ERROR` |

The review model and the implement model must differ: the agent refuses to start otherwise. `AGENT_MODEL_TRIAGE` is the
model of `/agent ci_check`; its default is `openai/gpt-6.1-sol:medium`.

## When something goes wrong

Open the run from the link in the agent's comment. The job log shows each stage in a collapsible group with its
duration, every decision with its reason, and every step of each model call as it happens: the tools it used, the
tokens and cost of each step, and its answers. The job also uploads an artifact with the prompt inputs, the opencode
event stream of each model call, and the final answers. A review that fails says so in the review comment; comment
`/agent review` to try again. A failed implementation says so in its comment on the issue. The same job log shows the
local commands and their output. The token in `AGENT_PAT` never appears in the log, the comments, or the artifacts.
