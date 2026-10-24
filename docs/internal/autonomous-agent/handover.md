# Autonomous agent: handover

The state of the AI Autonomous agent proof of concept on October 24, 2026, and how to take it from here. Read it with
[the design](./design.md), [the plan](./plan.md), and [the spike results](./spike.md). The guide for contributors is
[AI Autonomous agent](../../development/autonomous-agent.md). Tracking issue: #939.

## Where things are

| What | Where |
|---|---|
| Workflows | `.github/workflows/ai-autonomous-agent.yml` (`AI Autonomous: Agent`), `ai-autonomous-levels.yml` (`AI Autonomous: Execution levels`), `ai-autonomous-report.yml` (`AI Autonomous: Weekly report`) |
| Scripts | `tools/agent/*.js`: `route`, `review`, `analyze`, `implement` (`preflight`, `work`, `publish`), `ci-gate`, `chat`, `levels`, `report` |
| Library | `tools/agent/lib/`: `config`, `state`, `github`, `opencode`, `agent-call`, `contract`, `usage`, `log`, `prompt`, `text`, `commands`, `facts`, `diff`, `reactions` |
| Roles (opencode agents) | `tools/agent/opencode/agents/*.md`: `pr-reviewer`, `verifier`, `analyst`, `implementer`, `self-reviewer`, `assistant`; config `tools/agent/opencode/opencode.json` |
| Playbooks (skills) | `agent-packages/apihub-autonomous-agent/`: `apihub-pr-review`, `apihub-issue-analysis`, `apihub-bug-fix`, `apihub-task`, `apihub-ci-failure-triage` |
| Tests | `tools/agent/**/*.test.js`, run by `pnpm test:tools` |
| Labels | `tools/agent/labels.sh` and `labels.ps1` |

## The stack of pull requests

