# Technical Specification: end-to-end tests for Ruleset Management

## Meta

- **Scope:** `aq-rm`
- **Type:** `test-plan`
- **Related artifacts:**
  - **Feature overview:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.overview.md`
  - **POM instructions:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.pom.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.support.ts`

This document provides a complete technical specification for generating Playwright end-to-end tests for the Ruleset Management feature. It is divided into three parts:

1. **Test Case Specification**
2. **Test Data Management Strategy**
3. **Implementation Instructions**

---

## Part 1: Test Case Specification

### **Test Suite: Initial State and Core UI**

#### **P-AQ-RM-UI-1 Verify initial state for admin**

- **Priority:** Critical
- **Prerequisites:**
  - User is logged in as a system administrator.
  - API Linter feature is enabled.

| Step                                       | ER                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the Ruleset Management tab. | 1. Main header is visible.<br>2. API type selector is visible and defaults to OAS 3.0.<br>3. Add Ruleset button is enabled.<br>4. Ruleset table is visible with expected columns. |

#### **P-AQ-RM-UI-2 Verify Ruleset Management tab is hidden when linter is disabled**

- **Priority:** Major
- **Prerequisites:** API Linter feature is globally disabled (mocked).

| Step                                                            | ER                                            |
| --------------------------------------------------------------- | --------------------------------------------- |
| 1. Mock system configuration API to disable linter extension.   |                                               |
| 2. Navigate to Portal Settings via UI (Portal Settings button). | 1. Ruleset Management tab is **not** visible. |

#### **P-AQ-RM-UI-3 Verify no permission placeholder when non-admin user navigates directly via URL**

- **Priority:** Major
- **Prerequisites:**
  - User is logged in as a non-system-administrator.
  - Non-admin user ID includes `TEST_ID_N` (for cleanup).

| Step                                                              | ER                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Create non-admin user via API with `TEST_ID_N` in ID.          |                                                                                                         |
| 2. Navigate directly to `/portal/settings/rulesets` as that user. | 1. "No Permission" placeholder is displayed with message "You do not have permission to see this page". |

#### **P-AQ-RM-UI-4 Verify direct URL navigation redirects to User Roles tab when linter is disabled**

- **Priority:** Major
- **Prerequisites:** API Linter feature is globally disabled (mocked).

| Step                                                 | ER                                                                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1. Mock system configuration API to disable linter.  |                                                                                                                            |
| 2. Navigate directly to `/portal/settings/rulesets`. | 1. User is redirected to User Roles tab.<br>2. Create Role button is visible.<br>3. Ruleset Management tab is not visible. |

### **Test Suite: Ruleset Creation**

#### **P-AQ-RM-CREATE-1 Open, verify title, and close the Create Ruleset dialog**

- **Priority:** Normal
- **Prerequisites:** User is on the Ruleset Management tab.

| Step                         | ER                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| 1. Click Add Ruleset button. | 1. Create dialog opens with title "Create Ruleset for OAS 3.0" (or selected API type). |
| 2. Click Cancel.             | 1. Dialog closes.                                                                      |

#### **P-AQ-RM-CREATE-2 Create a new inactive ruleset**

- **Priority:** Critical
- **Prerequisites:**
  - Valid ruleset YAML file is available.
  - Ruleset name is unique.

| Step                                                    | ER                                                                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Open Create Ruleset dialog.                          |                                                                                                                                                                                                   |
| 2. Fill unique ruleset name and upload valid YAML file. |                                                                                                                                                                                                   |
| 3. Click Create.                                        | 1. Success notification appears.<br>2. New ruleset appears in table with Status "Inactive".<br>3. Created At shows current date in `DD MMM, YYYY`.<br>4. Activation History cell is empty/hidden. |

#### **P-AQ-RM-CREATE-3 Attempt to create a ruleset with a duplicate name**

- **Priority:** Major
- **Prerequisites:** Ruleset with the target name already exists for the same API type.

| Step                                                           | ER                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1. Open Create Ruleset dialog.                                 |                                                                   |
| 2. Enter a name that already exists for the selected API type. |                                                                   |
| 3. Upload a valid YAML ruleset file and click Create.          | 1. Error message is shown in dialog indicating the name is taken. |

#### **P-AQ-RM-CREATE-4 Attempt to create a ruleset without a name**

- **Priority:** Normal
- **Prerequisites:** User is in the Create Ruleset dialog.

