# Interview

Ask before writing anything. For each question, first find the likely answer in the repository (the source column)
and offer it as the recommended option; ask only to confirm, correct, or fill what the repository cannot tell. Use the
question tool with at most four questions per round, recommended option first.

## Round 1: what is tested

| # | Question | Find it first in | Default |
| --- | --- | --- | --- |
| 1 | What feature or fix is tested, and which issue or story describes it? | Branch name, commit messages, linked issues | The branch's commits summarized in one paragraph |
| 2 | Which branch and which base? | `git branch --show-current`; merge base with `main` | Current branch against `main` |
| 3 | Which viewers and components changed? | `git diff --stat <base>...HEAD -- frontend/api-doc-viewer` ([analysis.md](analysis.md)) | The viewers the diff touches |
| 4 | Which display modes (`detailed`, `simple`) and layouts (plain, with diffs) are in scope? | The changed viewers' props; the host app's toggles | Both modes, both layouts, limited by what the host app reaches |

## Round 2: sources of truth and samples

| # | Question | Find it first in | Default |
| --- | --- | --- | --- |
| 5 | Which fixture suites are the source of truth for the expected behavior? | `packages/samples/*/README.md`, the screenshot ITs of the changed viewers | Every suite of the changed viewers, plain and diffs |
| 6 | Which samples are missing and must be written (combinations the suites lack, cases the user names)? | The design's case matrices; gaps between the change and the suites | Propose a list; write them as new fixtures of the plan |
| 7 | Are there special samples outside the repository (a regression folder, customer documents)? Where? | Ask | None; copy given folders into `qa-<feature>/samples/<name>/` unchanged |
| 8 | Which other API types share the changed code and need a regression pass? | Imports of the changed shared modules ([analysis.md](analysis.md)) | Every API type whose viewer imports a changed module |

## Round 3: backlog, performance, mandatory checks

| # | Question | Find it first in | Default |
| --- | --- | --- | --- |
| 9 | Should GitHub or GitLab issues be retested? Which repositories, boards, and labels? The repository lives on both. | `git remote -v`; the monorepo and its pre-monorepo repositories | GitHub: the monorepo and the old repositories of the changed modules; GitLab: ask for the host and projects |
| 10 | Is `gh` signed in (`read:project` for boards)? Is a GitLab token available (`read_api`)? | `gh auth status`; the environment | Ask the user to sign in with `! gh auth login` |
| 11 | Is a performance pass needed (document size, schema depth, a real large contract, thresholds)? | Deep or recursive schemas in the change; lazy building | Yes when tree building or diffs changed; propose thresholds |
| 12 | Which cases need a mandatory check (for example "the portal does not freeze" for cycles and deep schemas)? | Recursive structures in the change | NF on every case with cycles or schemas 5 or more levels deep |

## Round 4: shape of the result

| # | Question | Find it first in | Default |
| --- | --- | --- | --- |
| 13 | How many manual cases (a budget), how many testers, how many days? | — | 200–300 cases for a large change, about 4 minutes each |
| 14 | The folder name, and how QA will get it (a branch link, a zip)? | — | `qa-<feature>` at the repository root; a link to the branch, so that baselines resolve |
| 15 | Are there decisions to record for the team (cells the host app cannot reach)? | Phase 2 facts | List them in the plan README as "Decisions needed" |

## Rules

- Do not invent an answer that changes the scope. Where the user does not know, record the assumption in the plan
  README and move on.
- A later message of the user can change scope at any time ("include JSON Schema too", "split it into packages"):
  update the plan, the config, and the counts in every document together.
