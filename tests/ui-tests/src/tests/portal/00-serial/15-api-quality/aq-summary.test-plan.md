# Technical Specification: end-to-end tests for API Quality Summary Tab

## Meta

- **Scope:** `aq-summary`
- **Type:** `test-plan`
- **Related artifacts:**
  - **Feature overview:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.overview.md`
  - **POM instructions:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.pom.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.support.ts`

This document provides a complete technical specification for generating Playwright end-to-end tests for the API Quality Summary Tab feature. It is divided into three parts:

1. **Test Case Specification:** Human-readable test cases with assigned priorities.
2. **Test Data Management Strategy:** Strategy for creating, managing, and cleaning up test data.
3. **Implementation Instructions:** Specific technical guidance for implementing tests in this repository.

---

## Part 1: Test Case Specification

### **Test Suite: UI Visibility and Access Control**

#### **P-AQ-SM-UI-1 Verify Quality Validation section visibility for REST API**

- **Priority:** Critical
- **Prerequisites:**
  - Package version with REST API document (OAS 3.0).
  - Linter service enabled.
  - Validation successfully run (automatic on publish).

| Step                                            | ER                                                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the Package Version Summary tab. | 1. REST API section is visible.<br>2. "Quality Validation" section is visible within the REST section.<br>3. Section title "Quality Validation" is visible. |

#### **P-AQ-SM-UI-2 Verify Mixed API Types display - REST with GraphQL**

- **Priority:** Normal
- **Prerequisites:**
  - Package version with both REST (OAS 3.0) and GraphQL documents.

| Step                                            | ER                                                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the Package Version Summary tab. | 1. REST API section is visible **with** "Quality Validation" section.<br>2. GraphQL API section is visible **without** "Quality Validation" section. |

#### **P-AQ-SM-UI-3-M Verify Quality Validation section is hidden when linter is disabled**

- **Priority:** Major
- **Prerequisites:**
  - Package version with REST API document (OAS 3.0).
  - Validation successfully run (automatic on publish).
  - API Linter feature is globally disabled in system configuration (mocked).

| Step                                                          | ER                                                  |
| ------------------------------------------------------------- | --------------------------------------------------- |
| 1. Mock system configuration API to disable linter extension. |                                                     |
| 2. Navigate to the Package Version Summary tab.               | 1. "Quality Validation" section is **not** visible. |

### **Test Suite: Content**

#### **P-AQ-SM-CONTENT-1 Verify Ruleset info for single document**

- **Priority:** Major
- **Prerequisites:**
  - Package version with single OAS 3.0 document.
  - Validation successfully run.

| Step                                                           | ER                                                                                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the Summary tab.                                |                                                                                                                                                       |
| 2. Inspect the Ruleset list in the Quality Validation section. | 1. One ruleset is listed.<br>2. Ruleset name is displayed as a clickable link.<br>3. API Type chip shows "OAS 3.0".<br>4. Status chip shows "Active". |

#### **P-AQ-SM-CONTENT-2 Verify Ruleset list items for multi-document version**

- **Priority:** Critical
- **Prerequisites:**
  - Package version with OAS 3.0 and OAS 3.1 documents.
  - Both specs validated with custom rulesets.

| Step                                                           | ER                                                                                                                                                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the Summary tab.                                |                                                                                                                                                                                                                         |
| 2. Inspect the Ruleset list in the Quality Validation section. | 1. Two rulesets are listed (one per spec type).<br>2. Ruleset #1: name link visible, API Type chip "OAS 3.0", Status chip "Active".<br>3. Ruleset #2: name link visible, API Type chip "OAS 3.1", Status chip "Active". |

#### **P-AQ-SM-CONTENT-3 Verify Issue Counts tooltip content**

- **Priority:** Normal
- **Prerequisites:**
  - Validated REST API package version with issue counts displayed.

| Step                                 | ER                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1. Navigate to the Summary tab.      |                                                                                                                    |
| 2. Hover over the Issue Counts area. | 1. Tooltip is displayed.<br>2. Tooltip contains descriptions for each severity level (Error, Warning, Info, Hint). |

#### **P-AQ-SM-CONTENT-4-M Verify Validation Failed state**

- **Priority:** Major
- **Prerequisites:**
  - Mocked API response with `status: 'error'` and failed documents.

| Step                                                                              | ER                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Mock validation summary API to return `status: 'error'` with failed documents. |                                                                                                                                                                                                                                                                                                                       |
| 2. Navigate to the Summary tab.                                                   | 1. Red warning icon is visible.<br>2. Hovering the warning icon shows tooltip text about failure.<br>3. Failed documents count is displayed.<br>4. Info icon tooltip lists failed document names.<br>5. "API Quality" tab is disabled.<br>6. Hovering "API Quality" tab shows tooltip: "API quality check is failed". |
| 3. Navigate directly to the API Quality tab URL.                                  | 1. No results placeholder is displayed (ApiQualityNoResultsPlaceholder).                                                                                                                                                                                                                                              |

