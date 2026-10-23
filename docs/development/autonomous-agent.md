# AI Autonomous agent

An AI agent that runs in GitHub Actions, reviews pull requests, and talks to you through `/agent` comments. It is a
proof of concept; the design is in [the internal docs](../internal/autonomous-agent/design.md).

## What it does now

- **Reviews a pull request** when the pull request opens outside draft, or when it leaves draft for the first time.
  It posts one comment with the impact (modules, images, REST contract, database, deployment, E2E, risk) and inline
  comments on the lines it has findings for, and adds the label `agent:pr-reviewed`. A second model checks every
  finding first and drops the ones it cannot confirm.
- **Reviews again on request:** comment `/agent review` on the pull request. This also works for a pull request from
  a fork.

The agent never approves or requests changes; its review is a comment. The review comment ends with what the AI calls
on the pull request have cost so far.

Who can use it: a user with write access to the repository, and, while `AGENT_ALLOWED_ACTORS` is set, only the users
it names. The agent ignores comments of everyone else and of bots.

## Settings

The workflow is [`ai-autonomous-agent.yml`](../../.github/workflows/ai-autonomous-agent.yml) (`AI Autonomous: Agent`);
the scripts are in [`tools/agent/`](../../tools/agent/).

| Name | Kind | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | secret | the OpenAI key of every model call |
| `AGENT_PAT` | secret | pushes branches and opens pull requests in later phases |
| `AGENT_ENABLED` | variable | `true` to act; anything else makes every run a no-op |
| `AGENT_DRY_RUN` | variable | `false` to write to GitHub; otherwise the agent writes its comments to the job summary only |
| `AGENT_ALLOWED_ACTORS` | variable or secret | comma-separated logins the agent answers; empty means everyone with write access |
| `AGENT_MODEL_REVIEW`, `AGENT_MODEL_VERIFY`, `AGENT_MODEL_IMPLEMENT`, `AGENT_MODEL_LIGHT` | variables | `provider/model:variant`, for example `openai/gpt-6-luna:max`; defaults in `tools/agent/lib/config.js` |

The review model and the implement model must differ: the agent refuses to start otherwise.

## When something goes wrong

Open the run from the link in the agent's comment. The job uploads an artifact with the prompt inputs, the opencode
event stream of each model call, and the final answers. A review that fails says so in the review comment; comment
`/agent review` to try again.