| Step                            | ER                                 |
| ------------------------------- | ---------------------------------- |
| 1. Upload a valid ruleset file. |                                    |
| 2. Leave name field empty.      | 1. Create button remains disabled. |

#### **P-AQ-RM-CREATE-5 Attempt to create a ruleset without a file**

- **Priority:** Normal
- **Prerequisites:** User is in the Create Ruleset dialog.

| Step                            | ER                                 |
| ------------------------------- | ---------------------------------- |
| 1. Fill in a valid unique name. |                                    |
| 2. Do not upload a file.        | 1. Create button remains disabled. |

#### **P-AQ-RM-CREATE-6 Attempt to create a ruleset with an invalid file extension**

- **Priority:** Normal
- **Prerequisites:** A file with a non-YAML extension (e.g., `test.txt`) is available.

| Step                                       | ER                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1. Open Create Ruleset dialog.             |                                                                                                             |
| 2. Fill unique ruleset name.               |                                                                                                             |
| 3. Upload a `*.txt` file and click Create. | 1. Error message is displayed within the dialog indicating file type is invalid.<br>2. Dialog remains open. |

### **Test Suite: Ruleset Activation**

#### **P-AQ-RM-ACTIVATE-1 Activate a new ruleset and verify deactivation of previous active**

- **Priority:** Critical
- **Prerequisites:**
  - One active ruleset exists.
  - One never-activated inactive ruleset exists.

| Step                                        | ER                                                                                                                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Click Activate for the inactive ruleset. |                                                                                                                                                                                                                               |
| 2. Confirm activation.                      | 1. Target ruleset status becomes Active.<br>2. Activation History shows `DD MMM, YYYY - ...` (date matches current date).<br>3. No history icon (single activation record).<br>4. Previously active ruleset becomes Inactive. |

#### **P-AQ-RM-ACTIVATE-2 Verify Activate button is disabled for an already active ruleset**

- **Priority:** Normal
- **Prerequisites:** Active ruleset exists.

| Step                              | ER                              |
| --------------------------------- | ------------------------------- |
| 1. Hover over active ruleset row. | 1. Activate button is disabled. |

#### **P-AQ-RM-ACTIVATE-3 Verify activation history tooltip for a ruleset with multiple activations**

- **Priority:** Major
- **Prerequisites:** Ruleset has been activated, deactivated, and activated again (multiple records).

| Step                                                                | ER                                                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Hover over info icon in Activation History cell for the ruleset. | 1. Tooltip appears with at least two activation records.<br>2. Records use `DD MMM, YYYY` date format and match expected activation dates. |

### **Test Suite: Ruleset Deletion**

#### **P-AQ-RM-DEL-1 Verify deletion is disabled for an active ruleset**

- **Priority:** Major
- **Prerequisites:** Active ruleset exists.

| Step                                  | ER                                               |
| ------------------------------------- | ------------------------------------------------ |
| 1. Hover over active ruleset row.     |                                                  |
| 2. Hover over disabled Delete button. | 1. Tooltip reads "Cannot delete active ruleset". |

#### **P-AQ-RM-DEL-2 Verify deletion is disabled for a previously activated ruleset**

- **Priority:** Major
- **Prerequisites:** Inactive ruleset exists that has activation history.

| Step                                                 | ER                                                                                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Hover over the inactive ruleset row with history. |                                                                                                                                                                                                |
| 2. Hover over disabled Delete button.                | 1. Tooltip reads "The ruleset cannot be deleted due to existing versions that have been validated against this ruleset".<br>2. Activation History cell displays `DD MMM, YYYY - DD MMM, YYYY`. |

#### **P-AQ-RM-DEL-3 Delete a never-activated inactive ruleset**

- **Priority:** Normal
- **Prerequisites:** Inactive ruleset exists that has never been activated.

| Step                                             | ER                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| 1. Click Delete for the never-activated ruleset. |                                                                       |
| 2. Confirm deletion.                             | 1. Success notification appears.<br>2. Ruleset is removed from table. |

### **Test Suite: Ruleset Export and Sharing**

#### **P-AQ-RM-SHARE-1 Download a ruleset file**

- **Priority:** Normal
- **Prerequisites:** At least one ruleset exists.

| Step                                    | ER                                             |
| --------------------------------------- | ---------------------------------------------- |
| 1. Click Download action for a ruleset. | 1. Browser downloads the correct ruleset file. |

