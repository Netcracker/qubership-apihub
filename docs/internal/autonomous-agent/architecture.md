# Autonomous agent: architecture

How the AI Autonomous agent works, flow by flow, as it was built. The [design](./design.md) and the
[plan](./plan.md) describe the intentions; this page describes the code on the branch of the last phase. The
[technical details](./technical-details.md) list every script, call, and file. The guide for people who use the agent is
[AI Autonomous agent](../../development/autonomous-agent.md).

## Contents

- [The pieces](#the-pieces)
- [The jobs of the agent workflow](#the-jobs-of-the-agent-workflow)
- [Where the state lives](#where-the-state-lives)
- [The phase of an issue](#the-phase-of-an-issue)
- [Flow A: review](#flow-a-review)
- [Flow B: analysis](#flow-b-analysis)
- [Flow C: implementation](#flow-c-implementation)
- [Flow C: the CI loop](#flow-c-the-ci-loop)
- [Flow D: commands](#flow-d-commands)
- [Execution levels](#execution-levels)
- [Weekly report](#weekly-report)
- [Where a person steps in](#where-a-person-steps-in)

## The pieces

The agent is three GitHub Actions workflows, a set of Node.js scripts, and seven opencode roles. GitHub events start the
workflows. A script reads GitHub, builds the prompt input, runs `opencode run --agent <role>` when it needs a model,
checks the answer against a JSON contract, and writes the result back to GitHub. The model never gets a GitHub token:
every write is a script.

```mermaid
flowchart LR
  subgraph events["GitHub events"]
    PR["pull_request<br/>opened, ready_for_review"]
    IS["issues<br/>opened, typed, edited"]
    IC["issue_comment<br/>created"]
    PRR["pull_request_review<br/>submitted"]
    WR["workflow_run completed<br/>CI and five PR checks"]
    PRT["pull_request_target<br/>closed, labeled"]
    CRON["schedule Monday 06:00 UTC<br/>workflow_dispatch"]
  end
  subgraph agentwf["AI Autonomous: Agent"]
    ROUTE["route"]
    JOBS["review, analyze, implement, publish,<br/>ci-gate, rerun, ci-check, chat, stop"]
  end
  LEVELS["AI Autonomous: Execution levels<br/>levels"]
  REPORT["AI Autonomous: Weekly report<br/>report"]
  PR --> ROUTE
  IS --> ROUTE
  IC --> ROUTE
  PRR --> ROUTE
  WR --> ROUTE
  ROUTE --> JOBS
  PRT --> LEVELS
  CRON --> REPORT
  JOBS --> GH[("GitHub: comments, labels,<br/>branches, pull requests")]
  LEVELS --> GH
  REPORT --> GH
  JOBS <--> OC["opencode run<br/>OpenAI models"]
```

| Layer | Where | What it does |
|---|---|---|
| Workflows | `.github/workflows/ai-autonomous-*.yml` | Triggers, permissions, tokens, checkouts, one job per action |
| Scripts | `tools/agent/*.js` | One script per job: `route`, `review`, `analyze`, `implement`, `ci-gate`, `ci-check`, `chat`, `levels`, `report` |
| Library | `tools/agent/lib/` | GitHub client, state comment, opencode runner, contracts, cost records, logging |
| Roles | `tools/agent/opencode/agents/*.md` | What each model call may do: steps, permissions, output contract |
| Playbooks | `agent-packages/apihub-autonomous-agent/` | Skills that tell a role how to do its work in this repository |

The roles and the models that play them by default (the variables are in
[the technical details](./technical-details.md#openai-models)):

| Role | Flow | Model variable | Default | Edits files |
|---|---|---|---|---|
| `pr-reviewer` | A | `AGENT_MODEL_REVIEW` | `openai/gpt-6-luna:max` | no |
| `verifier` | A | `AGENT_MODEL_VERIFY` | `openai/gpt-6.1-sol:medium` | no |
| `analyst` | B, C | `AGENT_MODEL_LIGHT` | `openai/gpt-6-luna:medium` | no |
| `implementer` | C | `AGENT_MODEL_IMPLEMENT` | `openai/gpt-6.1-sol:high` | yes |
| `self-reviewer` | C | `AGENT_MODEL_REVIEW` | `openai/gpt-6-luna:max` | no |
| `assistant` | D | `AGENT_MODEL_LIGHT` | `openai/gpt-6-luna:medium` | no |
| `ci-triager` | D | `AGENT_MODEL_TRIAGE` | `openai/gpt-6.1-sol:medium` | no |

The rule behind the choice: a better model writes, a different and cheaper one reviews. `lib/config.js` refuses to
start when `AGENT_MODEL_IMPLEMENT` and `AGENT_MODEL_REVIEW` name the same model.

Two switches guard every run. `AGENT_ENABLED` must be `true`, or every script exits without acting. `AGENT_DRY_RUN`
must be exactly `false` for the agent to write to GitHub; otherwise each script writes what it would post to the job
summary. `AGENT_ALLOWED_ACTORS`, while set, limits the agent to the people it names.

## The jobs of the agent workflow

`ai-autonomous-agent.yml` has one entry job, `route`, and one job per action. `route` reads the event and the state,
decides, and passes the decision on as job outputs. Exactly one of the other jobs runs, except `implement` and
`publish`, which run as a pair, and `ci-gate`, which can hand over to that pair in the same run.

```mermaid
flowchart TB
  ROUTE["<b>route</b><br/>route.js<br/>GITHUB_TOKEN read-only<br/>no model"]
  ROUTE -- "action = review" --> REVIEW["<b>review</b><br/>review.js<br/>GITHUB_TOKEN, OpenAI key<br/>pr-reviewer, verifier<br/>reads the PR head as data"]
  ROUTE -- "action = analyze" --> ANALYZE["<b>analyze</b><br/>analyze.js<br/>GITHUB_TOKEN, OpenAI key<br/>analyst"]
  ROUTE -- "action = chat" --> CHAT["<b>chat</b><br/>chat.js<br/>GITHUB_TOKEN, OpenAI key<br/>assistant, read-only"]
  ROUTE -- "action = stop" --> STOP["<b>stop</b><br/>chat.js<br/>GITHUB_TOKEN, actions: write<br/>no model"]
  ROUTE -- "action = ci-gate" --> GATE["<b>ci-gate</b><br/>ci-gate.js<br/>GITHUB_TOKEN, AGENT_PAT<br/>no model, no repository code"]
  ROUTE -- "action = rerun" --> RERUN["<b>rerun</b><br/>ci-gate.js rerun<br/>GITHUB_TOKEN, AGENT_PAT, actions: write<br/>no model, no repository code"]
  ROUTE -- "action = ci-check" --> CICHECK["<b>ci-check</b><br/>ci-check.js<br/>GITHUB_TOKEN, OpenAI key, actions: write<br/>ci-triager, read-only<br/>reads the PR head as data"]
  ROUTE -- "action = implement" --> IMPL
  GATE -- "next = implement" --> IMPL
  subgraph IMPL["<b>implement</b> (the work job)"]
    PRE["Preflight<br/>implement.js preflight<br/>GITHUB_TOKEN, AGENT_PAT<br/>no model code yet"]
    WORK["Work<br/>implement.js work<br/>OpenAI key only<br/>analyst, implementer, self-reviewer<br/>runs repository and model code"]
    PRE -- "proceed = true" --> WORK
  end
  IMPL -- "artifact: outcome.json, bundle" --> PUB["<b>publish</b><br/>implement.js publish<br/>GITHUB_TOKEN, AGENT_PAT<br/>no model, no repository code"]
```

| Job | Runs when | Token and secrets | Model | Code it checks out | Concurrency group |
|---|---|---|---|---|---|
| `route` | every event that passes the `if` filter | `GITHUB_TOKEN` (read) | none | `tools/agent` of the default branch | none |
| `review` | `action == 'review'` | `GITHUB_TOKEN`, `OPENAI_API_KEY` | `pr-reviewer`, `verifier` | the pull request head as data; trusted tools and instructions in `.agent-tools/` | `ai-autonomous-<number>` |
| `analyze` | `action == 'analyze'` | `GITHUB_TOKEN`, `OPENAI_API_KEY` | `analyst` | the default branch | `ai-autonomous-<number>` |
| `ci-gate` | `action == 'ci-gate'` | `GITHUB_TOKEN`, `AGENT_PAT` | none | `tools/agent` | `ai-autonomous-<number>` |
| `implement` | `action == 'implement'` or `ci-gate` says `next == 'implement'` | preflight: `GITHUB_TOKEN`, `AGENT_PAT`; work: `OPENAI_API_KEY` only | `analyst`, `implementer`, `self-reviewer` | the default branch, then the agent's branch | `ai-autonomous-<number>` |
| `rerun` | `action == 'rerun'` | `GITHUB_TOKEN` (`actions: write`, `checks: read`, `statuses: read`), `AGENT_PAT` | none | `tools/agent` of the default branch | `ai-autonomous-<number>` |
| `ci-check` | `action == 'ci-check'` | `GITHUB_TOKEN` (`actions: write`, `checks: read`, `statuses: read`), `OPENAI_API_KEY` | `ci-triager` when CI is red | the default branch; a pull request head as a ref, never checked out | `ai-autonomous-ci-check-<number>` |
| `publish` | `implement` set `proceed == 'true'` | `GITHUB_TOKEN` (`actions: write`, `checks: read`, `statuses: read`), `AGENT_PAT` | none | `tools/agent` of the default branch | `ai-autonomous-<number>` |
| `stop` | `action == 'stop'` | `GITHUB_TOKEN` | none | `tools/agent` of the default branch | none, on purpose |
| `chat` | `action == 'chat'` | `GITHUB_TOKEN`, `OPENAI_API_KEY` | `assistant` for a question | the default branch; a pull request head as a ref, never checked out | `ai-autonomous-chat-<number>` |

Three rules hold for every job:

- **The tools are trusted code.** The scripts, the opencode config, the roles, the skills, the rules, and the
  `AGENTS.md` files always come from the default branch, or, for a `pull_request` event, from the pull request of this
  repository. A pull request from a fork never changes the tools that review it.
- **A step that runs repository code or model-written code has no GitHub token.** The work step of `implement` holds
  the OpenAI key only. The `review`, `analyze`, `chat`, and `ci-check` steps hold `GITHUB_TOKEN` and the OpenAI key
  together, but their roles cannot edit files or run anything but read-only commands, and `lib/opencode.js` starts
  opencode without `GITHUB_TOKEN`, `GH_TOKEN`, `AGENT_PAT`, and the `ACTIONS_*` variables. No checkout keeps a token
  (`persist-credentials: false`).
- **One job per number at a time.** The jobs that write the state comment of an issue or a pull request share the
  group `ai-autonomous-<number>`. `chat` and `ci-check` have their own groups and merge the cost records on write;
  `stop` has none, so a stop never waits behind another job.

## Where the state lives

Runners keep nothing. The agent keeps its memory where people already look.

| Store | Holds | Read by |
|---|---|---|
| The state comment | one comment by `github-actions[bot]` per issue and per pull request: a status for people and a hidden JSON block | every script |
| Labels | `ai:*` (suitability, execution level) and `agent:*` (outcome) | `route`, the scripts, people, the weekly report |
| The pull request marker | `<!-- ai-autonomous-agent issue=<N> -->` in the body of the agent's pull request | `route`, `chat`, `levels`, `report` |
| The branch | the commits of every attempt | `implement`, people |
| Artifacts | prompt inputs, opencode events, answers, `outcome.json`, the Git bundle | `publish` (the bundle and the outcome only), people for debugging |

`route` trusts a pull request as the agent's only when the marker and the state comment of the issue name each other.
The state comment counts only when `github-actions[bot]` wrote it. The schema is in
[the technical details](./technical-details.md#state-comment).

| Label | Set on | By | When |
|---|---|---|---|
| `ai:suitable`, `ai:unsuitable` | issue | `analyze`, `implement` (analysis) | after an analysis, unless a person set one of them |
| `agent:needs-human` | issue, pull request | `analyze`, `publish`, `ci-gate`; removed by `rerun`, `publish` (after an `unrelated` rerun), and `stop` | the agent waits for a person |
| `agent:completed` | issue, pull request | `ci-gate` | CI is green on the agent's pull request |
| `agent:pr-reviewed` | pull request | `review` | after a review is published |
| `ai:l1-executor` | pull request | `ci-gate` | CI is green on the agent's pull request |
| `ai:l0-assistant` ... `ai:l3-autonomous` | issue | `levels` | copied from the merged pull requests that close the issue |

## The phase of an issue

The field `phase` of the issue state says what the agent does with the issue. A pull request state has no phase of its
own: the agent's pull request follows the phase of its issue.

```mermaid
stateDiagram-v2
  [*] --> none: issue opened
  none --> analyzed: analysis suitable or unsuitable
  none --> needs_info: analysis needs-info
  none --> implementing: /agent implement, analysis first
  needs_info --> analyzed: author answers or edits, analysis
  needs_info --> needs_info: answer still not enough
  analyzed --> implementing: /agent implement (preflight)
  needs_info --> implementing: /agent retry
  implementing --> analyzed: work re-analyzed, unsuitable
  implementing --> needs_info: work re-analyzed, needs-info
  implementing --> waiting_ci: publish, pull request green locally
  implementing --> needs_human: publish, draft, blocked, or error
  implementing --> stopped: /agent stop
  waiting_ci --> completed: ci-gate green
  waiting_ci --> implementing: ci-gate red, CI fix
  waiting_ci --> needs_human: ci-gate red, stop rule
  waiting_ci --> stopped: /agent stop
  needs_human --> implementing: answer, retry, change request, review
  needs_human --> waiting_ci: /agent rerun
  implementing --> waiting_ci: publish, CI fix found the failure unrelated
  needs_human --> stopped: /agent stop
  stopped --> implementing: /agent implement or /agent retry
  completed --> implementing: retry or change request
  completed --> [*]: a person merges
```

The diagram writes `needs-info`, `waiting-ci`, and `needs-human` with underscores, because Mermaid state names take no
hyphens. The values in the state are:

| `phase` | Meaning | Written by |
|---|---|---|
| `null` | no analysis or attempt yet | `lib/state.js` (`emptyIssueState`) |
| `analyzed` | the analysis said `suitable` or `unsuitable` | `analyze.js`, `implement.js publish` |
| `needs-info` | the analysis asked the author questions | `analyze.js`, `implement.js publish` |
| `implementing` | an attempt runs; `implementing` names its run, actor, and kind | `implement.js preflight`, `ci-gate.js` |
| `waiting-ci` | the attempt pushed a commit whose local checks and self-review passed, a CI fix reran the checks as `unrelated`, or `/agent rerun` ran; CI decides | `implement.js publish`, `ci-gate.js rerun` |
| `needs-human` | the agent handed over: draft, block, error, or the stop rule | `implement.js publish`, `ci-gate.js` |
| `completed` | CI is green; a person reviews and merges | `ci-gate.js` |
| `stopped` | a person stopped the work | `chat.js` (the `stop` job) |

Three details matter when you read a state:

- An attempt counts as running only for 120 minutes after `implementing.at` (`BUSY_MS` in `implement.js`). A state
  left in `implementing` by a lost run does not block the next command forever.
- `/agent analyze` writes `analyzed` or `needs-info` from any phase. See
  [Known gaps and risks](./handover.md#known-gaps-and-risks).
- `stopped` is written by the `stop` job while the attempt may still run. The `publish` job of that run sees
  `phase == 'stopped'` with its own run in `implementing.run`, records the cost and a `stopped` attempt, and writes
  nothing else.

## Flow A: review

**Trigger.** A pull request opens outside draft, or leaves draft for the first time (`route` reads the pull request
state and skips one that has a review). Then on demand, with `/agent review [notes]` from a person with write access,
also on a pull request from a fork. Dependabot pull requests are never reviewed: the workflow `if` drops their events,
and `route` refuses `/agent review` on them.

```mermaid
sequenceDiagram
  autonumber
  participant GH as GitHub
  participant R as route
  participant V as review job
  participant M as opencode
  GH->>R: pull_request opened or ready_for_review, or /agent review
  R->>R: enabled, actor, write access, Dependabot, earlier review
  R-->>V: action = review, number, command
  V->>V: check out the PR head as data, the tools from the trusted ref
  V->>GH: read the pull request, files, labels, state comment
  V->>V: facts: changed files, Nx projects, module labels, risk areas
  V->>M: pr-reviewer with the facts and the notes
  M-->>V: review JSON: summary, impact, findings
  V->>M: verifier with the findings
  M-->>V: verdict per finding: confirmed, plausible, rejected
  V->>GH: one review, event COMMENT, inline comments
  V->>GH: summary comment with the impact and the state, label agent:pr-reviewed
```

**Decisions.** A rejected finding is dropped. A `plausible` one is kept and marked "plausible, not confirmed". A
finding without a line goes to the summary comment. When a model call fails, the summary comment says so and the
person comments `/agent review` again.

**State.** The pull request state gets a record in `reviews` and the cost records. **Labels:** `agent:pr-reviewed`.
**A person** reads the review; the agent never approves or requests changes.

## Flow B: analysis

**Trigger.** A `Bug` or `Task` issue is opened or gets its type (`issues` `opened`, `typed`), unless a person already
set `ai:suitable` or `ai:unsuitable`. Again when the issue waits for information (`phase == 'needs-info'`) and its
author comments or edits it, at most `AGENT_MAX_ANALYSES` times (default 5). Any time on `/agent analyze`, which the
limit does not count.

```mermaid
sequenceDiagram
  autonumber
  participant GH as GitHub
  participant R as route
  participant A as analyze job
  participant M as opencode
  GH->>R: issues opened or typed, an author's answer, or /agent analyze
  R->>R: type Bug or Task, labels set by a person, author allowed, analysis limit
  R-->>A: action = analyze, trigger
  A->>GH: read the issue, its comments, the state comment
  A->>M: analyst with the issue and its comments
  M-->>A: suitable with a plan, unsuitable with a reason, or needs-info with questions
  A->>GH: read the labels again
  A->>GH: set ai:suitable or ai:unsuitable, or agent:needs-human
  A->>GH: state comment: verdict, reason, plan or questions, cost
  opt needs-info
    A->>GH: a comment that mentions the author and lists the questions
  end
```

**Decisions.** The labels are read again after the model call, so a label that a person set during the run wins. The
agent changes only an `ai:*` label it set itself (`analysis.labelSetBy == 'agent'`). A failed call records the cost
and a `failed` entry in `analyses` and keeps the earlier verdict.

**State.** `phase` becomes `analyzed` or `needs-info`; `analysis` holds the verdict, the reason, the plan or the
questions, and `issueUpdatedAt`; `analyses` grows by one. **A person** decides: the analysis never starts an
implementation.

## Flow C: implementation

**Trigger.** `/agent implement [force] [notes]` or `/agent fix` on an issue. Also the steering commands of
[Flow D](#flow-d-commands) that start an attempt (`kind` `human` or `review`), and the CI gate (`kind` `ci-fix`).

One attempt runs in two jobs. The work job runs code the model wrote, so it holds no GitHub token; the publish job
holds the tokens and runs no model and no repository code.

```mermaid
sequenceDiagram
  autonumber
  participant P as person
  participant GH as GitHub
  participant PF as implement Preflight
  participant W as implement Work
  participant M as opencode
  participant PB as publish
  P->>GH: /agent implement
  GH->>PF: route: action = implement
  PF->>GH: read the issue, comments, state, the Git identity of the AGENT_PAT owner
  alt closed, wrong type, busy, ai:unsuitable without force, open questions
    PF->>GH: a reply that mentions the person and says why
  else proceed
    PF->>GH: state: phase implementing
    PF-->>W: preflight file, proceed = true
    W->>W: set up the workspace, Go, a trusted copy of tools/agent
    opt the issue changed since the analysis
      W->>M: analyst
    end
    W->>W: branch bugfix/N-slug or feature/N-slug
    loop at most AGENT_MAX_REVIEW_ROUNDS rounds
      W->>M: implementer with the playbook, the plan, notes, CI report
      W->>W: one commit (amended in later rounds)
      W->>W: local checks: nx affected -t build test
      W->>M: self-reviewer with the diff and the issue
    end
    W->>W: diff size limit, protected paths, after the last round
    W-->>PB: artifact: outcome.json, Git bundle, logs
    PB->>PB: re-check the branch, the contracts, the diff, the protected paths
    PB->>GH: push with AGENT_PAT, open or update the draft pull request
    PB->>GH: state: attempt, phase, labels, comments
  end
```

**Decisions.**

| Condition | Outcome |
|---|---|
| The issue is closed, or not a `Bug` or `Task` | refused in the preflight |
| An attempt runs (less than 120 minutes old) | refused in the preflight |
| `ai:unsuitable` without `force` | refused; `force` starts it and records `forced: true` |
| The analysis has open questions | refused, unless a person steers (`kind` `human` or `review`) |
| The issue changed since the analysis | the work step runs the analyst first; `needs-info` or `unsuitable` stops the run |
| The implementer reports that it cannot continue, or no change | `blocked`, nothing pushed |
| The diff of the whole pull request is above the limit (`Bug` 20 files or 600 lines, `Task` 30 or 1,000), measured after the last round and again in `publish` | `blocked`, nothing pushed |
| The diff touches a protected path (`.github/workflows/`, `.claude/`, `.cursor/`, `tools/agent/`, `agent-packages/`, any `AGENTS.md` or `CLAUDE.md`) | `blocked`, nothing pushed |
| Local checks and self-review pass | pull request as a draft, `phase` `waiting-ci` |
| Anything else after a push | draft pull request, `agent:needs-human`, `phase` `needs-human` |
| The work job left no outcome | `publish` records the failure and the costs it finds, `agent:needs-human` |

**State.** `implementing` while it runs; then `branch`, `pr`, `playbook`, `forced`, and one record in `attempts`.
**Labels:** `ai:suitable` or `ai:unsuitable` when the work step re-analyzed; `agent:needs-human` when the result is not
green. **A person** reads the draft; only the CI gate marks it ready, and only a person merges it.

## Flow C: the CI loop

**Trigger.** `workflow_run` `completed` of `CI`, `Lint: Code base`, `PR: Title`, `PR: Commit messages`,
`Lint: Markdown links`, or `PR: CLA`. `route` acts only when the head branch belongs to an open pull request of the
agent from this repository, the head commit is the one the run finished for, and the issue is in `waiting-ci`.

```mermaid
flowchart TB
  START(["workflow_run completed"]) --> R{"route: agent PR,<br/>head commit,<br/>phase waiting-ci?"}
  R -- no --> SKIP(["skip"])
  R -- yes --> READ["ci-gate: read check runs and statuses<br/>of the head commit, without the agent's jobs"]
  READ --> PENDING{"any still running<br/>or pending?"}
  PENDING -- yes --> WAIT(["exit: the last run decides"])
  PENDING -- no --> DONE{"already decided<br/>for this commit?"}
  DONE -- yes --> EXIT1(["exit"])
  DONE -- no --> GREEN{"all green?"}
  GREEN -- yes --> FRESH1{"same head and<br/>phase waiting-ci?"}
  FRESH1 -- no --> SUP(["exit: superseded or state-changed"])
  FRESH1 -- yes --> READY["PR ready for review with AGENT_PAT<br/>agent:completed, ai:l1-executor<br/>phase completed, mention the person"]
  GREEN -- no --> REPORT["CI report from the failed job logs<br/>failure signature"]
  REPORT --> E2E{"only E2E jobs failed<br/>(ci-ok aside) and no rerun<br/>of this commit yet?"}
  E2E -- yes --> RERUN(["rerun the failed jobs once per commit"])
  E2E -- no --> RULE{"same signature as before,<br/>or AGENT_MAX_ATTEMPTS spent?"}
  RULE -- yes --> HAND["agent:needs-human on issue and PR<br/>phase needs-human, hand-off comment"]
  RULE -- no --> NEXT["phase implementing, kind ci-fix<br/>output next = implement"]
  NEXT --> IMPL(["implement and publish: a CI fix commit"])
  IMPL -.-> START
  IMPL -- "CI fix answers unrelated" --> UNREL(["publish reruns the failed checks,<br/>phase waiting-ci, no push"])
  UNREL -.-> START
  PERSON(["/agent rerun"]) --> RERUNJOB(["rerun job: rerun the failed checks,<br/>phase waiting-ci, ciGate deleted"])
  RERUNJOB -.-> START
```

**Decisions.** The gate decides once per commit and writes `ciGate` with the commit. Right before it writes, it reads
the pull request and the state again: a newer head means `superseded`, another phase means `state-changed`, and the
gate writes nothing. The budget counts the attempts of kind `initial` and `ci-fix` from the index `budgetFrom`, which
a person's attempt moves to the end of the list.

**The free rerun.** The verdict check `ci-ok` fails together with E2E, so the gate ignores it when it asks whether only
E2E jobs failed. The budget is one rerun per head commit (`e2eRerun: { sha, count }`).

**Hand-offs.** The stop rule and a blocked CI fix write the failed checks (at most five), the first error line, the
reason, and two ways on: `/agent rerun` for a failure the change does not cause, and `/agent retry` with guidance.

**State.** The last attempt gets `result` `ci-green` or `ci-red` and the `signature`; `lastCiReport`, `ciGate`, and
`e2eRerun` are written. **A person** reviews the green pull request, or answers the hand-off.

## Flow D: commands

A command is a comment whose first non-empty line starts with `/agent`. `route` parses it with `lib/commands.js`,
checks the person, and picks the job.

```mermaid
flowchart LR
  C(["issue_comment"]) --> F{"bot, or not allowed,<br/>or no write access?"}
  F -- yes --> S(["skip"])
  F -- no --> P{"command"}
  P -- "help, cost, question" --> CHAT["chat job"]
  P -- "stop" --> STOP["stop job"]
  P -- "review" --> REV["review job"]
  P -- "analyze" --> AN["analyze job"]
  P -- "implement, fix" --> IM["implement job<br/>kind initial"]
  P -- "retry" --> IH["implement job<br/>kind human"]
  P -- "rerun" --> RR["rerun job<br/>no model"]
  P -- "ci_check" --> CC["ci-check job<br/>ci-triager only when CI is red"]
  P -- "text on the agent's PR" --> IC["implement job<br/>kind human, change request"]
  P -- "no command, issue or agent PR<br/>in needs-human" --> IA["implement job<br/>kind human, answer"]
  P -- "no command, author,<br/>issue in needs-info" --> AN
  RV(["pull_request_review<br/>changes requested on the agent's PR"]) --> IR["implement job<br/>kind review"]
```

| Command | Job | Model | Writes |
|---|---|---|---|
| `/agent`, `/agent help` | `chat` | none | a reply with the commands that work there |
| `/agent cost` | `chat` | none | a reply with the cost table |
| `/agent <question>` | `chat` | `assistant` | a reply; the cost record in the state |
| `/agent stop` | `stop` | none | `phase` `stopped`, the cancelled run, no `agent:needs-human`, a reply |
| `/agent retry [notes]` | `implement` | the Flow C roles | a new attempt with a fresh CI budget |
| `/agent rerun [notes]` | `rerun` | none | `phase` `waiting-ci`, `ciGate` deleted, an entry in `reruns`, no `agent:needs-human`; the failed checks run again; no attempt |
| `/agent ci_check [notes]` | `ci-check` | `ci-triager`, only when CI is red | a reply with the verdict, the cause, and the places to fix; the cost record and a `ciChecks` entry on the pull request; a rerun of the failed jobs for a flaky or infrastructure failure, and, on the agent's pull request in `needs-human` or `waiting-ci`, the same state change as `/agent rerun` |
| `/agent <text>` on the agent's pull request | `implement` | the Flow C roles | one attempt on its branch |
| a review with change requests | `implement` | the Flow C roles | one attempt; a reply in each thread the implementer saw |
| `/agent review [notes]` | `review` | Flow A | a review |
| `/agent analyze` | `analyze` | `analyst` | an analysis |
| `/agent implement [force] [notes]`, `/agent fix` | `implement` | the Flow C roles | an attempt |

The `implement`, `rerun`, `ci-check`, `chat`, and `stop` jobs react to the comment with an eyes emoji when they start,
then with a rocket or a confused face; `review` and `analyze` add no reaction. The replies mention the person who
asked and defuse every other mention.

### The CI check

`/agent ci_check` works on any pull request of the repository, also one from a fork, and finds the root cause of a red
CI. The `ci-check` job reads the checks of the head commit and calls the `ci-triager` only when CI is red.

```mermaid
flowchart TB
  C(["/agent ci_check on a pull request"]) --> READ["ci-check: read check runs and statuses<br/>of the head commit"]
  READ --> NONE{"any check?"}
  NONE -- no --> R1(["reply: no check, no model"])
  NONE -- yes --> PEND{"any still running<br/>or pending?"}
  PEND -- yes --> R2(["reply: which checks run, no model"])
  PEND -- no --> GREEN{"all green?"}
  GREEN -- yes --> R3(["reply: green, no model"])
  GREEN -- no --> LOGS["collect the logs of the failed jobs,<br/>CI report and signature of the CI gate"]
  LOGS --> TRI["ci-triager reads the diff and the code:<br/>verdict, cause, fixes, evidence"]
  TRI --> V{"verdict"}
  V -- "change, unknown, or flaky/infra<br/>with low confidence" --> NO["no rerun"]
  V -- "flaky or infra" --> RERUN["rerun the failed jobs"]
  RERUN --> ACC{"accepted, and the agent's PR<br/>in needs-human or waiting-ci?"}
  ACC -- yes --> GATE["issue: phase waiting-ci, ciGate deleted,<br/>no agent:needs-human; the CI gate decides"]
  ACC -- no --> REPLY
  GATE --> REPLY
  NO --> REPLY["cost record and ciChecks entry on the PR,<br/>then the reply"]
```

The job fetches the head of the pull request under `refs/remotes/pull/<number>/head` and never checks it out. The CI
report is the output of the code under test, so it reaches the model inside an `<untrusted>` block. The rerun comes
before every write, as in `/agent rerun`: when GitHub rejects it, nothing else changes. The cost of the call is written
to the state of the pull request also when the call or its contract fails; the issue state is read again right before
the hand-back to the CI gate, so a `/agent stop` or a new attempt in the meantime wins.

## Execution levels

`AI Autonomous: Execution levels` copies the level of a merged pull request to the issues it closes. It uses no model.

```mermaid
sequenceDiagram
  autonumber
  participant GH as GitHub
  participant L as levels job
  GH->>L: pull_request_target closed and merged, or labeled ai:l*
  L->>GH: read the closing issues of the pull request (GraphQL)
  loop each closing issue
    L->>GH: read the merged pull requests that close it and their levels
    L->>L: the lowest level among them
    L->>GH: set that ai:l* label on the issue, remove the others
  end
  opt the pull request has no level and closes an issue
    L->>GH: a reminder comment on the pull request, once
  end
  opt the agent's pull request has commits without an Agent-Run trailer
    L->>GH: a comment with their count, once, the level stays
  end
```

`pull_request_target` gives a write token also for a pull request from a fork; the job checks out the base branch and
runs no code of the pull request. **A person** sets the level on the pull request; the `labeled` event copies it.

## Weekly report

`AI Autonomous: Weekly report` runs on Mondays at 06:00 UTC and on demand with a `days` input. It uses no model.

```mermaid
flowchart LR
  T(["schedule or workflow_dispatch"]) --> Q["report.js: search issues and pull requests<br/>of the last AGENT_REPORT_DAYS days"]
  Q --> S["read the state comments<br/>of the agent's issues and pull requests"]
  S --> N["count: issues by suitability, merged PRs by level,<br/>agent PRs by outcome, reviews, attempts, cost"]
  N --> SUM["job summary"]
  N --> POST{"AGENT_REPORT_ISSUE set<br/>and AGENT_DRY_RUN = false?"}
  POST -- yes --> C["a new comment on that issue"]
```

## Where a person steps in

| Moment | What the person does | What the agent does next |
|---|---|---|
| A review is posted | reads it, fixes the pull request, or asks `/agent review` again | nothing until asked |
| The analysis asks questions | answers in a comment or edits the issue | analyzes again |
| An issue is `ai:suitable` | decides with `/agent implement` | one attempt |
| An issue is `ai:unsuitable` | sets another label, or comments `/agent implement force` | one forced attempt |
| A draft or a block (`agent:needs-human`) | answers in a comment, `/agent retry`, or takes over | one attempt with the comment as guidance |
| The stop rule hands over | the same, or `/agent rerun` when the failure is not the change | one attempt with a fresh CI budget, or the failed checks run again |
| CI is green (`agent:completed`) | reviews, asks changes in a review or with `/agent <text>`, merges | one attempt per review or comment |
| CI is red and the cause is unclear | `/agent ci_check` | the triager names the root cause; a flaky or infrastructure failure is rerun |
| Anything | `/agent stop` | stops at once |
| A pull request is merged | checks or sets the `ai:l*` level | copies it to the issues |