### **Test Suite: Ruleset Info Popup Interactions**

#### **P-AQ-SM-POPUP-1 Verify Ruleset Info Popup opens and displays correct content**

- **Priority:** Major
- **Prerequisites:** Validated REST API package version.

| Step                             | ER                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Navigate to the Summary tab.  |                                                                                                                                                              |
| 2. Click on a Ruleset name link. | 1. Ruleset Info dialog opens.<br>2. Dialog title matches ruleset name.<br>3. API Type chip and Status chip are visible.<br>4. Ruleset filename is displayed. |

#### **P-AQ-SM-POPUP-2 Verify multiple Rulesets can be opened in multi-spec version**

- **Priority:** Major
- **Prerequisites:** Package version with OAS 3.0 and OAS 3.1 documents (two rulesets).

| Step                                        | ER                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Navigate to the Summary tab.             |                                                                          |
| 2. Click the first ruleset name (OAS 3.0).  | 1. Popup opens.<br>2. Shows correct ruleset name and API type (OAS 3.0). |
| 3. Close the popup.                         | 1. Popup is closed.                                                      |
| 4. Click the second ruleset name (OAS 3.1). | 1. Popup opens.<br>2. Shows correct ruleset name and API type (OAS 3.1). |

#### **P-AQ-SM-POPUP-3 Verify Download ruleset file**

- **Priority:** Normal
- **Prerequisites:** Ruleset Info dialog is open.

| Step                        | ER                                           |
| --------------------------- | -------------------------------------------- |
| 1. Click "Download" button. | 1. File is downloaded with expected content. |

#### **P-AQ-SM-POPUP-4 Verify Copy Link to ruleset**

- **Priority:** Normal
- **Prerequisites:** Ruleset Info dialog is open.

| Step                         | ER                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| 1. Click "Copy Link" button. | 1. Clipboard contains URL matching pattern `/api-linter/api/v1/rulesets/{rulesetId}/data`. |

#### **P-AQ-SM-POPUP-5 Verify Activation History table content**

- **Priority:** Normal
- **Prerequisites:**
  - Ruleset Info dialog is open for a ruleset.
  - Ruleset has at least two activation history entries.

| Step                                     | ER                                                                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Inspect the Activation History table. | 1. Table contains at least two rows with valid date ranges.<br>2. Active period format: "DD MMM, YYYY - ...".<br>3. Inactive period format: "DD MMM, YYYY - DD MMM, YYYY". |

### **Test Suite: Manual Validation**

#### **P-AQ-SM-RUN-1 Verify re-validation updates status and issue counts for single document**

- **Priority:** Major
- **Prerequisites:**
  - Single-document version.
  - Initial ruleset produces 1/1/1/1.
  - Alternate ruleset produces 0/1/0/0 and is now active (so version shows ruleset as Inactive).

| Step                                                  | ER                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| 1. Navigate to Summary tab for the version.           | 1. Status is "Inactive".<br>2. Issue counts are 1/1/1/1.          |
| 2. Click "Run Validation" link.                       |                                                                   |
| 3. Wait for validation to complete and UI to refresh. | 1. Status becomes "Active".<br>2. Issue counts change to 0/1/0/0. |

#### **P-AQ-SM-RUN-2 Verify re-validation updates aggregated issue counts for multi-document version**

- **Priority:** Major
- **Prerequisites:**
  - Multi-doc version (OAS 3.0 + OAS 3.1).
  - Initial issue counts aggregated: 2/2/2/2.
  - OAS 3.0 ruleset is inactive and will produce 0/1/0/0 after re-validation.
  - OAS 3.1 ruleset remains active producing 1/1/1/1.

| Step                                                  | ER                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to Summary tab for the multi-doc version. | 1. OAS 3.0 ruleset shows "Inactive".<br>2. OAS 3.1 ruleset shows "Active".<br>3. Aggregated issue counts are 2/2/2/2. |
| 2. Click "Run Validation" link.                       |                                                                                                                       |
| 3. Wait for validation to complete and UI to refresh. | 1. Both rulesets show "Active".<br>2. Aggregated issue counts update to 1/2/1/1 (0/1/0/0 + 1/1/1/1).                  |

### **Test Suite: Status Transitions**

#### **P-AQ-SM-STATUS-1-M Verify Not Validated state display**

- **Priority:** Critical
- **Prerequisites:** Mock API response to return 404 (LintResultNotFound).