Each phase targets the branch of the phase before it. Merge them from the top down: #941 into #940, #940 into #938,
and so on, then #934 into `develop`, after the documentation of
[Before the merge into develop](#before-the-merge-into-develop) is written. Every branch already contains `develop` with #932, so the
last merge has no conflicts. #934 closes #939.

| Phase | Pull request | Branch |
|---|---|---|
| 0: prerequisites, spike, design | #934 into `develop` | `feature/ai-autonomous-phase-0` |
| 1: pull request review | #935 | `feature/ai-autonomous-phase-1` |
| 2: issue analysis, execution levels, logs | #936 | `feature/ai-autonomous-phase-2` |
| 3: implementation on `/agent implement` | #937 | `feature/ai-autonomous-phase-3` |
| 4: CI loop, stop rule, work and publish split | #938 | `feature/ai-autonomous-phase-4` |
| 5: commands and conversation | #940 | `feature/ai-autonomous-phase-5` |
| 6: weekly report, fixes from the review of #940, this handover | #941 | `feature/ai-autonomous-phase-6` |

## What has run for real

- The spike: opencode 1.19.4 in Actions, skills, nested `AGENTS.md`, variants, cost events, a push with `AGENT_PAT`
  that starts `CI`. Results in [spike.md](./spike.md).
- Flow A (review) in dry run on every pull request of the stack. Each review found real problems in the agent's own
  code, and each was fixed in the next phase; that history is in the commit messages ("from the AI review of #N").
  A review cost 0.06 to 0.55 USD.

Nothing else has run on GitHub yet: `issues`, `issue_comment`, `workflow_run`, `pull_request_review`, and
`pull_request_target` take the workflow from the default branch, so analysis, implementation, the CI loop, the
commands, and the level copy run only after the stack reaches `develop`. They are covered by unit tests and by
`*.main.test.js` tests over fake GitHub and opencode clients.

## Before the merge into develop

The stabilization on `develop` comes after the merge, but the documentation comes before it: the stack does not merge
until these two documents exist, in `docs/internal/autonomous-agent/`, on the branch of the last phase (or of a new
phase 7 pull request on top of #941). The design and the plan describe intentions; these describe what was built.

1. **`architecture.md`: the logic at a high level, with diagrams.** For each flow (review, analysis, implementation,
   CI loop, commands, execution levels, weekly report): the trigger, the jobs in order, the decisions and their
   outcomes, the labels and the state each flow reads and writes, and where a person steps in. Draw the diagrams in
   Mermaid (GitHub renders it): one sequence or flow diagram per flow, one diagram of the jobs of
   `ai-autonomous-agent.yml` and what each job may do (tokens, model, repository code), and the state machine of an
   issue (`phase` values and the transitions between them). Keep it readable for a maintainer who has not seen the
   code.
2. **`technical-details.md`: the technical reference.** Every third-party piece and how and where it is used:
   opencode (the pinned version, the `run` flags, the config keys, the JSON events, the permission patterns, what was
   learned in the spike), the OpenAI models and the variables that choose them, the GitHub REST and GraphQL calls
   (per script, with the token each one uses), the GitHub Actions used (with versions), APM and its version,
   `yaml`, and the `nx` and `pnpm` commands of the local checks. Then the sources, one entry each, from the workflow
   files down: every job of the three workflows (trigger, permissions, secrets, steps), every script in
   `tools/agent/` and every module in `tools/agent/lib/` (purpose, inputs and environment, outputs, what it writes to
   GitHub, its tests), every role in `tools/agent/opencode/agents/`, every playbook skill, the state comment schema,
   the JSON contracts of the model outputs, and the files of an artifact.

Write both with the `english-developer-style` and `markdown-line-length-120` skills, link them from
`docs/internal/README.md` and from this handover, and check every path and name against the code; a document that
disagrees with the code is worse than none. The agent's own review (Flow A) on that pull request is a good last check.

## Bring it up on develop

1. Merge the stack (above).
2. Create the labels: `bash tools/agent/labels.sh` (or `pwsh tools/agent/labels.ps1`).
3. Settings: `AGENT_ENABLED=true`, `AGENT_ALLOWED_ACTORS=alagishev`, `AGENT_DRY_RUN` unset (dry run). Secrets
   `OPENAI_API_KEY` and `AGENT_PAT` exist. Limit the OpenAI key with a project budget: model-written code in the work
   job can read it.
4. Dry run, in this order, and read the job summary and the log of each run:
   - open a pull request outside draft: review;
   - open a `Bug` and a `Task` issue: analysis;
   - comment `/agent help`, `/agent cost`, then `/agent implement` on a suitable issue: preflight, work, publish (dry
     run pushes nothing);
   - check `AI Autonomous: Execution levels` on a merged pull request with an `ai:l*` label.
5. Set `AGENT_DRY_RUN=false` and repeat on one small, real bug. Watch the draft pull request, the CI gate, and the
   state comment of the issue.
6. Widen `AGENT_ALLOWED_ACTORS`, then remove it, when the results hold up.

## Known gaps and risks

| Gap | Effect | Where to fix |
|---|---|---|
| The OpenAI key is in the work job with model-written code | prompt injection could leak it | accepted for the proof of concept; a separate model proxy job would close it |
| The state comment is written by several jobs | two jobs may write it close together; costs are merged on write, other fields are last-writer-wins | a lock, or a store per flow |
| `issue.updated_at` decides whether the analysis is fresh | almost every `/agent implement` re-runs the analysis (a light-model call) | keep a digest of title, body, and people's comments in the state |
| The gate counts every check of the commit and requires `ci-ok` | a check that never reports keeps the gate waiting | a timeout, or a list of required checks |
| `outcome.json` and the bundle come from the job that runs model code | publish re-checks the branch, the diff size, and the protected paths, but takes the commit message as given | rebuild the commit message in publish |
| opencode 1.x is pinned; the 2.0 line has no `github` command and may change `run` | an upgrade needs a check of the CLI flags and the JSON events | `tools/agent/lib/opencode.js` is the only caller |
| Rules in `.claude/rules/` are loaded all at once | about 7,000 tokens per run; their path scope is in their text only | the APM `opencode` target or a small plugin |
| The local APM must be 0.34.0 | an older APM rewrites `.cursor/rules` in another format | upgrade with `pip install apm-cli==0.34.0` |

## How the work was done

Specs and prompts first, code by cheaper subagents, review by the agent itself. Each phase had a written spec; the
subagents (Sonnet for modules, Haiku for mechanical work) wrote the code and the tests from it; the result was read,
fixed where needed, committed, and reviewed by the agent's own Flow A on its pull request. Follow the same loop for
changes: the tests are fast (`node --test "tools/agent/**/*.test.js"`, about 640 tests), and every flow has a dry run.

Conventions that matter:

- Workflow names start with `AI Autonomous:`; scripts log every stage with `log.group` and every decision with
  `log.info`.
- People's text and model output reach a model only through `untrusted()` from `tools/agent/lib/prompt.js`.
- The model never gets a token. The jobs that run model or repository code hold the OpenAI key only.
- Test data must not look like secrets or e-mail addresses: the CyberFerret pre-commit hook rejects them.
- Pull requests of the stack say "Part of #939"; only the one into `develop` says "Closes #939".
