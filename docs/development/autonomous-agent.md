# AI Autonomous agent

An AI agent that runs in GitHub Actions, reviews pull requests, implements issues, and talks to you through `/agent`
comments. It is a proof of concept; the design is in [the internal docs](../internal/autonomous-agent/design.md).

## What it does now

- **Reviews a pull request** when the pull request opens outside draft, or when it leaves draft for the first time.
  It posts one comment with the impact (modules, images, REST contract, database, deployment, E2E, risk) and inline
  comments on the lines it has findings for, and adds the label `agent:pr-reviewed`. A second model checks every
  finding first: it drops the ones it rejects and marks the ones it cannot confirm as "plausible, not confirmed".
- **Reviews again on request:** comment `/agent review` on the pull request. This also works for a pull request from
  a fork. Text after the command tells the reviewer what to look at, for example `/agent review check the migration`.
- **Assesses every new `Bug` and `Task` issue** and sets `ai:suitable` or `ai:unsuitable`, with the reason and, for a
  suitable issue, a short plan in its comment on the issue. When the issue lacks information, it asks the author and
  sets `agent:needs-human`; the author's answer in a comment, or an edit of the issue, starts the analysis again.
  Comment `/agent analyze` to run it again yourself. The agent never changes an `ai:*` label that a person set.
- **Implements a `Bug` or `Task` issue** on request, up to a pull request. See
  [Implement an issue](#implement-an-issue).
- **Copies the execution level** (`ai:l0-assistant` to `ai:l3-autonomous`) of a merged pull request to the issues it
  closes. When several merged pull requests close one issue, the issue gets the lowest level. A merged pull request
  without a level gets a reminder comment. This is the workflow `AI Autonomous: Execution levels`.

The agent never approves or requests changes; its review is a comment. The review comment ends with what the AI calls
on the pull request have cost so far. Dependabot pull requests are never reviewed, also not with `/agent review`: a
dependency bump has nothing to review, and a review costs money.

Who can use it: a user with write access to the repository, and, while `AGENT_ALLOWED_ACTORS` is set, only the users
it names. The agent ignores comments of everyone else and of bots.

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
4. Runs the affected builds and tests of the whole repository (`nx affected -t build test`).
5. Asks a second model to review the change against the issue.
6. Repeats steps 3 to 5 while a check fails or the review asks for changes, up to `AGENT_MAX_REVIEW_ROUNDS` rounds
   (default 2). Minor findings alone do not count as a request for changes.
7. Stops at once when the change grows past 20 files or 600 changed lines (`Bug`), or 30 files or 1,000 changed lines
   (`Task`).
8. Pushes one Conventional Commit with a `Closes #<issue>.` line and an `Agent-Run:` trailer, then opens the pull
   request with the sections of the pull request template.

### What it posts

- **A comment on the issue** that the agent keeps up to date. It shows the outcome, what was tried, what is open, and
  what the AI calls of the issue have cost so far.
- **A pull request into `develop`.** It is ready for review when the local checks pass and the second model approves.
  Otherwise it is a draft, and its description lists the failing checks and the open findings.
- **The label `agent:needs-human`** on the issue when the pull request is a draft or when the agent could not finish.
  A green result removes the label.
- **A short comment that mentions you** when the result is a draft, a block, or an error, because an edit of the
  state comment notifies nobody.

The agent blocks, and pushes nothing, when the implementer reports that it cannot continue, when the working tree has
no changes, or when the change is too large. The reason is in the comment on the issue.

After the push, CI runs on the pull request as for any other. The agent does not wait for CI and does not react to a
red result yet: fix it yourself or comment `/agent implement` with guidance for another attempt. A person merges the
pull request.

Who can use it: a user with write access to the repository, and, while `AGENT_ALLOWED_ACTORS` is set, only the users
it names. While `AGENT_DRY_RUN` is not `false`, the agent runs the whole attempt on the runner but does not push, open
a pull request, label, or comment. The job summary shows the commit message, the pull request description, the labels,
the state, and the start of the diff.

## Settings

The workflow is [`ai-autonomous-agent.yml`](../../.github/workflows/ai-autonomous-agent.yml) (`AI Autonomous: Agent`);
the scripts are in [`tools/agent/`](../../tools/agent/).

| Name | Kind | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | secret | the OpenAI key of every model call |
| `AGENT_PAT` | secret | pushes the branch and opens the pull request of `/agent implement`; fine-grained, Contents and Pull requests read and write, no Workflows |
| `AGENT_ENABLED` | variable | `true` to act; anything else makes every run a no-op |
| `AGENT_DRY_RUN` | variable | `false` to write to GitHub; otherwise the agent writes its comments to the job summary only |
| `AGENT_ALLOWED_ACTORS` | variable or secret | comma-separated logins the agent answers; empty means everyone with write access |
| `AGENT_MODEL_REVIEW`, `AGENT_MODEL_VERIFY`, `AGENT_MODEL_IMPLEMENT`, `AGENT_MODEL_LIGHT` | variables | `provider/model:variant`, for example `openai/gpt-6-luna:max`; defaults in `tools/agent/lib/config.js` |
| `AGENT_MAX_ANALYSES` | variable | analyses per issue started by edits and answers (default 5); `/agent analyze` is not counted |
| `AGENT_LOG_LEVEL` | variable | opencode's own log level in the job log: `DEBUG`, `INFO` (default), `WARN`, or `ERROR` |

The review model and the implement model must differ: the agent refuses to start otherwise.

## When something goes wrong

Open the run from the link in the agent's comment. The job log shows each stage in a collapsible group with its
duration, every decision with its reason, and every step of each model call as it happens: the tools it used, the
tokens and cost of each step, and its answers. The job also uploads an artifact with the prompt inputs, the opencode
event stream of each model call, and the final answers. A review that fails says so in the review comment; comment
`/agent review` to try again. A failed implementation says so in its comment on the issue. The same job log shows the
local commands and their output. The token in `AGENT_PAT` never appears in the log, the comments, or the artifact.
