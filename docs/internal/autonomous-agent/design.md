# Autonomous agent: design

Status: draft for review, revision 3 of October 23, 2026. Owner: @alagishev. The implementation plan is in
[plan.md](./plan.md).

An AI agent that runs in GitHub Actions on an OpenAI API key. It reviews pull requests, assesses new bugs and tasks,
implements them on request, and talks to people through issue and pull request comments. It drives itself by the
labels of the [AI tasks labeling framework](#labels) and uses the skills, rules, and `AGENTS.md` files the repository
already has.

## Contents

- [Scope](#scope)
- [Decisions at a glance](#decisions-at-a-glance)
- [Engine](#engine)
- [Architecture](#architecture)
- [Models](#models)
- [GitHub identity](#github-identity)
- [Flow A: pull request review and impact](#flow-a-pull-request-review-and-impact)
- [Flow B: issue analysis](#flow-b-issue-analysis)
- [Flow C: implementation of a bug or a task](#flow-c-implementation-of-a-bug-or-a-task)
- [Flow D: conversation](#flow-d-conversation)
- [Budgets and the stop rule](#budgets-and-the-stop-rule)
- [Cost reporting](#cost-reporting)
- [State between runs](#state-between-runs)
- [Labels](#labels)
- [Rules and skills](#rules-and-skills)
- [Security](#security)
- [Later: stories and epics](#later-stories-and-epics)
- [Deviations from the framework](#deviations-from-the-framework)

## Scope

| ID | Requirement | Where |
|---|---|---|
| R1 | Review a pull request when it opens outside draft, assess its impact, and post the result as a comment; afterwards only on request | [Flow A](#flow-a-pull-request-review-and-impact) |
| R2 | Assess every new `Bug` and `Task` issue and set `ai:suitable` or `ai:unsuitable` | [Flow B](#flow-b-issue-analysis) |
| R3 | On an explicit command, implement a `Bug` or a `Task`: open a linked pull request, or comment what was missing | [Flow C](#flow-c-implementation-of-a-bug-or-a-task) |
| R4 | Watch the CI of its own pull request and iterate on failures | [Flow C](#flow-c-implementation-of-a-bug-or-a-task) |
| R5 | Stop iterating when it is not making progress, and call a person | [Budgets](#budgets-and-the-stop-rule) |
| R6 | Run in GitHub Actions with `OPENAI_API_KEY` from the repository secrets | [Architecture](#architecture) |
| R7 | Keep prompts and scripts in this repository | [Architecture](#architecture) |
| R8 | Review its own code with a different OpenAI model; a better model writes code, a cheaper one reviews | [Models](#models) |
| R9 | Keep state between workflow runs | [State](#state-between-runs) |
| R10 | Talk to people through comments | [Flow D](#flow-d-conversation) |
| R11 | Follow the labels of the AI tasks labeling framework | [Labels](#labels) |
| R12 | Use the existing skills, rules, and `AGENTS.md` files | [Rules and skills](#rules-and-skills) |
| R13 | Report on request how much an issue or a pull request has cost; no spending cap | [Cost reporting](#cost-reporting) |
| R14 | Commit with a personal access token for the proof of concept; no GitHub App | [GitHub identity](#github-identity) |
| R15 | Refuse to implement an `ai:unsuitable` issue with the reasons, unless a person insists with `force` | [Flow C](#flow-c-implementation-of-a-bug-or-a-task) |
| R16 | Copy the execution level of merged pull requests to the issues they close | [Labels](#execution-labels-on-issues) |
| NFR | Write as little code as possible; prefer ready-made open-source tools, opencode first | [Engine](#engine) |

Out of scope for now: stories and epics (see [Later](#later-stories-and-epics)), starting an implementation without a
command (`ai:l2-agent`), merging pull requests and closing issues (`ai:l3-autonomous`), and any write operation on a
pull request from a fork.

## Decisions at a glance

1. **Engine: the opencode CLI, version 1.x, pinned, run headless with `opencode run`.** Not the ready-made
   `opencode github run` command; [Engine](#engine) explains why.
2. **The model reasons, the code decides.** A few Node.js scripts in `tools/agent/` route events, keep state, count
   attempts and cost, push branches, and post comments. The model never holds a GitHub token.
3. **Different models for writing and reviewing.** A stronger model implements; a cheaper one reviews the code it
   wrote. The models are repository variables; the chosen set is Balanced from [Models](#models).
4. **A personal access token pushes and opens pull requests; `GITHUB_TOKEN` does the rest.** A push with
   `GITHUB_TOKEN` does not start CI, and CI is what the agent iterates on.
5. **State lives in GitHub:** labels for the phase, one comment per issue and per pull request with a hidden JSON block
   for the details, and run artifacts for the transcripts. No external storage.
6. **Every run rebuilds its context from GitHub.** No opencode session is carried between runs.
7. **Knowledge comes from the repository:** `AGENTS.md` files, the skills in `.agents/skills/` and
   `.claude/skills/`, the rules in `.claude/rules/`, and the APM package with the agent's own skills. The two
   skill trees are one install. `.cursor/skills/` is not committed.

## Engine

### Options

| Option | Fit | Verdict |
|---|---|---|
| opencode, `opencode github run` (the official action) | Comment chat, issue and PR context, branch and PR creation out of the box | Rejected as the core; see below |
| opencode, `opencode run` with a thin orchestrator | Any OpenAI model, custom agents with their own model and permissions, reads `.agents/skills` and `AGENTS.md` | **Chosen** |
| `openai/codex-action` (Codex CLI) | OpenAI's own agent, `AGENTS.md`, Apache-2.0; no comment chat, no PR creation | Fallback engine |
| OpenHands resolver | Label-driven issue fixing with iterations | Heavy Docker runtime; its own skill format |
| PR-Agent (Qodo) | Mature PR review with OpenAI | Review only; ignores our skills and rules |
| Claude Code action | Close to what we need | Not available: Anthropic models only |

### Why not `opencode github run`

The command covers the comment chat well: it checks that the commenter has write access, reacts to the comment, puts
the issue or pull request with its comments into the prompt as data, creates a branch, commits, and opens a pull
request with `Closes #N`. It does not fit the rest:

- **It has no future in its current form.** The `dev` branch of opencode, the 2.0 rewrite, removed
  `packages/opencode` on July 21, 2026, and the new CLI has no `github` command. Only the 1.x line (1.19.4 on
  October 22, 2026) still ships it.
- **It does not follow our conventions.** Branches are `opencode/issue<N>-<timestamp>` instead of
  `bugfix/<N>-<slug>`, and the pull request title is the model's summary, not a Conventional Commit.
- **It has none of our control logic:** no labels, no analysis step, no CI loop, no attempt budget, no self-review
  gate, no cost record.
- **It shares sessions by default on public repositories**, which publishes the transcript on opencode.ai.
- **The action installs the latest opencode release**, so behavior changes without a commit in this repository.

We reuse its patterns instead: the permission check, the reaction, and the prompt layout that marks issue text as
data the model must not act on. That costs about a hundred lines of script.

### Why opencode over Codex

opencode reads `.agents/skills/*/SKILL.md` and `AGENTS.md` natively, attaches the nested `AGENTS.md` of a module when
the agent reads a file in it, and lets each custom agent set its own model, reasoning effort, step limit, and tool
permissions. The roles of this design map onto that directly. The engine-specific part is small: one config directory
and one `opencode run` call in a script. The prompts and skills are plain Markdown, so a move to Codex or to opencode
2.x replaces that call and keeps the rest.

## Architecture

```text
 GitHub events                          .github/workflows/ai-autonomous-agent.yml
 ─────────────                          ─────────────────────────────────────────
 pull_request (opened, ready)  ─┐      ┌─ route ──── tools/agent/route.js: who, what, may we, which playbook
 issues (opened, typed, edited) │      │
 issue_comment                  ├─► one├─ review ─── Flow A
 pull_request_review            │  file├─ analyze ── Flow B
 workflow_run (CI done)        ─┘      ├─ implement  Flow C, one attempt per run
                                       ├─ ci-gate ── Flow C, CI verdict for the agent's pull request
                                       └─ chat ───── Flow D, including /agent cost

 pull_request_target (merged, labeled) ─► .github/workflows/ai-autonomous-levels.yml: ai:l* from PRs to issues

 each job:  context.js (GitHub ➜ prompt input) ──► opencode run --agent <role> ──► publish.js (git push, comments,
            labels, state, cost)    the model has no GitHub token; scripts do every write
```

### Components

| Path | What |
|---|---|
| `.github/workflows/ai-autonomous-agent.yml`, workflow `AI Autonomous: Agent` | One entry point for every trigger; a `route` job decides, the other jobs act |
| `.github/workflows/ai-autonomous-levels.yml`, workflow `AI Autonomous: Execution levels` | Copies `ai:l*` from merged pull requests to their issues; a separate file, because `pull_request_target` must not share a workflow with jobs that check out pull request code |
| `tools/agent/*.js` | The orchestrator: `route`, `context`, `state`, `budget`, `cost`, `ci-report`, `publish`; tests are `*.test.js`, run by `pnpm test:tools` |
| `tools/agent/opencode/opencode.json` | opencode config: OpenAI provider, sharing off, default permissions, instruction files |
| `tools/agent/opencode/agents/*.md` | One file per role: model, step limit, permissions, and the CI contract (input, output JSON) |
| `agent-packages/apihub-autonomous-agent/` | New APM package with the skills of the agent's playbooks; also usable from Claude Code and Cursor |
| `docs/development/autonomous-agent.md` | For contributors: the commands, the labels, what to expect |

Every workflow of the proof of concept has a name that starts with `AI Autonomous:`, so the group stays together in
the Actions sidebar, as the other groups of [CI](../../development/ci.md#the-workflows) do. The workflow sets
`OPENCODE_CONFIG` and `OPENCODE_CONFIG_DIR` to `tools/agent/opencode/`, so the CI config does not
touch the opencode setup of a developer who runs opencode locally.

### Roles

| Role (opencode agent) | Model variable | Can edit | Shell | Output |
|---|---|---|---|---|
| `analyst` | `AGENT_MODEL_LIGHT` | no | read-only commands | JSON: `suitable` with a short plan, `unsuitable` with the reason, or `needs-info` with questions |
| `implementer` | `AGENT_MODEL_IMPLEMENT` | yes | build, test, lint commands of the repository; no `git push`, no `gh`, no network tools | changed files, a JSON summary, notes for the next attempt |
| `self-reviewer` | `AGENT_MODEL_REVIEW` | no | read-only | JSON verdict: `approve` or `changes`, with findings |
| `pr-reviewer` | `AGENT_MODEL_REVIEW` | no | read-only | JSON: summary, impact, findings with file and line |
| `verifier` | `AGENT_MODEL_IMPLEMENT` | no | read-only | JSON: each finding `confirmed`, `plausible`, or `rejected` |
| `assistant` | `AGENT_MODEL_LIGHT` | no | read-only | Markdown answer to a comment |

The JSON outputs are the contract between the model and the scripts. A script validates each one against a schema
and treats an invalid output as a failed step, never as a default.

## Models

Each model variable holds a model and a reasoning effort (opencode `--variant`), for example
`openai/gpt-6.1-sol:high`. `route.js` fails a run when `AGENT_MODEL_IMPLEMENT` and `AGENT_MODEL_REVIEW` name the same
model. Prices on October 23, 2026, in USD per million tokens, from the OpenAI model list and models.dev:

| Model | Positioning by OpenAI | Input | Cached input | Output |
|---|---|---|---|---|
| `gpt-6-astra` | flagship for complex reasoning and coding | 10.00 | 1.00 | 50.00 |
| `gpt-6.1-sol` | near-Astra performance at a lower cost | 2.00 | 0.10 | 10.00 |
| `gpt-6-luna` | the most efficient, for focused high-volume tasks | 0.10 | 0.01 | 0.50 |

Older models cost more for less: `gpt-5.4-mini` is 0.75 and 4.50, `gpt-5.5` is 5 and 30. The launch coverage of the
GPT-6 family reports DeepSWE 1.1 (long software tasks) at 68.8 % for Sol and 66.6 % for Luna, both at maximum effort,
and 74.1 % for Astra. One third-party article says the launch prices of Sol and Luna are guaranteed only until
November 21, 2026; check them again before rollout.

Three sets were compared; **Balanced is chosen**. Each keeps the reviewer on a different model from the implementer.

| Role | Balanced (chosen) | Economy | Quality |
|---|---|---|---|
| `implementer` | `gpt-6.1-sol`, high | `gpt-6-luna`, max | `gpt-6-astra`, high |
| `self-reviewer`, `pr-reviewer` | `gpt-6-luna`, max | `gpt-6.1-sol`, medium | `gpt-6.1-sol`, high |
| `verifier` | `gpt-6.1-sol`, medium | `gpt-6-luna`, max | `gpt-6-luna`, max |
| `analyst`, `assistant` | `gpt-6-luna`, medium | `gpt-6-luna`, medium | `gpt-6.1-sol`, medium |
| Illustrative implementation attempt | about 1.4 USD | about 0.1 USD | about 8 USD |
| Illustrative pull request review | about 0.35 USD | about 0.9 USD | about 0.9 USD |

The illustrative attempt reads 1.5 million input tokens, 90 % of them from the cache, and writes 100,000 output tokens,
reasoning included. The illustrative review reads 300,000 tokens and writes 30,000, and its verification reads 100,000
and writes 10,000, both without the cache. Real numbers come from the phase 0 spike and then from
[`/agent cost`](#cost-reporting).

**Why Balanced.** It follows the rule "a better model writes, a cheaper one reviews". The implementer is where quality
pays off: a weak attempt costs a CI run of about 45 minutes and another attempt. Luna at maximum effort is close to
Sol on coding benchmarks, so it is a strong reviewer for its price, and the verifier on Sol filters its false
positives. Economy is the first fallback if the bill matters more than the attempt count; it inverts the rule, which
still keeps two different models.

## GitHub identity

Events created with `GITHUB_TOKEN` start no workflow, apart from pull request events that wait for an approval. The
agent's push must start `CI`, so the push and the pull request use a personal access token (PAT) for the proof of
concept. Everything else uses the `GITHUB_TOKEN` of the job.

| Operation | Token | Author on GitHub |
|---|---|---|
| `git push` of the agent's branch | `AGENT_PAT` | the PAT owner |
| Opening the pull request, marking it ready for review | `AGENT_PAT` | the PAT owner |
| Comments, reviews, labels, reactions, reading runs and checks | `GITHUB_TOKEN` | `github-actions[bot]` |

**The token.** A fine-grained PAT for `Netcracker/qubership-apihub` only, with Contents and Pull requests set to read
and write, and no Workflows permission. It goes into the secret `AGENT_PAT`. If the organization requires an approval
for fine-grained tokens, a classic token with the `public_repo` scope works too, but it reaches every public repository
its owner can write to.

What follows from this choice:

- **The agent's pull requests have a person as their author.** That person cannot approve them, so another CODEOWNER
  reviews. Paths that only the PAT owner owns (the default `*` rule covers `tools/`, `deploy/`, `docs/`, and the root)
  need another maintainer or an admin bypass. Accepted for the proof of concept.
- **The author does not mark the agent's pull requests,** so the scripts do: the pull request body carries a hidden
  marker `<!-- ai-autonomous-agent issue=<N> -->`, and the state comment of the issue names the pull request. `route.js`
  trusts a pull request as the agent's only when both agree.
- **Commits carry the PAT owner as author,** so the CLA check passes, and a trailer `Agent-Run: <run URL>` that says
  which run made them.
- **Comments by `github-actions[bot]` start no workflow,** which keeps the agent from answering itself.
- **The guard on workflows holds:** without the Workflows permission, GitHub refuses a push that changes
  `.github/workflows/`, so the agent cannot change its own guardrails.

A GitHub App or a machine user replaces the PAT later by changing one secret and the Git identity; nothing else in the
design depends on it.

## Flow A: pull request review and impact

**Triggers.** `pull_request` `opened` when the pull request is not a draft, and `ready_for_review` when it has never
been reviewed. After that, only the comment `/agent review` from a user with write access. The flow skips the agent's
own pull requests, which its self-review has already covered, and Dependabot pull requests, whose runs get no
repository secrets. `/agent review` works on both.

1. **Facts, by script.** Changed files, the affected Nx projects (`nx show projects --affected` between the merge base
   and the head), the `module:<name>` labels, and flags for areas that need care: OpenAPI files under `docs/api/`, SQL
   migrations, `deploy/`, configuration templates, `.github/workflows/`, and a breaking-change marker in the title or
   description. The facts go into the prompt as `impact-facts.json`.
2. **Review.** `pr-reviewer` follows the new `apihub-pr-review` skill. The skill sends it to the module skills that
   apply: `apihub-backend-self-review` and `apihub-go-self-review` for Go, `api-doc-viewer-reviewing` for the viewer,
   `apihub-deployment-followup` for configuration, `postman-e2e-followup` for REST contract changes, and so on.
3. **Verification.** `verifier`, on the other model, checks every finding against the code and drops the rejected
   ones. This cuts false positives, the main cost of an AI review for its readers.
4. **Publish.** One pull request review with inline comments on the confirmed findings. Its event is always `COMMENT`,
   never an approval or a change request. One summary comment holds the impact table, the findings that have no line,
   and the hidden state of the pull request; the next review edits it instead of adding a new one. The pull request
   gets `agent:pr-reviewed`.

The impact section answers: which modules and images change, whether the REST contract or the database schema
changes and whether the change is breaking, which Helm values, Compose files, or configuration reference entries need
an update, which E2E collections cover the change, and the overall risk (low, medium, or high) with the reason.

**Pull requests from forks.** `/agent review` from a maintainer runs the review in the context of this repository,
with the fork's code checked out as data: no dependency install, no build, facts from the paths only.

## Flow B: issue analysis

**Triggers.** An issue of type `Bug` or `Task` is opened or gets one of these types (`issues` `opened` and `typed`).
The analysis runs again on `/agent analyze`, and on an edit of the issue or a comment of its author while the issue
waits for information. It runs for every author, because it changes nothing but a label and a comment.

1. **Skip** when a person has already set `ai:suitable` or `ai:unsuitable`.
2. **Analyze** (`analyst`, light model). Reads the issue, its comments, and the code it points at, and follows the new
   `apihub-issue-analysis` skill. The result is one of three:
   - `suitable`: the issue holds enough to implement it, and the change fits the agent's tools and checks. The output
     adds a short plan: modules, approach, tests, risk.
   - `unsuitable`: a reason the agent cannot overcome, such as a decision that belongs to people, access the agent
     does not have, a change too large for one pull request, or work outside the repository.
   - `needs-info`: concrete questions whose answers would make the issue suitable.
3. **Publish.** `ai:suitable` or `ai:unsuitable`, or `agent:needs-human` with the questions in a comment. The state
   comment of the issue shows the verdict, the reason, and the plan; Flow C starts from that plan.

The agent never starts an implementation from the analysis. A person reads the verdict and decides with
`/agent implement`.

## Flow C: implementation of a bug or a task

**Trigger.** `/agent implement` (alias `/agent fix`) from a user with write access on a `Bug` or `Task` issue. The
pull request it produces is `ai:l1-executor`: a person started the work.

**An issue labeled `ai:unsuitable` needs `force`.** On such an issue, `/agent implement` does not start. The agent
replies with the reasons from its analysis, or says that a person set the label, and adds: "If you want me to try
anyway, comment `/agent implement force`." The `force` form starts the flow; `ai:unsuitable` stays, because the
capability label describes the issue, not the outcome, and the state records `forced: true`. The weekly report can
then show how often a forced attempt succeeds, which tells how good the analysis is.

| | `Bug` | `Task` |
|---|---|---|
| Playbook skill | `apihub-bug-fix` | `apihub-task` |
| Branch | `bugfix/<issue>-<slug>` | `feature/<issue>-<slug>` |
| Title | `fix(<scope>): <summary>` | the Conventional Commit type that fits: `refactor`, `chore`, `docs`, `ci`, `build`, `test`, `perf`, or `feat` |
| First step | reproduce the bug with a failing test where the module allows it | turn the issue into checkable done criteria |
| Diff limit | 20 files or 600 changed lines | 30 files or 1,000 changed lines |

Branch names follow the [development workflow](../../development/workflow.md); the scope is the module name.

```text
 /agent implement ─► analysis fresh? ─┬─ needs-info ─────────────────────────────► questions, agent:needs-human
                     (else Flow B)     └─ suitable ─► implement ─► local checks ─► self-review ─┬─ approve ─► push, PR ─► CI
                                                         ▲          │ red          │ changes   │
                                                         └──────────┴──────────────┘ ≤ 2 rounds └─ still changes ─► draft PR,
 CI done ─► ci-gate ─┬─ green ─► agent:completed, ai:l1-executor, PR ready for review                   agent:needs-human
                     ├─ red, attempts left, new failure ─► next attempt with the CI report
                     └─ red, attempts spent or the same failure again ─► agent:needs-human
```

One `implement` job runs one attempt and exits; nothing waits on a runner for CI.

1. **Analysis.** The job reuses the analysis from the state when the issue has not changed since; otherwise it runs
   Flow B first. `needs-info` ends the run with the questions.
2. **Branch** from `develop`. A later attempt checks out the same branch.
3. **Implement** (`implementer`). Follows the playbook skill: the first step from the table, then the smallest change
   that does the job, following the module's skills and rules, and the module's own checks. The input holds the issue,
   the analysis plan, the notes of earlier attempts, and, on a CI attempt, the CI report.
4. **Local checks, by script.** `nx affected -t build test` against `origin/develop` on the runner, plus the format
   checks of the changed languages. A red result goes back to the implementer as a review round.
5. **Self-review** (`self-reviewer`, the other model). Reviews the diff against the issue and the module's
   self-review skill. `changes` goes back to the implementer with the findings. After two rounds without approval, the
   pull request opens as a draft, with the open findings in its description, and gets `agent:needs-human`.
6. **Publish, by script.** The publish job does not trust the work job. It measures the diff of the commits in the
   bundle itself, from the branch point, and applies the diff limits and the protected paths again; a violation means
   no push and a blocked attempt. Then it pushes one Conventional Commit with the `Agent-Run` trailer with
   `AGENT_PAT`. The pull request into `develop` always opens as a draft. It follows the repository template (Why, What,
   How to verify), says `Closes #<issue>`, labels the local check and self-review results as reported by the work job,
   and carries the agent marker. The state comment of the issue links it. The run ends in the phase `waiting-ci`. Only
   the CI gate marks the pull request ready.

**The CI gate.** `workflow_run` `completed` of `CI`, `Lint: Code base`, `PR: Title`, and `PR: Commit messages` starts
`ci-gate` when the head branch belongs to an open pull request of the agent. The gate reads every check run of the
head commit and exits while any is still running, so it decides once.

- **All green:** the pull request leaves draft (this is the only place where that happens), gets `agent:completed`
  and `ai:l1-executor`, and the issue gets a short report. The gate writes nothing when a newer commit is on the
  branch than the one it collected the checks for; that commit gets its own gate run.
- **Red:** `ci-report.js` collects the failed jobs, the failing step logs (`gh run view --log-failed`, cut to the
  first error blocks), and the names of the E2E reports. The report and its failure signature go to the state. If the
  budget allows, the gate starts the next `implement` attempt with the report as input.

## Flow D: conversation

The agent answers a comment that starts with `/agent` from a user with write, maintain, or admin access to the
repository. It ignores every other comment and every comment of a bot, its own included.

| Command | Where | Effect |
|---|---|---|
| `/agent analyze` | issue | Runs Flow B again |
| `/agent implement [notes]`, `/agent fix [notes]` | `Bug` or `Task` issue | Starts Flow C; the notes become hints. On an `ai:unsuitable` issue, replies with the reasons instead |
| `/agent implement force [notes]` | `ai:unsuitable` issue | Starts Flow C despite the label |
| `/agent retry [notes]` | issue or agent PR in `agent:needs-human` | Resumes Flow C with a fresh attempt budget |
| `/agent stop` | issue or agent PR | Stops the flow; the phase becomes `stopped`; no further runs until `/agent implement` or `/agent retry` |
| `/agent review` | pull request | Runs Flow A |
| `/agent cost` | issue or pull request | Replies with the cost table, see [Cost reporting](#cost-reporting) |
| `/agent <text>` | issue, or a pull request of a person | `assistant` answers; nothing is changed |
| `/agent <text>` | pull request of the agent | `implementer` treats the text as a change request: one attempt on the PR branch |

**The human answer.** The framework requires the agent to notice when a person answers an `agent:needs-human` request.
Any comment of a user with write access on such an issue or pull request resumes the flow, with or without `/agent`,
and counts as one extra attempt. In Flow B, the issue author's comment is enough, because the analysis writes nothing
but a label and a comment. A review with change requests on the agent's pull request resumes it too: the implementer
gets every unresolved thread, and the publish step replies in each thread with what it changed.

The agent never pushes to a branch of a person. On those pull requests it reviews and answers.

## Budgets and the stop rule

There is no spending cap; [Cost reporting](#cost-reporting) makes the spending visible instead. The limits below stop
loops, not spending.

| Limit | Default (repository variable) | When reached |
|---|---|---|
| Attempts per issue after the pull request opens | 3 (`AGENT_MAX_ATTEMPTS`) | `agent:needs-human` |
| Self-review and local-check rounds per attempt | 2 (`AGENT_MAX_REVIEW_ROUNDS`) | draft pull request, `agent:needs-human` |
| Analyses per issue | 5 (`AGENT_MAX_ANALYSES`) | the agent stops answering edits; `/agent analyze` still works |
| Model steps per opencode run | per role, in the agent file (`steps`) | the run ends, and the attempt fails |
| Job time | 60 minutes (`timeout-minutes`) | the attempt fails |
| Diff size | per playbook, see [Flow C](#flow-c-implementation-of-a-bug-or-a-task) | `agent:needs-human`: the change has outgrown the issue |
| Free reruns of a failed E2E job | 1 per pull request | counted as an attempt after that |

**No progress means stop.** The failure signature is a hash of the failed job names and the normalized first error
lines. When an attempt ends with the signature of the attempt before it, the agent stops at once, whatever the budget:
the same fix twice would burn tokens for the same red run.

**The hand-off comment** says what the agent tried in each attempt, the current failure, its best hypothesis, and one
concrete question or request. A person can then answer in a comment and the flow resumes.

## Cost reporting

Every opencode run reports tokens and cost per message in its JSON events. `cost.js` adds them up per run and writes
one record to the state of the issue or pull request: the flow, the role, the model, the input, cached, and output
tokens, and the cost in USD. The publish step writes the record in an `always()` step, so a failed run still counts.

`/agent cost` on an issue answers with a table of every run of the issue and of its pull requests, and the total. On a
pull request it covers the pull request, plus its issue when the pull request is the agent's. The numbers are
estimates from the price table opencode uses; the OpenAI bill is the authority, and promotional prices or failed API
calls can make it differ. The phase 0 spike checks that the events carry what `cost.js` needs.

## State between runs

Runners are stateless, and each run of the workflow starts clean. The agent keeps its state where people already
look.

| Store | Holds | Why |
|---|---|---|
| Labels | the phase that people and reports read: `agent:*`, `ai:*` | visible in every list; the issue timeline keeps each label change with its time |
| The state comment | one comment by `github-actions[bot]` per issue and per pull request, edited in place: a status table for people and a hidden JSON block for the scripts | durable, versioned by GitHub, readable without tools |
| Run artifacts | the opencode session export (`opencode export --sanitize`), the prompt inputs, the CI report | for debugging; 30-day retention; never read back |
| The branch | the code of the attempts | already the source of truth |

The hidden block of an issue looks like this:

```json
{
  "schema": 1,
  "issue": 1234,
  "playbook": "bug-fix",
  "phase": "waiting-ci",
  "analysis": { "verdict": "suitable", "labelSetBy": "agent", "issueUpdatedAt": "2026-10-23T09:12:00Z", "plan": "..." },
  "branch": "bugfix/1234-empty-changelog",
  "pr": 1240,
  "attempts": [
    {
      "n": 1, "kind": "initial", "run": "https://github.com/.../actions/runs/...", "result": "ci-red",
      "signature": "3f9c1e", "notes": "Null pointer in the changelog builder; added a guard and a test."
    }
  ],
  "costs": [
    { "run": "...", "flow": "implement", "role": "implementer", "model": "openai/gpt-6.1-sol",
      "input": 1480000, "cached": 1310000, "output": 96000, "usd": 1.45 }
  ],
  "lastHumanCommentId": 987654321
}
```

Rules for the state:

- Only the scripts write it. They trust only a comment authored by `github-actions[bot]` that carries the state
  marker. Other workflows of the repository can post as the same bot; that is acceptable for a proof of concept and
  goes away with an App identity.
- The workflow runs one job per issue or pull request at a time (`concurrency` keyed by the number), so two writes do
  not race.
- The `attempts` list keeps every failure, so `agent:completed` at the end does not erase the history, as the
  framework requires.
- The next run rebuilds the model's context from the issue, its comments, the pull request, the CI report, the
  analysis plan, and the `notes` of each attempt. That keeps runs reproducible and cheap, and does not depend on an
  artifact that expires.

Rejected stores: the Actions cache (evicted after seven days without use), repository variables (global, need an
admin token), an external database (infrastructure to run), and resumed opencode sessions (the transcript grows with
every attempt and costs more than a summary).

## Labels

The agent applies the framework from the request. `tools/agent/labels.sh` creates the labels once; the framework gives
no colors for the execution labels, so the script picks them.

| Label | Set by the agent | When |
|---|---|---|
| `ai:suitable`, `ai:unsuitable` | on issues, in Flow B | only when neither is set; the agent never changes a label that a person set, and changes its own only on a new analysis |
| `ai:l1-executor` | on its pull request | at `agent:completed`; every implementation starts with a command, so this is the only level for now |
| `ai:l2-agent`, `ai:l3-autonomous` | never for now | need an implementation without a command, and auto-merge for L3 |
| `ai:l0-assistant` | never | describes human work |
| `agent:completed` | issue and pull request | CI is green and the self-review approved |
| `agent:needs-human` | issue or pull request | a `needs-info` analysis, a stop from [Budgets](#budgets-and-the-stop-rule), or an error the agent cannot fix |
| `agent:pr-reviewed` | pull request | after Flow A publishes |

The framework says that only a person sets `ai:unsuitable`; Flow B sets it too, a deliberate
[deviation](#deviations-from-the-framework). A person overrides the agent by changing the label.

`agent:needs-human` and `agent:completed` exclude each other. When a person resumes the flow, the agent removes
`agent:needs-human`; the timeline keeps the earlier label.

### Execution labels on issues

The framework puts `ai:l*` on pull requests, but the team counts work by issue. A small job copies the level to the
issue when the work lands. It uses no model and costs nothing.

- **Event.** `pull_request_target` `closed` with `merged: true`, and `pull_request_target` `labeled` with an `ai:l*`
  label on a pull request that is already merged, for a label set late. `pull_request_target` gives a write token
  also for a pull request from a fork; the job checks out no code of the pull request.
- **Which issues.** The issues the pull request closes (`closingIssuesReferences`), the same list the release notes
  read. A mention in a comment does not count, as in the [development workflow](../../development/workflow.md).
- **Which pull requests.** Every merged one, from a person or from the agent, so that the report by issue is complete.
- **Several pull requests per issue.** The issue gets the lowest level among its merged pull requests that have one,
  recomputed on every merge: the issue was as autonomous as its least autonomous part. Example: an agent pull request
  with `ai:l1-executor` and a follow-up by a person with `ai:l0-assistant` give the issue `ai:l0-assistant`.
- **A merged pull request without a level.** The job comments on it with a reminder to set one; the `labeled` event
  then copies the level.
- **People's commits on an agent pull request.** Commits without the `Agent-Run` trailer are people's. The job keeps
  `ai:l1-executor`, because the level is a human judgment, but says in its comment how many such commits there are,
  so the reviewer can lower the level to `ai:l0-assistant`.

## Rules and skills

| Source | How the agent gets it |
|---|---|
| Root `AGENTS.md` | opencode loads it at start |
| Module `AGENTS.md` | opencode 1.x attaches the nearest `AGENTS.md` above a file when the agent reads that file |
| `CLAUDE.md` | ignored where an `AGENTS.md` exists; ours only import `AGENTS.md` |
| Skills in `.agents/skills/` and `.claude/skills/` | opencode discovers them and loads one on demand. On a name clash it keeps the `.claude/skills/` copy |
| Rules in `.claude/rules/` | listed in `instructions` of `opencode.json`; see below |
| The agent's playbooks | new skills in `agent-packages/apihub-autonomous-agent/`, deployed by `apm install` like any other |

Points to settle:

- **Two committed skill trees, one install.** `apm install --target cursor,claude` writes the same skills to
  `.agents/skills/` and `.claude/skills/`. Both are committed, so a clone works for Claude Code and for harnesses
  that read `.agents/skills/` without running APM. `.cursor/skills/` is gitignored. OpenCode scans
  `.claude/skills/` first and keeps that copy when the same name also exists under `.agents/skills/`, so the two
  trees have to stay identical and land in the same commit. The review job replaces both `.agents/` and
  `.claude/` from the workflow ref, so a pull request cannot change the skills or rules that review it.
- **Rules are path-scoped; opencode does not read `paths:`.** The 54 rules in `.claude/rules/` are 25 KB together, and
  each one names its scope in its text. Loading them all costs about 7,000 tokens per run and is the default. If that
  confuses the model, the alternatives are the APM `opencode` target, if it keeps the scope, or a small opencode
  plugin that adds a rule when the agent reads a file that matches its `paths`. A relative glob does not reach the
  hidden `.claude` folder, so `opencode.json` names it with an absolute path:
  `{env:GITHUB_WORKSPACE}/.claude/rules/*.md` ([spike](./spike.md)).
- **A skill needs `name` in its frontmatter** for opencode to load it.
- **`disable-model-invocation: true`** (in `apihub-backend-self-review`, for example) means nothing to opencode. The
  playbook skills name the skills to load, so this does not change behavior.

The new package `apihub-autonomous-agent` holds the playbooks as skills:

- `apihub-issue-analysis`: what makes an issue suitable, unsuitable, or short of information, and the plan format.
- `apihub-bug-fix`: reproduce first, minimal diff, which module skill to follow, which checks to run, what to write in
  the attempt notes.
- `apihub-task`: done criteria first, the choice of the commit type, the same checks and notes.
- `apihub-pr-review`: the review checklist, the impact questions, and the map from changed paths to module skills.
- `apihub-ci-failure-triage`: how to read a red run of this repository, built on
  [Read a red run](../../development/ci.md#read-a-red-run).

People can call the same skills from Claude Code or Cursor. The CI contract (JSON outputs, no questions to the user,
no network) stays in the agent files under `tools/agent/opencode/agents/`, because it applies to CI runs only.

## Security

The repository is public, so issue text, comments, and fork code are untrusted input that may carry prompt injection.

- **Writes go through code, not the model.** The opencode step gets `OPENAI_API_KEY` and no GitHub token. The publish
  step pushes, comments, and labels after the model has exited, and only what the contract allows.
- **Two jobs split the secrets for Flow C.** The tests of a change run code that the model wrote, as the same user as
  the scripts, so a token in the environment of any step of that job could be read from `/proc` or by a process that
  outlives the step. The work job (`implement`) therefore holds only the OpenAI key after its preflight, which runs
  before any model code. It hands a JSON outcome and a Git bundle to the `publish` job as an artifact. `publish` holds
  `GITHUB_TOKEN` and `AGENT_PAT`, runs no model and no repository code, and treats the artifact as data from a source
  that may lie: it pushes only to the branch it derives itself from the state, checks that the bundle holds the commit
  the outcome names, validates every answer against its contract, and measures the diff of the bundle itself, so the
  diff limits and the protected paths (workflow files, the agent's own files) hold whatever the outcome says. It opens
  every pull request as a draft and never marks one ready. Only the `ci-gate` job does, after real CI on GitHub is
  green, so a forged "checks passed" from the work job cannot reach a reviewer as a ready pull request. The local check
  and self-review results stay in the state and the description, labeled as reported by the work job. The OpenAI key
  stays reachable by the code under test in the work job. The proof of concept accepts that; give the key its own
  OpenAI project and a budget on it.
- **Only maintainers start write flows.** Every command, every answer to a hand-off, and every review with change
  requests needs write access. The marker in the description of a pull request counts only when the state of the issue
  names that pull request. A review event runs the workflow file of the pull request, so the jobs name the default
  branch in their checkouts and keep the code of the pull request out of them. The analysis runs for any author, but it
  has no edit permission and its output is one label and one comment.
- **Untrusted text is marked as data.** The prompt wraps issue and comment text in a block that the model is told not
  to follow, as `opencode github run` does.
- **Narrow tools.** The implementer's shell allows the repository's build, test, and lint commands, and denies
  `curl`, `wget`, `gh`, `git push`, and web fetch. The other roles cannot edit and run read-only commands only.
- **The PAT is narrow.** One repository, Contents and Pull requests only, no Workflows. Only the preflight (for the
  Git identity, before any model code), the `publish` job, and the `ci-gate` job (to take a pull request out of
  draft) see it. None of them runs model or repository code.
- **The orchestrator of the write flows runs from `develop`.** `issues`, `issue_comment`, and `workflow_run` use the
  workflow file of the default branch, so a pull request cannot change the code that pushes for it or judges its CI.
  Flow A on `pull_request` runs the version of the pull request, but only pull requests from this repository get
  secrets there, and their authors already have write access.
- **Branch protection stays.** `develop` requires a CODEOWNERS approval, so the agent cannot merge.
- **No session sharing.** `opencode.json` sets `"share": "disabled"`.

## Later: stories and epics

The router picks a playbook from the issue type, so a new kind of work is a new playbook, not a new pipeline. A
`story` playbook for `Story` and `Feature` would plan with the existing `github-ticket-implementation-planner` skill,
post the plan, wait for `/agent approve`, and implement with the steps of Flow C, with larger budgets and several pull
requests. A story that needs frontend and backend changes would use the shared branch of the
[development workflow](../../development/workflow.md#features-that-need-frontend-and-backend-changes). Epics stay with
people; the agent only answers there.

## Deviations from the framework

**The agent sets `ai:unsuitable`.** The framework table says that only a person sets it. The proof of concept lets
Flow B set it, as it sets `ai:suitable`, and keeps the framework text as it is. A person still has the last word: the
agent never changes a label that a person set, and `/agent implement force` overrides the verdict.
