# Autonomous agent: phase 0 spike

Results of the spike from [the plan](./plan.md#phase-0-prerequisites-and-spike), run on October 23, 2026 with opencode
1.19.4 on `ubuntu-latest`. The workflow and the probes stay on the branch `feature/ai-autonomous-spike`, which is not
merged.

## Answers

| Question | Answer |
|---|---|
| Does opencode find the skills in `.claude/skills/`? | Yes, and loads one by name through its `skill` tool. It skipped 8 of 36 skills whose `SKILL.md` had no `name` in the frontmatter; the sources are fixed |
| Does it attach the module `AGENTS.md` when it reads a file of the module? | Yes: reading `backend/portal-backend/go.mod` attached `backend/portal-backend/AGENTS.md` |
| Does `instructions: [".claude/rules/*.md"]` load the rules? | No: the prompt was the same size with and without it. A relative glob does not reach the hidden `.claude` folder. An absolute path does, so the config uses `{env:GITHUB_WORKSPACE}/.claude/rules/*.md` |
| Do the JSON events carry tokens and cost? | Yes, in `step_finish`: `part.tokens` and `part.cost` (USD). The uncached prompt is in `tokens.cache.write`, not in `tokens.input` |
| Does `--variant` work? | Yes: `medium`, `high`, `xhigh`, and `max` for `gpt-6.1-sol`, `medium` and `max` for `gpt-6-luna` |
| Do bash permission patterns hold? | Yes: `curl`, `gh`, and `git push` were rejected, also inside `bash -c` and after `&&`. `node -e` with a quoted script was rejected although `node *` was allowed, so phase 3 checks the implementer's allow-list command by command |
| Does the `steps` limit end the run cleanly? | Yes: exit code 0, and the final message says the limit was reached |
| Does a push with `AGENT_PAT` start `CI`? | Yes |
| How long does the toolchain take? | `setup-workspace`: 48 s with a warm cache. `actions/setup-go` hung with `cache-dependency-path: '**/go.sum'`, which scans `node_modules`; use the paths of `ci.yml` (`backend/**/go.sum`, `go.work.sum`) |

## Numbers

- The fixed part of the prompt (opencode's system prompt, the skill list, the root `AGENTS.md`) is about 15,700 tokens.
  The second step of a run reads it from the cache.
- A one-word answer cost 0.039 USD on `gpt-6.1-sol` and 0.002 USD on `gpt-6-luna`, almost all of it the uncached
  fixed prompt. A three-step read of a skill and a file cost 0.004 USD on `gpt-6-luna`.
