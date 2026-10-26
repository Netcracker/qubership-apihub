# Autonomous agent: implementation plan

Status: draft for review, revision 3 of October 23, 2026. The design is in [design.md](./design.md).

Update, 26 October 2026: skills are committed under `.agents/skills/`. `.claude/skills/` and `.cursor/skills/` are
gitignored. Phase 0.4 below records the earlier deletion of a stale `.agents/` tree; that deletion is superseded for
the skill tree. Rules stay in `.claude/rules/` and `.cursor/rules/`.

Six phases, each one a pull request or a few, each one useful on its own. Flow A goes first: it writes nothing to
the code, so it tests the platform (the tokens, opencode in CI, skills, state, cost records) at the lowest risk. Every
phase starts behind the repository variable `AGENT_ENABLED` and with `AGENT_DRY_RUN=true`, which writes the would-be
comments and labels to the job summary instead of GitHub.

Sizes: S is up to a day of work, M is two to three days, L is about a week.

## Phase 0: prerequisites and spike

Goal: everything outside the code is ready, and the unknowns of the design have answers.

| # | Task | Size |
|---|---|---|
| 0.1 | A fine-grained PAT for `Netcracker/qubership-apihub`: Contents and Pull requests read and write, no Workflows. Secrets `AGENT_PAT` and `OPENAI_API_KEY` | S |
| 0.2 | Repository variables: `AGENT_ENABLED`, `AGENT_DRY_RUN`, the limits from [the design](./design.md#budgets-and-the-stop-rule), and the Balanced models: `AGENT_MODEL_IMPLEMENT=openai/gpt-6.1-sol:high`, `AGENT_MODEL_REVIEW=openai/gpt-6-luna:max`, `AGENT_MODEL_LIGHT=openai/gpt-6-luna:medium` (the verifier uses the implement model at medium effort) | S |
| 0.3 | `tools/agent/labels.sh` and `labels.ps1`: create or update the `ai:*` and `agent:*` labels with their colors and descriptions | S |
| 0.4 | Delete `.agents/` and ignore it in the root `.gitignore`. The linter exclusions of `.agents/` stay: they cover every APM-deployed tree, present or not, and keep a local copy out of the checks | S |
| 0.5 | Spike, in a throwaway workflow `AI Autonomous: Spike` on a branch: see the list below | M |

The spike answers, with a short note in this folder ([spike.md](./spike.md), done):

- Does opencode 1.19.x in a runner discover the skills in `.claude/skills/` and load the one a prompt names?
- Does it attach the module `AGENTS.md` when it reads a file under `backend/portal-backend/`?
- `instructions: [".claude/rules/*.md"]`: how many tokens does it add, and does the model follow the scope written in
  each rule? Does `apm install --target opencode` give a better result?
- Do the `--format json` events carry the input, cached, and output tokens and the cost per message, as `cost.js`
  needs? What does one review and one implementation attempt cost with the chosen models?
- Does `--variant` set the reasoning effort of the OpenAI models we chose?
- Does a bash permission pattern deny `curl`, `gh`, and `git push` reliably, including inside `bash -c`?
- Does the `steps` limit of an agent end the run cleanly, with a final message the script can read?
- How long does the setup take with `.github/actions/setup-workspace` and `actions/setup-go`, warm and cold?

Done when: a push with `AGENT_PAT` starts `CI`; a comment by `github-actions[bot]` starts no workflow; the spike note
answers every question above; the design is updated where the answers differ from it.

## Phase 1: foundation and pull request review (Flow A)

Goal: every pull request that opens outside draft gets an AI review with an impact assessment, and its cost is on
record.

| # | Task | Size |
|---|---|---|
| 1.1 | `tools/agent/opencode/opencode.json`: OpenAI provider, `"share": "disabled"`, default permissions, instruction files from the spike | S |
| 1.2 | Agent files `pr-reviewer.md` and `verifier.md`: model variable, read-only permissions, step limit, the JSON output contract | S |
| 1.3 | `tools/agent/github.js`: thin wrapper over the GitHub REST API (`fetch`): comments, reviews, labels, permissions, check runs; picks `GITHUB_TOKEN` or `AGENT_PAT` per operation | M |
| 1.4 | `tools/agent/route.js`: event to decision (`review`, `analyze`, `implement`, `ci-gate`, `chat`, `skip`) with the reason; permission check; bot guard; agent pull request check; model inequality check | M |
| 1.5 | `tools/agent/context.js`: the prompt input for Flow A, with untrusted text marked; `impact-facts.json` from Nx and the changed paths | M |
| 1.6 | `tools/agent/state.js` and `cost.js`: read and write the hidden state block; one cost record per run, written also when the run fails | M |
| 1.7 | `tools/agent/publish.js`: validate the JSON output against its schema, post the review and the summary comment, edit the summary on `/agent review`, set `agent:pr-reviewed` | M |
| 1.8 | `agent-packages/apihub-autonomous-agent/` with the `apihub-pr-review` skill; add it to `apm.yml`; run `apm install --target cursor,claude --legacy-skill-paths` | M |
| 1.9 | `.github/workflows/ai-autonomous-agent.yml` (`AI Autonomous: Agent`) with the `route` and `review` jobs; add the `AI Autonomous:` group to the workflow table of `docs/development/ci.md`; triggers `pull_request` (`opened`, `ready_for_review`) and `issue_comment` for `/agent review` | M |
| 1.10 | Tests: `tools/agent/*.test.js` with recorded event payloads for `route.js`, schema cases for `publish.js`, state round trips; add `tools/agent/**/*.test.js` to `pnpm test:tools` | M |
| 1.11 | `docs/development/autonomous-agent.md` for contributors (commands, labels, how to read the agent's comments); link it from `docs/development/README.md`, `docs/development/ci.md`, and `AGENTS.md` | S |

Done when: in dry-run on ten recent merged pull requests, the summaries name the right modules and flag the API,
migration, and deploy changes that the pull requests had, and the reviewers of those pull requests judge most findings
useful; then live for two weeks without a review of a draft, a second automatic review of the same pull request, or a
duplicated summary.

## Phase 2: issue analysis (Flow B)

Goal: every new `Bug` and `Task` issue gets `ai:suitable`, `ai:unsuitable`, or questions.

| # | Task | Size |
|---|---|---|
| 2.1 | Agent file `analyst.md`; skill `apihub-issue-analysis` in the package; `apm install` | M |
| 2.2 | The `analyze` job: triggers `issues` `opened`, `typed`, and `edited`, an author comment while information is missing, and `/agent analyze`; skip issues with a label set by a person | M |
| 2.3 | Publish: the label or `agent:needs-human` with the questions; the verdict, the reason, and the plan in the state comment; the analysis limit | S |
| 2.4 | Tests: routing of the issue events, the label rules (a person's label wins), the analysis limit | S |
| 2.5 | `.github/workflows/ai-autonomous-levels.yml` (`AI Autonomous: Execution levels`) and `tools/agent/levels.js`: copy `ai:l*` from merged pull requests to the issues they close, the lowest level wins, reminders for a missing level and for people's commits on an agent pull request; tests | M |

Done when: in dry-run on about thirty closed `Bug` and `Task` issues, maintainers agree with most verdicts, and every
`needs-info` question is one a maintainer would have asked; then live. A merged pull request with `ai:l0-assistant`
gives its closing issue the same label, and a second pull request with a lower level lowers it.

## Phase 3: implementation up to the pull request (Flow C without the CI loop)

Goal: `/agent implement` on a `Bug` or `Task` issue ends in either a pull request that passes the local checks and the
self-review, or a comment that says what is missing.

| # | Task | Size |
|---|---|---|
| 3.1 | Agent files `implementer.md` and `self-reviewer.md` with their contracts and shell permissions | M |
| 3.2 | Skills `apihub-bug-fix`, `apihub-task`, and `apihub-ci-failure-triage` in the package; `apm install` | M |
| 3.3 | `tools/agent/budget.js`: attempts, rounds, diff size per playbook | S |
| 3.4 | The `implement` job: toolchain setup, reuse or rerun of the analysis, branch, implement, local checks, self-review rounds, commit with the `Agent-Run` trailer, push and pull request with `AGENT_PAT`, the agent marker, state, labels | L |
| 3.5 | The command parser for `/agent implement`, `/agent fix`, and the `force` form; on an `ai:unsuitable` issue without `force`, the reply with the reasons and the hint; `forced: true` in the state | S |
| 3.6 | Artifacts: sanitized session export, prompt inputs, outputs; 30-day retention | S |
| 3.7 | Tests for `budget.js` and the commit and pull request formats; a dry run on a sandbox branch | M |

Done when: on about ten closed `Bug` and `Task` issues, replayed against the commit before their fix, the agent opens
a pull request or asks a correct question for each; the pull requests follow the branch, title, and template
conventions; no run exceeds the step or time limit without a hand-off comment.

## Phase 4: the CI loop and the stop rule

Goal: the agent reacts to its own red CI and stops in time.

| # | Task | Size |
|---|---|---|
| 4.1 | `tools/agent/ci-report.js`: failed jobs, trimmed `--log-failed` output, E2E report names, the failure signature | M |
| 4.2 | The `ci-gate` job on `workflow_run` `completed` of `CI`, `Lint: Code base`, `PR: Title`, `PR: Commit messages`; wait until every check of the head commit is done | M |
| 4.3 | The next attempt from the gate, with the CI report as input; the one free E2E rerun | M |
| 4.4 | The stop rule: attempts spent, the same signature twice, diff size; the hand-off comment | M |
| 4.5 | `agent:completed` and `ai:l1-executor`; the pull request leaves draft (with `AGENT_PAT`); the report on the issue | S |
| 4.6 | Tests for the signature (stable across log noise such as timestamps and run IDs) and for the gate decisions | M |

Done when: a planted failure (a broken unit test, a lint error, a wrong pull request title) is fixed in one attempt; a
failure the agent cannot fix stops with `agent:needs-human` after at most the attempt budget, and earlier when the
signature repeats; `agent:completed` appears only with every check green.

## Phase 5: conversation (Flow D)

Goal: people steer the agent with comments and see what it has cost.

| # | Task | Size |
|---|---|---|
| 5.1 | The `chat` job and the rest of the commands: `retry`, `stop`, `review`, `cost`, and free text | M |
| 5.2 | Agent file `assistant.md`; answers on issues and on pull requests of people | S |
| 5.3 | `/agent cost`: the table of runs and the total for an issue with its pull requests, or for a pull request | S |
| 5.4 | Resume on a human answer to `agent:needs-human`, with or without `/agent` | M |
| 5.5 | `pull_request_review` `submitted` with change requests on the agent's pull request: one attempt over all unresolved threads, replies in each thread | M |
| 5.6 | Reactions on the triggering comment (eyes, then rocket or confused) so people see the agent took it | S |

Done when: each command works on an issue and on a pull request; a comment from a user without write access changes
nothing; a reply to a hand-off resumes the flow once, not once per comment; `/agent cost` matches the sum of the cost
records in the state.

## Phase 6: reporting

Goal: the team sees the progress toward autonomy. Task 6.1 is done; 6.2 is open.

| # | Task | Size |
|---|---|---|
| 6.1 | A weekly report workflow: issues and pull requests by `ai:*` and `agent:*` label, attempts, the share of `agent:completed`, forced attempts and their outcome, and cost from the state comments, as a job summary or a pinned issue | M |
| 6.2 | Review the case for `ai:l2-agent`: an implementation that starts by itself on `ai:suitable` issues of a narrow class | S |

## Files this plan adds

```text
.github/workflows/ai-autonomous-agent.yml
.github/workflows/ai-autonomous-levels.yml
tools/agent/
  route.js  context.js  state.js  budget.js  cost.js  ci-report.js  publish.js  github.js  levels.js
  *.test.js  fixtures/
  labels.sh  labels.ps1
  opencode/opencode.json
  opencode/agents/{analyst,implementer,self-reviewer,pr-reviewer,verifier,assistant}.md
agent-packages/apihub-autonomous-agent/
  skills: apihub-issue-analysis, apihub-bug-fix, apihub-task, apihub-pr-review, apihub-ci-failure-triage
docs/development/autonomous-agent.md
```

Changed files: `apm.yml` and `apm.lock.yaml`, the deployed `.claude/` and `.cursor/` trees, `package.json`
(`test:tools`), `.lycheeignore`, `.github/workflows/link-checker.yaml`, `tools/README.md`,
`docs/development/README.md`, `docs/development/ci.md`, `docs/development/ai-assistants.md`, and `AGENTS.md`.
Deleted: `.agents/`.

## Risks

| Risk | Mitigation |
|---|---|
| opencode 2.0 drops or changes what we use | Pin 1.x; keep the engine behind one call in `tools/agent/`; Codex is the fallback |
| The PAT expires or its owner leaves | An expiry date in the team calendar; a GitHub App or a machine user replaces it by changing one secret |
| The PAT owner cannot approve the agent's pull requests | Accepted: a second maintainer reviews |
| Spending grows unnoticed without a cap | `/agent cost` on every issue and pull request; the weekly report adds it up |
| Model prices change after the launch period | The models are repository variables; the Economy set is one change away |
| Prompt injection through issues or comments | No GitHub token in the model step; write flows for maintainers only; narrow shell permissions |
| Noisy reviews make people ignore them | The verifier pass; dry-run calibration before going live; no approvals or change requests from the agent |
| The 45-minute E2E makes each attempt slow | Local checks before the push catch most failures; E2E failures get one free rerun before an attempt is spent |
| CI loops on a flaky test | The failure signature stops a repeat; the hand-off names the test |