| Step                                               | ER                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Mock validation summary endpoint to return 404. |                                                                                                      |
| 2. Navigate to Summary tab.                        | 1. Placeholder shows "No validation results."<br>2. "Run Validation" link is visible in placeholder. |

**Note:** Do NOT click "Run Validation" (mocked state would cause unexpected behavior).

#### **P-AQ-SM-STATUS-2-M Verify Checking status display**

- **Priority:** Normal
- **Prerequisites:** Mock API to delay response.

| Step                                             | ER                                                    |
| ------------------------------------------------ | ----------------------------------------------------- |
| 1. Mock validation summary endpoint to delay.    |                                                       |
| 2. Navigate to Summary tab while API is loading. | 1. Placeholder shows "Checking validation status...". |

#### **P-AQ-SM-STATUS-3-M Verify In Progress status display**

- **Priority:** Normal
- **Prerequisites:** Mock API response with `status: 'inProgress'`.

| Step                                                      | ER                                                                                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Mock validation summary endpoint to return inProgress. |                                                                                                                                                                                  |
| 2. Navigate to Summary tab.                               | 1. Placeholder shows "Validation is in progress, please wait...".<br>2. "API Quality" tab is disabled.<br>3. Hovering the tab shows tooltip: "API quality check is in progress". |

---

## Part 2: Test Data Management Strategy

### **2.1. Overview and Terminology**

- **Ruleset Naming:** `${ALIAS_PREFIX}-{description}-${process.env.TEST_ID_N}` (use `ALIAS_PREFIX` constant from `qubership-apihub-ui-tests/src/test-data/prefixes.ts`)
- **Package/Version Naming:** Standard naming without ALIAS_PREFIX, using `_N` suffix for non-reusable data

### **2.2. Test Data Hierarchy**

```text
VAR_GR (Non-Reusable group with TEST_ID_N)
└── API-Quality (G_AQ)
    └── PKG_AQ_SUMMARY_N
        ├── v1-oas30        (V_OAS30_N) - single OAS 3.0 doc
        ├── v2-multi        (V_MULTI_SPEC_N) - OAS 3.0 + OAS 3.1 docs
        └── v3-mixed        (V_MIXED_REST_GQL_N) - OAS 3.0 + GraphQL
```

### **2.3. Test Resource Files**

Located in `qubership-apihub-ui-tests/resources/portal/api-quality/`:

**Rulesets:**

- `aq-summary-ruleset.yaml`: Triggers 1 Error, 1 Warning, 1 Info, 1 Hint per spec
- `aq-summary-simple-ruleset.yaml`: Triggers only 1 Warning per spec (different counts)

**Specs:**

- `aq-summary-oas30.yaml`
- `aq-summary-oas31.yaml`
- `aq-graphql.graphql`

### **2.4. Custom Rulesets Strategy**

Create 3 custom rulesets (no default rulesets used in tests):

| Ruleset Name                               | API Type | File                           | Issue Counts |
| ------------------------------------------ | -------- | ------------------------------ | ------------ |
| `${ALIAS_PREFIX}-Summary-OAS30-${testIdN}` | OAS 3.0  | aq-summary-ruleset.yaml        | 1/1/1/1      |
| `${ALIAS_PREFIX}-Summary-OAS31-${testIdN}` | OAS 3.1  | aq-summary-ruleset.yaml        | 1/1/1/1      |
| `${ALIAS_PREFIX}-Alt-OAS30-${testIdN}`     | OAS 3.0  | aq-summary-simple-ruleset.yaml | 0/1/0/0      |

### **2.5. Setup Order in `beforeAll`**

1. Create group and package.
2. Create all 3 custom rulesets.
3. Activate `Summary-OAS30` and `Summary-OAS31`.
4. For activation history test: activate, deactivate, and reactivate OAS 3.0 ruleset to create multiple history entries.
5. Publish all versions.

**Important:** Do NOT change ruleset activations in `beforeAll` after publishing. Tests that need specific states (like "inactive") should set them up at test start.

### **2.6. Activation History Preparation**

To get at least two activation records:

1. Activate `Summary-OAS30`.
2. Activate `Alt-OAS30` (deactivates Summary).
3. Activate `Summary-OAS30` again.

### **2.7. Retry Safety**

For tests that modify state (P-AQ-SM-RUN-1, P-AQ-SM-RUN-2), set up required state at test start using API calls so retries are deterministic.

### **2.8. Cleanup Strategy**

In `afterAll` of the Quality Summary Tab describe block:

1. Activate default server rulesets (to allow deletion of custom rulesets).
2. Delete custom test rulesets by test ID.

Package cleanup is handled automatically by `apihub-teardown.ts`.

### **2.9. Test Case Data Usage Map**