#### **P-AQ-RM-SHARE-2 Copy a ruleset link and verify URL format**

- **Priority:** Low
- **Prerequisites:** At least one ruleset exists.

| Step                                     | ER                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| 1. Click Copy Link action for a ruleset. | 1. Clipboard contains URL with path `/api-linter/api/v1/rulesets/{rulesetId}/data`. |

### **Test Suite: Filtering and Data Display**

#### **P-AQ-RM-FILTER-1 Filter rulesets by API type**

- **Priority:** Major
- **Prerequisites:** Rulesets exist for both OAS 3.0 and OAS 3.1.

| Step                                                 | ER                                                  |
| ---------------------------------------------------- | --------------------------------------------------- |
| 1. Switch API type selector from OAS 3.0 to OAS 3.1. | 1. Table updates to show only rulesets for OAS 3.1. |

---

## Part 2: Test Data Management Strategy

### **2.1. Overview and Terminology**

**Ruleset naming & lifecycle**

- Names must start with alias prefix `QS-` (`qubership-apihub-ui-tests/src/test-data/prefixes.ts`) and end with `-${process.env.TEST_ID_N}` so cleanup can match and delete them.
- **Cleanup location:** Ruleset cleanup must be performed in `afterAll` of the root describe ("API Quality Validation"), not in `apihub-teardown.ts`.
- **Retry safety:** For tests that create rulesets, append current retry index + 1 to the name (e.g., `...-1-${process.env.TEST_ID_N}`) to ensure uniqueness across retries.

### **2.2. Suite-level baseline data (`beforeAll`)**

- **Scope:** `test.describe('Ruleset Management', ...)`
- **Create baseline rulesets** for reuse:
  - Inactive OAS 3.0 ruleset (never activated)
  - Inactive OAS 3.1 ruleset (never activated)
  - Previously-active OAS 3.0 ruleset (inactive + history)
  - General OAS 3.0 ruleset (used to flip activation)

**Activation history tip:** to have N records in tooltip, you need N+1 total activation cycles (last one is displayed in table cell).

### **2.3. Server default rulesets**

Use server defaults primarily for cleanup (ensure an active ruleset exists and is deletable):

```typescript
export const SERVER_DEFAULT_RULESETS = {
  [LintRulesetApiTypes.OAS_2_0]: 'default-openapi-2-0',
  [LintRulesetApiTypes.OAS_3_0]: 'default-openapi-3-0',
  [LintRulesetApiTypes.OAS_3_1]: 'default-openapi-3-1',
} as const
```

### **2.4. Test resource files**

- **Location:** `qubership-apihub-ui-tests/resources/portal/api-quality/rulesets/`
- **Files:**
  - `aq-rm-simple-ruleset.yaml` — minimal valid Spectral ruleset (`rules:` prefix is enough for content assertions)
  - `aq-rm-invalid-extension.txt` — invalid extension for negative test

### **2.5. Cleanup Strategy**

All non-reusable rulesets created during tests must be removed after the run in `api-quality.spec.ts`:

1. Activate default server rulesets (active ruleset cannot be deleted).
2. Delete test rulesets by test ID (`lintRulesetTdm.deleteTestRulesets(process.env.TEST_ID_N!)`).

### **2.6. Test Case Data Usage Map**

See `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.support.ts` for the canonical mapping and messages.

---

## Part 3: Implementation Instructions

### **3.1. General Implementation Guidelines**

Follow:

- `qubership-apihub-ui-tests/AGENTS.md`
- `qubership-apihub-ui-tests/docs/ai-instructions/preflight-checklists.md`
- `qubership-apihub-ui-tests/docs/CODING_GUIDELINES.md`

### **3.2. Page Object Model (POM) Usage**

- Primary POM: `RulesetManagementTab`
- Tests must interact through POM only (no raw selectors in spec).

### **3.3. Interacting with the Ruleset Table**

- Retrieve rows via `getRulesetRow(name)` and then use row methods for actions.
- For tooltips: hover element and assert via `portalPage.tooltip`.

### **3.4. Test Implementation Details**

- **Test file:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
- **Top-level describe:** `test.describe('API Quality Validation', ...)`
- **Nested describe:** `test.describe('Ruleset Management', ...)`
- For UI entry-point tests (`P-AQ-RM-UI-*`) navigate via UI; for others prefer direct URL navigation.
- Add `@smoke` tag for Critical/Major tests.
