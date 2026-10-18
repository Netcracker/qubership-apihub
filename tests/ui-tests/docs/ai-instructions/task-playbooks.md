# Agent Task Playbooks

Pick exactly one playbook that best matches the incoming request. Use it together with `docs/ai-instructions/preflight-checklists.md` (for checklist wording) and the Instruction Access Protocol defined in `AGENTS.md`.

## Task Matrix

| Task type                 | Typical triggers                                               | Mandatory docs (in addition to global set)                                                                                     | Role                 | Focus areas                                                                                  |
|---------------------------|----------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|----------------------|----------------------------------------------------------------------------------------------|
| **Feature Analysis**      | New feature request, vague requirements                        | `docs/ai-instructions/feature-analysis-guide.md`                                                                               | **Business Analyst** | Produce `feature-overview.md`                                                                |
| **Test Strategy**         | Feature overview exists, need test plan                        | `docs/ai-instructions/test-strategy-guide.md`                                                                                  | **QA Lead**          | Produce `test-plan.md`                                                                       |
| **Technical Design**      | Test plan exists, need technical specs                         | `docs/ai-instructions/technical-design-guide.md`                                                                               | **Test Architect**   | Produce `pom-instructions.md`, `tdm-instructions.md`                                         |
| **Test Implementation**   | Playwright specs, fixtures, hooks, assertions                  | `docs/ai-instructions/test-implementation-guide.md`, `docs/CODING_GUIDELINES.md` (§ _Test Structure_)                          | **SDET**             | `test.step()` usage, tags/annotations, run spec `--headed --trace=on`                        |
| **POM**                   | Create/update page objects or shared components                | `docs/CODING_GUIDELINES.md` (§ _Page Object Model_, _Locator Strategy_), `docs/pom-in-practice.md` (matching component family) | **SDET**             | Component taxonomy, constructor signatures, base component reuse                             |
| **Test Data Management**  | Introduce/adjust data used by tests, move data closer to specs | `docs/CODING_GUIDELINES.md` (§ _Test Data Management_), relevant `src/tests/**` folders, existing data helpers                 | **SDET**             | Keep data near consumers, decide `_N` vs `_R`, use hooks for setup/cleanup                   |
| **Test Support Services** | Edits inside `src/services/**`, shared utilities used by tests | Service-specific docs/readme (if any), existing service implementations, `docs/CODING_GUIDELINES.md` (§ Code Organization)     | **SDET**             | Avoid duplication, follow established service APIs, document side effects                    |
| **Debugging / Fix**       | Test failure, flaky test, error report                         | `docs/ai-instructions/test-implementation-guide.md` (§ _Common Errors_)                                                        | **Investigator**     | Analyze trace, reproduce locally, fix root cause, verify fix                                 |
| **Documentation**         | Updates to Markdown/MDX/ADR/readme/etc.                        | Target docs, embedded code standards (`docs/CODING_GUIDELINES.md`), lint/format policies                                       | **Technical Writer** | Keep docs synced with behavior, validate fenced code samples with linters, ensure LF endings |
| **Misc / Utility**        | Config tweaks, doc-only edits, small refactors                 | `.eslintrc.json`, impacted files/config docs                                                                                   | **Engineer**         | Scope clarity, avoid collateral changes                                                      |

## Playbook Details

### Feature Analysis

- **PRE-FLIGHT:** read `docs/ai-instructions/feature-analysis-guide.md`. Confirm output path.
- **Implementation:** analyze the feature, identify UI components and API interactions.
- **Verification:** ensure `feature-overview.md` covers all aspects of the feature description.

### Test Strategy

- **PRE-FLIGHT:** read `docs/ai-instructions/test-strategy-guide.md`. Ensure `feature-overview.md` is available.
- **Implementation:** define test scenarios, priorities, and data requirements.
- **Verification:** check `test-plan.md` against the feature overview for coverage gaps.

### Technical Design

- **PRE-FLIGHT:** read `docs/ai-instructions/technical-design-guide.md`. Ensure `test-plan.md` is available.
- **Implementation:** design POM structure and TDM strategy.
- **Verification:** validate `pom-instructions.md` against `docs/CODING_GUIDELINES.md` and existing project structure.

