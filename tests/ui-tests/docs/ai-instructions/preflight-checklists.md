# PRE-FLIGHT & POST-FLIGHT Checklists

Use this file verbatim when constructing the PRE-FLIGHT block. Combine the **Global** list with exactly one task-type list and any ad-hoc user requirements. Mirror the same items inside your todo tracker.

## PRE-FLIGHT — Global Steps

- [ ] **Workspace bootstrap:** if the user didn’t explicitly say whether we’re in the monorepo root or inside `qubership-apihub-ui-tests`, detect `PROJECT_ROOT` automatically (rules in `AGENTS.md` §9) and state `Detected project root: <abs path>`.
- [ ] **Shell scope confirmation:** ensure every subsequent command executes from `PROJECT_ROOT`.
- [ ] **Instruction Access Protocol:** list every required file and mark it `Found + read` only after actually reading it. Minimum set:\
      `.eslintrc.json`, `AGENTS.md`, `docs/ai-instructions/preflight-checklists.md`, the chosen playbook from `docs/ai-instructions/task-playbooks.md`, and any additional docs cited in that playbook (e.g., `docs/CODING_GUIDELINES.md`, `docs/pom-in-practice.md`, `docs/ai-instructions/test-implementation-guide.md`).\
      If any file is missing/unreadable, stop and request guidance.
- [ ] **Checklist snapshot:** note `Checklist ➜ loaded from <doc>` so reviewers can match steps to their source.
- [ ] **Task type declaration:** state the chosen playbook and why it applies.
- [ ] **Todo mirror:** create/refresh the todo list so each PRE-FLIGHT item has a matching entry.
- [ ] **Plan validation commands:** outline which lint/test commands will run (even if some end up `n/a`).
- [ ] **Formatting, type check & lint plan:** confirm all new files use LF endings and specify the aggregate commands you will run (`npx tsc --noEmit`, `npx dprint fmt <files>`, `npx eslint --fix <files>`).
- [ ] **Environment prerequisites:** verify mandatory local folders exist if needed.

## PRE-FLIGHT — Task-Type Add-ons

Only include the section that matches the selected playbook.

### Feature Analysis

- [ ] Read `docs/ai-instructions/feature-analysis-guide.md`.
- [ ] Confirm output path for `feature-overview.md`.
- [ ] Check for existing documentation or similar features.

### Test Strategy

- [ ] Read `docs/ai-instructions/test-strategy-guide.md`.
- [ ] Ensure `feature-overview.md` is available and understood.
- [ ] Review `docs/CODING_GUIDELINES.md` section on Test Data Management.

### Technical Design

- [ ] Read `docs/ai-instructions/technical-design-guide.md`.
- [ ] Ensure `test-plan.md` and `feature-overview.md` are available.
- [ ] Review `docs/pom-in-practice.md` for architectural patterns.

### Test Implementation

- [ ] Read `docs/ai-instructions/test-implementation-guide.md` in full.
- [ ] Load the relevant functional specification/story (cite path or ticket).
- [ ] Confirm availability of POM components and test data referenced in the plan.

### POM

- [ ] Review `docs/pom-in-practice.md` → relevant component family (cite section).
- [ ] Re-read `docs/CODING_GUIDELINES.md` → _Page Object Model_ + _Locator Strategy_.
- [ ] List every POM class/component you expect to touch and confirm their current API (via code search or doc references).

### Test Data Management

- [ ] Review `docs/CODING_GUIDELINES.md` → _Test Data Management_.
- [ ] Inspect the colocated specs/helpers that will consume the data and justify why it needs to live outside the spec (if at all).
- [ ] Decide `_N` vs `_R` for every artifact and document which Playwright hooks will create/clean it up.

### Test Support Services

- [ ] Review the target files under `src/services/**` and note the existing API/patterns.
- [ ] Confirm there is no overlapping service with the same responsibility (link to the inspected files).
- [ ] Identify which tests/fixtures rely on this service so you can verify backward compatibility later.

### Debugging / Fix

- [ ] Load failure evidence (trace, screenshot, logs).
- [ ] Identify the failing test spec and the specific step.
- [ ] Determine if this is a regression (did it pass before?) or a new test failure.

### Documentation

- [ ] List every document/section/table you need to touch so no outdated guidance remains.
- [ ] Validate fenced code blocks: for TS/JS snippets run a quick lint (e.g., `npx eslint --stdin --ext .ts` via copypaste or temporary file) to ensure they stay error-free.
- [ ] Check whether diagrams, tables, or external links also need updates and note the plan.

### Misc / Utility

- [ ] Define the exact scope (files + config/doc targets) and state why it falls under Misc.
- [ ] Identify any secondary docs/configs that need review (list them explicitly).

## POST-FLIGHT — Always Required

- [ ] TypeScript check: `npx tsc --noEmit` ✅/❌ (note any pre-existing errors in unrelated files).
- [ ] Formatting: `npx dprint fmt <files>` ✅/❌ (note any errors).
- [ ] Lint command executed: `npx eslint --fix <all-changed-files>` ✅/❌ (quote the exact CLI and attach failure logs if ❌).
- [ ] Tests executed (quote CLI + flags or state `n/a` with justification).
- [ ] Instruction docs updated? list touched paths or `n/a`.

- [ ] Todo list updated to reflect completion.
- [ ] Mention any follow-up actions, blockers, or newly documented errors.

Keep the formatting identical in every run so auditors can quickly verify that no steps were skipped.