| Test Case ID          | Data Source          | Mocked? | Notes                             |
| --------------------- | -------------------- | ------- | --------------------------------- |
| `P-AQ-SM-UI-1`        | `V_OAS30_N`          | No      | Basic visibility                  |
| `P-AQ-SM-UI-2`        | `V_MIXED_REST_GQL_N` | No      | Mixed REST + GraphQL              |
| `P-AQ-SM-UI-3-M`      | `V_OAS30_N`          | Yes     | Mocked system config              |
| `P-AQ-SM-CONTENT-1`   | `V_OAS30_N`          | No      | Single doc ruleset info           |
| `P-AQ-SM-CONTENT-2`   | `V_MULTI_SPEC_N`     | No      | Multi-doc rulesets list           |
| `P-AQ-SM-CONTENT-3`   | `V_OAS30_N`          | No      | Issue counts tooltip              |
| `P-AQ-SM-CONTENT-4-M` | `V_OAS30_N`          | Yes     | Mocked error status               |
| `P-AQ-SM-POPUP-1`     | `V_OAS30_N`          | No      | Popup content                     |
| `P-AQ-SM-POPUP-2`     | `V_MULTI_SPEC_N`     | No      | Two rulesets openable             |
| `P-AQ-SM-POPUP-3`     | `V_OAS30_N`          | No      | Download file                     |
| `P-AQ-SM-POPUP-4`     | `V_OAS30_N`          | No      | Copy link                         |
| `P-AQ-SM-POPUP-5`     | `V_OAS30_N`          | No      | Activation history (2+ entries)   |
| `P-AQ-SM-RUN-1`       | `V_OAS30_N`          | No      | Re-validation + issue counts      |
| `P-AQ-SM-RUN-2`       | `V_MULTI_SPEC_N`     | No      | Re-validation + aggregated counts |
| `P-AQ-SM-STATUS-1-M`  | Any                  | Yes     | Not-validated (verify only)       |
| `P-AQ-SM-STATUS-2-M`  | Any                  | Yes     | Mocked loading                    |
| `P-AQ-SM-STATUS-3-M`  | Any                  | Yes     | Mocked in-progress                |

### **2.10. Mock Strategies**

- **Linter Disabled (P-AQ-SM-UI-3-M):** mock `/api/v2/system/configuration` to remove `api-linter`.
- **Validation Error (P-AQ-SM-CONTENT-4-M):** mock `/validation/summary` to return `status: 'error'` with failed docs.
- **Not Validated (P-AQ-SM-STATUS-1-M):** mock `/validation/summary` to return 404 `LintResultNotFound`.
- **Checking (P-AQ-SM-STATUS-2-M):** mock `/validation/summary` to delay.
- **In Progress (P-AQ-SM-STATUS-3-M):** mock `/validation/summary` to return `status: 'inProgress'`.

---

## Part 3: Implementation Instructions

### **3.1. General Guidelines**

- Follow `qubership-apihub-ui-tests/AGENTS.md`.
- Follow coding patterns from `qubership-apihub-ui-tests/docs/CODING_GUIDELINES.md`.
- Follow established patterns from `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`.

### **3.2. Page Object Model (POM) Usage**

POM for Summary Tab is implemented and must be used:

- `OverviewSummaryTab`
- `QualityValidationSection`
- `ValidationRuleset`
- `RulesetInfoDialog` (shared dialog)

### **3.3. Test File Structure**

- **File:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
- **Location:** add `test.describe('Quality Summary Tab', ...)` inside root `test.describe('API Quality Validation', ...)`.

Suggested nested describes:

- `UI Visibility and Access Control`
- `Content`
- `Ruleset Info Popup Interactions`
- `Manual Validation`
- `Status Transitions`

### **3.4. Tags and Naming**

- **Test Naming:** `P-AQ-SM-... <Title>`
- **Tags:** add `@smoke` for Priority: Critical and Priority: Major tests.
- **No regular expression special characters** in names.

### **3.5. Expected Issue Counts**

Based on ruleset files:

| Ruleset              | Error | Warning | Info | Hint |
| -------------------- | ----- | ------- | ---- | ---- |
| summary-ruleset.yaml | 1     | 1       | 1    | 1    |
| simple-ruleset.yaml  | 0     | 1       | 0    | 0    |

For multi-spec versions with summary-ruleset: 2/2/2/2 (sum of two specs).

### **3.6. Test Independence**

Tests P-AQ-SM-RUN-1 and P-AQ-SM-RUN-2 should set up their own state at test start via API:

1. Activate required ruleset(s).
2. Run validation via API.
3. Activate a different ruleset to create "inactive" state.
4. Then navigate to UI and perform assertions.