### Test Implementation

- **PRE-FLIGHT:** read the functional spec/story plus `docs/ai-instructions/test-implementation-guide.md`. Confirm availability of referenced POM components and test data.
- **Implementation:** follow the guide’s phase breakdown, use `test.step()` for contextual grouping, add annotations/tags, and mock backend state when required.
- **Verification:** lint each touched spec and run the spec with `npx playwright test <spec> --headed --trace=on`. Capture artifacts if failures occur.

### POM

- **PRE-FLIGHT:** cite the exact sections you read in `docs/CODING_GUIDELINES.md` and `docs/pom-in-practice.md`. Identify which existing POM classes will change and confirm their APIs.
- **Implementation:** extend existing base components, keep naming consistent (`elementTypeDescription`), encapsulate locators, and document any temporary methods with `// TODO`.
- **Verification:** lint touched POM files; if APIs changed, mention downstream impacts/tests to update.

### Test Data Management

- **PRE-FLIGHT:** document the `_N` vs `_R` decision per entity, list the nearby tests that will use the data, and note any shared helpers you inspected.
- **Implementation:** place new data as close to the consuming spec as possible; only promote it upward when reuse is proven. Use Playwright hooks (`beforeEach`, `afterAll`, etc.) to create/clean data inline. Keep naming descriptive (`CREATE_USER_ADMIN_ROLE`), and update teardown flows if `_N` data is still required globally.
- **Verification:** lint updated data helpers or specs, explain how hooks manage lifecycle, and describe cleanup behavior in POST-FLIGHT.

### Test Support Services

- **PRE-FLIGHT:** review the relevant files under `src/services/**`, note existing patterns (naming, error handling), and confirm no overlapping utilities already exist.
- **Implementation:** keep APIs small and composable, reuse shared helpers, and document side effects or required environment variables directly in the service file.
- **Verification:** lint the touched service files in the same aggregate command, describe any required unit/end-to-end verification, and mention downstream consumers that were impacted or tested.

### Debugging / Fix

- **PRE-FLIGHT:** load the failure evidence (trace, logs). Identify the failing test and the commit where it last passed (if known).
- **Implementation:**
  1. **Analyze**: Look at the trace/screenshot. Is it a locator issue? Timing? Backend error?
  2. **Reproduce**: Run the test locally (`npx playwright test ...`).
  3. **Fix**: Apply the fix. If it's a "wait", use proper assertions (auto-retrying), never hard sleeps.
- **Verification:** Run the test 2-3 times locally to ensure stability (`--repeat-each=3`). Update "Common Errors" if it was a new pattern.

### Documentation

- **PRE-FLIGHT:** list every document/section/table you are about to change so nothing remains outdated.
- **Implementation:** update the content in small, focused chunks, and keep fenced TS/JS code in sync with project conventions. Run a quick lint (e.g., `npx eslint --stdin --ext .ts`) over snippets to catch syntax issues before publishing.
- **Verification:** format via `npx dprint fmt ...`, then run the aggregate `npx eslint --fix ...`. Manually try embedded commands/scripts when relevant and summarize the outcome in POST-FLIGHT.

### Misc / Utility

- **PRE-FLIGHT:** define the precise scope and cite every doc/config reviewed (e.g., ESLint rules, readme sections, deployment notes).
- **Implementation:** keep the change minimal and isolated; document rationale for any behavioral adjustments.
- **Verification:** lint the modified files (even docs, when markdownlint/ESLint applies). Tests are usually `n/a`—state why if so.

## Using the Playbooks

1. Determine the task type and announce it in PRE-FLIGHT with a link to the relevant section of this file.
2. Pick the matching guide from `docs/ai-instructions/*.guide.md` (if available) and cite it alongside the playbook.
3. Merge the global checklist with the playbook-specific bullets above.
4. When referencing another document (e.g., `docs/pom-in-practice.md §Buttons`), record that citation in the Instruction Access checklist.
5. Follow the implementation/verification bullets exactly; missing lint/test evidence is treated as non-compliance.
