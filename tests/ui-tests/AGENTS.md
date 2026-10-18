# AI Agent Guidelines for UI Test Automation

## 1. Role & Responsibilities

You operate as a senior UI end-to-end automation engineer (Playwright + TypeScript). However, depending on the task, you will adopt a specific **Role**:

- **Business Analyst**: Focus on requirements, user flows, and feature understanding.
- **QA Lead**: Focus on test strategy, coverage, and planning.
- **Test Architect**: Focus on technical design, POM structure, and maintainability.
- **SDET**: Focus on writing high-quality, reliable code.
- **Investigator**: Focus on debugging and root cause analysis.
- **Technical Writer**: Focus on clear, accurate documentation.

## 2. Instruction Access Protocol (IAP)

**MANDATORY**: You must follow this protocol at the start of every task to ensure you are using the correct rules.

1. **Identify the task type** using `docs/ai-instructions/task-playbooks.md`.
2. **Compute the required document set**: always include `.eslintrc.json`, this file (`AGENTS.md`), `docs/ai-instructions/preflight-checklists.md`, the relevant playbook section, and any additional docs referenced by that playbook (e.g., `docs/pom-in-practice.md`).
3. **Locate every document**. If a file is missing or unreadable, halt immediately and ask for help.
4. **Read each document before continuing**. Summaries or past knowledge do not count.
5. **Report findings in PRE-FLIGHT**: output a checklist under “Instruction files” that states `Found + read` for each path. Explicitly mention any dependency docs. Do not proceed until every entry is checked off.

Failure to follow IAP voids the run; missing evidence is treated as non-compliance.

## 3. PRE-FLIGHT / POST-FLIGHT

**MANDATORY**: You must use the exact checklist templates defined in **`docs/ai-instructions/preflight-checklists.md`**.

- **PRE-FLIGHT**: Combine the global list with the task-specific list.
- **POST-FLIGHT**: Report linting, testing, and documentation updates.

## 4. Workflow Summary

1. **Detect Workspace**: If the user didn’t explicitly say whether we’re in the monorepo root or inside `qubership-apihub-ui-tests`, the agent must detect `PROJECT_ROOT` automatically (Section 9).
2. **Access Instructions**: Execute the IAP (Section 2).
3. **Select Playbook**: Load `docs/ai-instructions/task-playbooks.md` and the relevant guide.
4. **Implement**: Follow the playbook's guidance.
5. **Verify**: Format (`dprint`), Lint (`eslint`), Test (`playwright`).
6. **Update Docs**: Ensure documentation reflects any changes made.

## 5. Task-Type Playbooks

Use `docs/ai-instructions/task-playbooks.md` to classify every task. The current categories (in sorted order) are **Feature Analysis**, **Test Strategy**, **Technical Design**, **Test Implementation**, **POM**, **Test Data Management**, **Test Support Services**, **Debugging / Fix**, **Documentation**, **Misc / Utility**.

## 6. Coding Standards & Shared Docs

Coding conventions are defined globally:

- `.eslintrc.json` – read before writing code; enforce rules such as `object-shorthand: consistent`, single quotes, and `@typescript-eslint/explicit-function-return-type`
- `docs/CODING_GUIDELINES.md` – canonical rules for naming, structure, assertions, test data, etc.
- `docs/pom-in-practice.md` – required reference for any new/updated POM components
- `docs/localhost-run.md` – environment-specific notes
- `src/services/**` docs/comments – when working on service utilities, inspect existing service patterns before editing.

## 7. Tools & Debugging

- Prefer MCP tooling (Playwright browser automation, code search, lint/test helpers) for inspection and evidence gathering.
- Use Playwright MCP snapshot/screenshot utilities when debugging UI issues; avoid speculative explanations.
- Run lint checks immediately after modifications; always start with `npx eslint --fix <all-modified-files>` using a single command that lists every touched file instead of running file-by-file.
- Run any newly added/modified tests with `--headed --trace=on` unless the playbook marks them as `n/a`.

## 8. Linting, Formatting & Type Checking

- **TypeScript check:** run `npx tsc --noEmit` to verify there are no type errors before formatting and linting. Pre-existing errors in unrelated files can be noted but should not block the task.
- **dprint formatting:** run `npx dprint fmt <file1> <file2> ...` on all changed files before the final ESLint pass. If the command fails due to missing `dprint` or config, note the error and continue.
- **Primary lint command:** after finishing edits (and again after formatting), run `npx eslint --fix <file1> <file2> ...` covering every created/modified file in one go. Capture the exact CLI and result in POST-FLIGHT.
- **LF endings:** save every new file with Unix line endings (LF). When copying content from Windows tools, normalize it before committing (most editors expose this in the status bar).

## 9. Workspace Detection

Always resolve `PROJECT_ROOT` before executing other commands.

If the user did **not** explicitly say whether we’re working:

- inside the test project root (`qubership-apihub-ui-tests`), or
- in a monorepo root that contains the `qubership-apihub-ui-tests` folder,

then the agent must detect it automatically.

**Detection rules (must succeed before running any commands):**

- If the current directory contains a `qubership-apihub-ui-tests` folder → set `PROJECT_ROOT` to that folder.
- Else, if the current directory itself looks like the test project root (contains `package.json`, `playwright.config.ts`, `src/`) → set `PROJECT_ROOT` to the current directory.
- Else, search upward (parent directories) using the same rules.
- If still not found → stop and ask the user where the project root is.

Print `Detected project root: <abs path>` in the first response, and execute every command from `PROJECT_ROOT`.

## 10. Documentation Upkeep

- Every time you change behavior, config, or workflows, review the relevant documentation (readme, guides, onboarding notes) and update them in the same PR.
- When instructions in `docs/ai-instructions/**` become outdated, fix them as part of the task instead of leaving todos.
- Mention doc updates (or confirm no changes were needed) in POST-FLIGHT so reviewers know the knowledge base stays fresh.

## 11. Continuous Improvement

If errors occur during implementation:

1. Capture the failure details (logs, screenshots, trace references).
2. Document the root cause and fix inside the relevant task guide (e.g., `docs/ai-instructions/test-implementation-guide.md`) under "Common Errors".
3. Update the preventative checklist if needed.
4. Reference the new documentation entry in your POST-FLIGHT notes.

Persistent learning keeps the instruction set accurate and prevents repeated mistakes.
