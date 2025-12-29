# Technical Specification: end-to-end tests for API Quality Tab

## Meta

- **Scope:** `aq-tab`
- **Type:** `test-plan`
- **Related artifacts:**
  - **Feature overview:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.overview.md`
  - **POM instructions:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.pom.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.support.ts`

This document provides a complete technical specification for generating Playwright end-to-end tests for the API Quality Tab feature.

## Part 1: Test Case Specification

### **Test Suite: UI Visibility and Navigation**

#### **P-AQ-TAB-UI-1 Verify API Quality Tab visibility and navigation**

- **Priority:** Critical
- **Prerequisites:**
  - Package version with validated REST API document.
  - Validation status is `success`.

| Step                                     | ER                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the Package Version page. |                                                                                                                                                                                             |
| 2. Click on the "API Quality" tab.       | 1. The "API Quality" tab is active.<br>2. The Document Selector is visible with the default document selected.<br>3. The Issue List table is visible.<br>4. The Document Viewer is visible. |

#### **P-AQ-TAB-UI-2-M Verify direct URL navigation shows placeholder when linter is disabled**

- **Priority:** Major
- **Prerequisites:**
  - The API Linter feature is globally disabled in the system configuration.
  - Package version exists.

| Step                                                 | ER                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Mock system configuration API to disable linter.  |                                                                          |
| 2. Navigate directly to the API Quality tab via URL. | 1. No results placeholder is displayed (ApiQualityNoResultsPlaceholder). |

**Note:** Verification of API Quality Tab disabled state (when validation is `inProgress` or `error`) is covered by tests in the Quality Summary Tab suite:

- **P-AQ-SM-STATUS-3-M**: Verifies tab is disabled with tooltip "API quality check is in progress" when status is `inProgress`.
- **P-AQ-SM-CONTENT-4-M**: Verifies tab is disabled with tooltip "API quality check is failed" when status is `error`.

**Note:** Direct URL navigation when validation failed is covered by **P-AQ-SM-CONTENT-4-M test**, which includes a step for direct navigation to verify placeholder is displayed.

### **Test Suite: Document Selector**

#### **P-AQ-TAB-DOC-1 Verify Document Selector list content and icons**

- **Priority:** Major
- **Prerequisites:**
  - Package version with multiple validated documents (OAS 3.0, OAS 3.1, GraphQL).

| Step                                    | ER                                                                                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.     |                                                                                                                                                                                                                                   |
| 2. Open the Document Selector dropdown. | 1. List contains all validated OAS documents.<br>2. Each document item displays the correct API Type icon.<br>3. Each document item displays the correct document name.<br>4. The list **DOES NOT** contain the GraphQL document. |

#### **P-AQ-TAB-DOC-2 Verify Document Selector Search**

- **Priority:** Normal
- **Prerequisites:**
  - Package version with multiple documents.

| Step                                                                                                              | ER                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                                                                               |                                                                         |
| 2. Open the Document Selector dropdown.                                                                           |                                                                         |
| 3. Perform **Standard Search Algorithm** checks (Part of word, Adding part, Clearing, Upper case, Invalid query). | 1. Search results filter correctly according to the standard algorithm. |

#### **P-AQ-TAB-DOC-3 Verify Switching Documents**

- **Priority:** Critical
- **Prerequisites:**
  - Package version with two validated documents (Doc A, Doc B).

| Step                                        | ER                                                                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.         |                                                                                                                                                                                                    |
| 2. Verify Doc A is selected by default.     |                                                                                                                                                                                                    |
| 3. Open Document Selector and select Doc B. | 1. Document Selector shows Doc B.<br>2. Issue List updates to show issues for Doc B.<br>3. Document Viewer updates to show content of Doc B.<br>4. Ruleset link updates to show ruleset for Doc B. |

### **Test Suite: Ruleset and Dialog Interactions**

#### **P-AQ-TAB-RULE-1 Verify Ruleset Info Dialog opens**

- **Priority:** Major
- **Prerequisites:** Validated document with an active ruleset.

| Step                                | ER                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Navigate to the API Quality tab. |                                                                                                                                                              |
| 2. Click on the Ruleset link.       | 1. Ruleset Info Dialog opens.<br>2. Dialog title matches the ruleset name.<br>3. Ruleset filename is displayed.<br>4. API Type and Status chips are visible. |

#### **P-AQ-TAB-RULE-2 Verify Ruleset Dialog Download**

- **Priority:** Normal
- **Prerequisites:** Ruleset Info Dialog is open.

| Step                                | ER                                           |
| ----------------------------------- | -------------------------------------------- |
| 1. Navigate to the API Quality tab. |                                              |
| 2. Click on the Ruleset link.       |                                              |
| 3. Click "Download" button.         | 1. File is downloaded with expected content. |

#### **P-AQ-TAB-RULE-3 Verify Ruleset Dialog Copy Link**

- **Priority:** Normal
- **Prerequisites:** Ruleset Info Dialog is open.

| Step                                | ER                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab. |                                                                                                            |
| 2. Click on the Ruleset link.       |                                                                                                            |
| 3. Click "Copy Link" button.        | 1. Clipboard contains correct ruleset URL matching pattern `/api-linter/api/v1/rulesets/{rulesetId}/data`. |

### **Test Suite: Content and Interactions**

#### **P-AQ-TAB-CONTENT-1 Verify Issue List displays issues with correct structure**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with at least one issue.

| Step                                | ER                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab. |                                                                                       |
| 2. Inspect the Issue List table.    | 1. Table is not empty.<br>2. First row displays a severity icon and an issue message. |

#### **P-AQ-TAB-CONTENT-2 Verify Format Toggler switches between YAML and JSON**

- **Priority:** Normal
- **Prerequisites:** Validated REST API document.

| Step                                | ER                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab. |                                                                        |
| 2. Verify default format is YAML.   |                                                                        |
| 3. Click "JSON" in the toggler.     | 1. Verify Editor content is JSON.<br>2. Active toggler button updates. |
| 4. Click "YAML" in the toggler.     | 1. Verify Editor content is YAML.<br>2. Active toggler button updates. |

#### **P-AQ-TAB-CONTENT-3-YAML Verify Validation Issues Sorting in YAML**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with issues of all severities (Error, Warning, Info, Hint) and multiple issues per severity.

| Step                                | ER                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab. |                                                                                                                                                                                       |
| 2. Inspect the Issue List table.    | 1. Issues are sorted by severity order: **Error -> Warning -> Info -> Hint**.<br>2. Within the same severity, issues are sorted by document position (line/column) from start to end. |

#### **P-AQ-TAB-CONTENT-3-JSON Verify Validation Issues Sorting in JSON**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with issues of all severities (Error, Warning, Info, Hint) and multiple issues per severity.
  - JSON format selected.

| Step                                | ER                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab. |                                                                                                                                                                                       |
| 2. Switch to JSON format.           |                                                                                                                                                                                       |
| 3. Inspect the Issue List table.    | 1. Issues are sorted by severity order: **Error -> Warning -> Info -> Hint**.<br>2. Within the same severity, issues are sorted by document position (line/column) from start to end. |

#### **P-AQ-TAB-CONTENT-4-YAML Verify Issue Navigation highlights selected line in YAML**

- **Priority:** Major
- **Prerequisites:** Validated document with issues of all severities (Error, Warning, Info, Hint).

| Step                                          | ER                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.           |                                                                                                                                                                            |
| 2. Ensure YAML format is selected.            |                                                                                                                                                                            |
| 3. Click on an issue in the Issue List table. | 1. The corresponding line in the Document Viewer is highlighted/selected (verify using Monaco selection/marker state; at minimum ensure no errors occur and line changes). |

#### **P-AQ-TAB-CONTENT-4-JSON Verify Issue Navigation highlights selected line in JSON**

- **Priority:** Major
- **Prerequisites:** Validated document with issues of all severities (Error, Warning, Info, Hint).

| Step                                          | ER                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.           |                                                                                                                                                                            |
| 2. Switch to JSON format.                     |                                                                                                                                                                            |
| 3. Click on an issue in the Issue List table. | 1. The corresponding line in the Document Viewer is highlighted/selected (verify using Monaco selection/marker state; at minimum ensure no errors occur and line changes). |

### **Test Suite: Problem Tooltip - Hover Behavior**

> **Important Distinction:** The **Tooltip** appears on hover and can display multiple issues simultaneously. It contains only a "View Problem" button. The **Popup** is a separate entity that appears when clicking the button or using shortcuts.

#### **P-AQ-TAB-TIP-1-YAML Verify Tooltip appears on hover over issue marker in YAML**

- **Priority:** Critical
- **Prerequisites:**
  - Validated document with issues of all severities (Error, Warning, Info, Hint).
  - Document is selected in the API Quality tab.
  - YAML format is selected.

| Step                                                              | ER                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                               |                                                                                                   |
| 2. Ensure YAML format is selected.                                |                                                                                                   |
| 3. Locate an issue marker (squiggly line) in the Document Viewer. |                                                                                                   |
| 4. Hover over the issue marker text for each issue.               | 1. Problem Tooltip appears.<br>2. Tooltip contains the issue message.                             |
|                                                                   | 3. Tooltip displays Linter version.<br>4. Tooltip displays Rule name (matches rule from ruleset). |
|                                                                   | 5. For Error/Warning/Info: Tooltip displays "View Problem" button.                                |
|                                                                   | 6. For Hint: Tooltip does NOT display "View Problem" button (hints are informational only).       |
|                                                                   | 7. For Hint: Tooltip appears on whitespace before text (not directly on the marked text).         |

#### **P-AQ-TAB-TIP-1-JSON Verify Tooltip appears on hover over issue marker in JSON**

- **Priority:** Critical
- **Prerequisites:**
  - Validated document with issues of all severities (Error, Warning, Info, Hint).
  - Document is selected in the API Quality tab.
  - JSON format is selected.

| Step                                                              | ER                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                               |                                                                                                   |
| 2. Switch to JSON format.                                         |                                                                                                   |
| 3. Locate an issue marker (squiggly line) in the Document Viewer. |                                                                                                   |
| 4. Hover over the issue marker text for each issue.               | 1. Problem Tooltip appears.<br>2. Tooltip contains the issue message.                             |
|                                                                   | 3. Tooltip displays Linter version.<br>4. Tooltip displays Rule name (matches rule from ruleset). |
|                                                                   | 5. For Error/Warning/Info: Tooltip displays "View Problem" button.                                |
|                                                                   | 6. For Hint: Tooltip does NOT display "View Problem" button (hints are informational only).       |
|                                                                   | 7. For Hint: Tooltip appears on whitespace before text (not directly on the marked text).         |

#### **P-AQ-TAB-TIP-2-YAML Verify Tooltip displays multiple issues of different types in YAML**

- **Priority:** Major
- **Prerequisites:**
  - Package version with a document containing multiple issues of **different types** (Error, Warning, Info, Hint) on the same location.
  - The document is selected.

| Step                                                                               | ER                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                                                |                                                                                                                                                                                                                                                                                                |
| 2. Locate a marker with multiple issues of different types in the Document Viewer. |                                                                                                                                                                                                                                                                                                |
| 3. Hover over the issue marker.                                                    | 1. Problem Tooltip appears.<br>2. Tooltip message area contains **all** issues for that location (Error, Warning, Info, Hint messages combined).<br>3. **Note:** Tooltip does NOT separate issues by type; it displays them as a combined list.<br>4. Only one "View Problem" button is shown. |

#### **P-AQ-TAB-TIP-2-JSON Verify Tooltip displays multiple issues of different types in JSON**

- **Priority:** Major
- **Prerequisites:**
  - Package version with a document containing multiple issues of **different types** (Error, Warning, Info, Hint) on the same location.
  - The document is selected.
  - JSON format is selected.

| Step                                                                               | ER                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                                                |                                                                                                                                                                                                                                                                                                |
| 2. Switch to JSON format.                                                          |                                                                                                                                                                                                                                                                                                |
| 3. Locate a marker with multiple issues of different types in the Document Viewer. |                                                                                                                                                                                                                                                                                                |
| 4. Hover over the issue marker.                                                    | 1. Problem Tooltip appears.<br>2. Tooltip message area contains **all** issues for that location (Error, Warning, Info, Hint messages combined).<br>3. **Note:** Tooltip does NOT separate issues by type; it displays them as a combined list.<br>4. Only one "View Problem" button is shown. |

#### **P-AQ-TAB-TIP-3-YAML Verify Tooltip displays multiple issues of same type in YAML**

- **Priority:** Major
- **Prerequisites:**
  - Package version with a document where one trigger matches **multiple rules of the same type** (e.g., two different Error rules).
  - The document is selected.
  - YAML format is selected.

| Step                                                                           | ER                                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Navigate to the API Quality tab.                                            |                                                                                                                                                              |
| 2. Ensure YAML format is selected.                                             |                                                                                                                                                              |
| 3. Locate a marker where one element triggers multiple rules of the same type. |                                                                                                                                                              |
| 4. Hover over the issue marker.                                                | 1. Problem Tooltip appears.<br>2. Tooltip message area contains **both** error messages from different rules.<br>3. Only one "View Problem" button is shown. |

#### **P-AQ-TAB-TIP-3-JSON Verify Tooltip displays multiple issues of same type in JSON**

- **Priority:** Major
- **Prerequisites:**
  - Package version with a document where one trigger matches **multiple rules of the same type** (e.g., two different Error rules).
  - The document is selected.
  - JSON format is selected.

| Step                                                                           | ER                                                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Navigate to the API Quality tab.                                            |                                                                                                                                                              |
| 2. Switch to JSON format.                                                      |                                                                                                                                                              |
| 3. Locate a marker where one element triggers multiple rules of the same type. |                                                                                                                                                              |
| 4. Hover over the issue marker.                                                | 1. Problem Tooltip appears.<br>2. Tooltip message area contains **both** error messages from different rules.<br>3. Only one "View Problem" button is shown. |

#### **P-AQ-TAB-TIP-4-YAML Verify Tooltip disappears when cursor leaves in YAML**

- **Priority:** Normal
- **Prerequisites:**
  - Problem Tooltip is currently visible from a hover action.
  - YAML format is selected.

| Step                                                                                   | ER                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. Ensure YAML format is selected.                                                     |                                            |
| 2. With Tooltip visible, move the cursor away from the issue marker to a neutral area. | 1. Problem Tooltip disappears (is hidden). |

#### **P-AQ-TAB-TIP-4-JSON Verify Tooltip disappears when cursor leaves in JSON**

- **Priority:** Normal
- **Prerequisites:**
  - Problem Tooltip is currently visible from a hover action.
  - JSON format is selected.

| Step                                                                                   | ER                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1. Switch to JSON format.                                                              |                                            |
| 2. With Tooltip visible, move the cursor away from the issue marker to a neutral area. | 1. Problem Tooltip disappears (is hidden). |

### **Test Suite: Problem Popup**

> **Important:** The Popup displays **only one issue at a time** and provides navigation buttons to move between issues.

#### **P-AQ-TAB-POPUP-1-YAML Verify Popup opens via View Problem button in YAML**

- **Priority:** Critical
- **Prerequisites:**
  - Validated document with issues.

| Step                                               | ER                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                |                                                                                                                                                     |
| 2. Hover over an issue marker to show the Tooltip. |                                                                                                                                                     |
| 3. Click the "View Problem" button in the Tooltip. | 1. Problem Popup appears.<br>2. Popup displays the correct issue message.<br>3. Popup shows problem type icon, navigation arrows, and Close button. |

#### **P-AQ-TAB-POPUP-1-JSON Verify Popup opens via View Problem button in JSON**

- **Priority:** Critical
- **Prerequisites:**
  - Validated document with issues.
  - JSON format is selected.

| Step                                               | ER                                                                                                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab.                |                                                                                                                                                     |
| 2. Switch to JSON format.                          |                                                                                                                                                     |
| 3. Hover over an issue marker to show the Tooltip. |                                                                                                                                                     |
| 4. Click the "View Problem" button in the Tooltip. | 1. Problem Popup appears.<br>2. Popup displays the correct issue message.<br>3. Popup shows problem type icon, navigation arrows, and Close button. |

#### **P-AQ-TAB-POPUP-2-YAML Verify Popup opens via Alt+F8 for specific problem in YAML**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with multiple issues.
  - Document Viewer has focus.

| Step                                                                                        | ER                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Click on a specific issue marker (text with squiggly line) to position the cursor there. |                                                                                                                                        |
| 2. Press `Alt+F8`.                                                                          | 1. Problem Popup appears for **that specific issue** (the one where cursor was placed).<br>2. Popup message matches the clicked issue. |

#### **P-AQ-TAB-POPUP-2-JSON Verify Popup opens via Alt+F8 for specific problem in JSON**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with multiple issues.
  - Document Viewer has focus.
  - JSON format is selected.

| Step                                                                                        | ER                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Switch to JSON format.                                                                   |                                                                                                                                        |
| 2. Click on a specific issue marker (text with squiggly line) to position the cursor there. |                                                                                                                                        |
| 3. Press `Alt+F8`.                                                                          | 1. Problem Popup appears for **that specific issue** (the one where cursor was placed).<br>2. Popup message matches the clicked issue. |

#### **P-AQ-TAB-POPUP-3-YAML Verify Popup closes via Close button in YAML**

- **Priority:** Normal
- **Prerequisites:**
  - Problem Popup is open.
  - YAML format is selected.

| Step                                          | ER                          |
| --------------------------------------------- | --------------------------- |
| 1. Ensure YAML format is selected.            |                             |
| 2. Click the "Close" (X) button in the Popup. | 1. Problem Popup is hidden. |

#### **P-AQ-TAB-POPUP-3-JSON Verify Popup closes via Close button in JSON**

- **Priority:** Normal
- **Prerequisites:**
  - Problem Popup is open.
  - JSON format is selected.

| Step                                          | ER                          |
| --------------------------------------------- | --------------------------- |
| 1. Switch to JSON format.                     |                             |
| 2. Click the "Close" (X) button in the Popup. | 1. Problem Popup is hidden. |

### **Test Suite: Problem Navigation via Popup**

> **Navigation Order:** Navigation moves between problems following the **same severity-based order as the Issue List table** (Error → Warning → Info → Hint). Within the same severity, issues are ordered by document position. F8/Shift+F8 work when Popup is open.

#### **P-AQ-TAB-NAV-1-YAML Verify Next and Previous Problem navigation via buttons in YAML**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with multiple issues (preferably of different types: Error, Warning, Info, Hint).
  - Problem Popup is open.
  - YAML format is selected.

| Step                                          | ER                                                                                                                                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Ensure YAML format is selected.            |                                                                                                                                                                                                                             |
| 2. Open Problem Popup for the first issue.    |                                                                                                                                                                                                                             |
| 3. Note the current issue message and type.   |                                                                                                                                                                                                                             |
| 4. Click the "Next Problem" arrow button.     | 1. Verify the Popup updates to show the next issue.                                                                                                                                                                         |
| 5. Click the "Previous Problem" arrow button. | 1. Popup message updates to the next/previous issue following severity order (Error → Warning → Info → Hint).<br>2. Problem type icon updates if the severity changes.<br>3. Editor scrolls to show the new issue location. |

#### **P-AQ-TAB-NAV-1-JSON Verify Next and Previous Problem navigation via buttons in JSON**

- **Priority:** Major
- **Prerequisites:**
  - Validated document with multiple issues (preferably of different types: Error, Warning, Info, Hint).
  - Problem Popup is open.
  - JSON format is selected.

| Step                                          | ER                                                                                                                                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Switch to JSON format.                     |                                                                                                                                                                                                                             |
| 2. Open Problem Popup for the first issue.    |                                                                                                                                                                                                                             |
| 3. Note the current issue message and type.   |                                                                                                                                                                                                                             |
| 4. Click the "Next Problem" arrow button.     | 1. Verify the Popup updates to show the next issue.                                                                                                                                                                         |
| 5. Click the "Previous Problem" arrow button. | 1. Popup message updates to the next/previous issue following severity order (Error → Warning → Info → Hint).<br>2. Problem type icon updates if the severity changes.<br>3. Editor scrolls to show the new issue location. |

#### **P-AQ-TAB-NAV-2-YAML Verify Next and Previous Problem navigation via F8 and Shift+F8 in YAML**

- **Priority:** Critical
- **Prerequisites:**
  - Validated document with multiple issues.
  - Problem Popup is open (opened via Alt+F8 or View Problem button).

| Step                                                          | ER                                                                                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. With Popup open, press `F8` (Go to Next Problem in Files). | 1. Verify navigation to the next issue.<br>2. `F8` moves to the next problem, Popup updates with new message.<br>3. Editor scrolls/highlights the new issue location. |
| 2. Press `Shift+F8` (Go to Previous Problem in Files).        | 1. Verify navigation to the previous issue.<br>2. `Shift+F8` moves to the previous problem, Popup updates.<br>3. Editor scrolls/highlights the new issue location.    |

#### **P-AQ-TAB-NAV-2-JSON Verify Next and Previous Problem navigation via F8 and Shift+F8 in JSON**

- **Priority:** Critical
- **Prerequisites:**
  - Validated document with multiple issues.
  - Problem Popup is open (opened via Alt+F8 or View Problem button).
  - JSON format is selected.

| Step                                                          | ER                                                                                                                                                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Switch to JSON format.                                     |                                                                                                                                                                       |
| 2. With Popup open, press `F8` (Go to Next Problem in Files). | 1. Verify navigation to the next issue.<br>2. `F8` moves to the next problem, Popup updates with new message.<br>3. Editor scrolls/highlights the new issue location. |
| 3. Press `Shift+F8` (Go to Previous Problem in Files).        | 1. Verify navigation to the previous issue.<br>2. `Shift+F8` moves to the previous problem, Popup updates.<br>3. Editor scrolls/highlights the new issue location.    |

#### **P-AQ-TAB-NAV-3-YAML Verify navigation follows severity order in YAML**

- **Priority:** Normal
- **Prerequisites:**
  - Document with issues of different severities (multiple Errors, Warnings, Info, Hints).
  - YAML format is selected.

| Step                                                    | ER                                                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Ensure YAML format is selected.                      |                                                                                                                                                                                                 |
| 2. Open Popup for the first issue (should be an Error). |                                                                                                                                                                                                 |
| 3. Navigate through all issues using Next Problem.      |                                                                                                                                                                                                 |
| 4. Observe the order of issues and type icon changes.   | 1. Navigation goes through **all Errors first**, then **all Warnings**, then **all Info**, then **all Hints**.<br>2. Type icon correctly reflects the severity of each issue during navigation. |

#### **P-AQ-TAB-NAV-3-JSON Verify navigation follows severity order in JSON**

- **Priority:** Normal
- **Prerequisites:**
  - Document with issues of different severities (multiple Errors, Warnings, Info, Hints).
  - JSON format is selected.

| Step                                                    | ER                                                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Switch to JSON format.                               |                                                                                                                                                                                                 |
| 2. Open Popup for the first issue (should be an Error). |                                                                                                                                                                                                 |
| 3. Navigate through all issues using Next Problem.      |                                                                                                                                                                                                 |
| 4. Observe the order of issues and type icon changes.   | 1. Navigation goes through **all Errors first**, then **all Warnings**, then **all Info**, then **all Hints**.<br>2. Type icon correctly reflects the severity of each issue during navigation. |

#### **P-AQ-TAB-NAV-4-YAML Verify navigation behavior with overlapping issues in YAML**

- **Priority:** Major
- **Prerequisites:**
  - Document with multiple issues on the same line/location (e.g., Error and Warning on same element).
  - YAML format is selected.

| Step                                                             | ER                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Ensure YAML format is selected.                               |                                                                                                                                                         |
| 2. Open Popup for one of the issues at the overlapping location. |                                                                                                                                                         |
| 3. Use Next Problem to navigate through all issues.              | 1. Navigation follows **severity order**, NOT location order.                                                                                           |
|                                                                  | 2. If current issue is an Error, Next Problem may jump to another Error elsewhere in the document before returning to the Warning at the same location. |
|                                                                  | 3. All issues are eventually visited following the global severity order (all Errors → all Warnings → all Info → all Hints).                            |

#### **P-AQ-TAB-NAV-4-JSON Verify navigation behavior with overlapping issues in JSON**

- **Priority:** Major
- **Prerequisites:**
  - Document with multiple issues on the same line/location (e.g., Error and Warning on same element).
  - JSON format is selected.

| Step                                                             | ER                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Switch to JSON format.                                        |                                                                                                                                                         |
| 2. Open Popup for one of the issues at the overlapping location. |                                                                                                                                                         |
| 3. Use Next Problem to navigate through all issues.              | 1. Navigation follows **severity order**, NOT location order.                                                                                           |
|                                                                  | 2. If current issue is an Error, Next Problem may jump to another Error elsewhere in the document before returning to the Warning at the same location. |
|                                                                  | 3. All issues are eventually visited following the global severity order (all Errors → all Warnings → all Info → all Hints).                            |

### **Test Suite: Special States**

#### **P-AQ-TAB-EDGE-1-M Verify No Validation Results state**

- **Priority:** Major
- **Prerequisites:**
  - Package version where validation results are not available.

| Step                                | ER                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigate to the API Quality tab. | 1. Placeholder is displayed: "API Quality results are not available. Please check the Summary tab for validation status". |

## Part 2: Test Data Management Strategy

### **2.1. Overview and Terminology**

- **Ruleset Naming:** `${ALIAS_PREFIX}-{description}-${process.env.TEST_ID_N}`
- **Package/Version Naming:** Standard naming without ALIAS_PREFIX, using `_N` suffix.

### **2.2. Test Data Hierarchy**

```text
VAR_GR (Non-Reusable group with TEST_ID_N)
└── API-Quality (G_AQ)
    └── PKG_AQ_TAB_N
        ├── v1-tab-multi (V_AQ_TAB_MULTI_N) - OAS 3.0 + OAS 3.1 + GraphQL
        |                                     1. aq-tab-large-oas30.yaml (Doc A)
        |                                     2. aq-tab-combo.yaml (Doc B - OAS 3.1)
        |                                     3. aq-graphql.graphql
        └── v2-tab-mixed (V_AQ_TAB_MIXED_N) - Contains two documents:
                                                 1. aq-tab-large-oas30.yaml (Large doc, separate issues)
                                                 2. aq-tab-combo-oas31.yaml (Combo/Overlap issues)
```

### **2.3. Test Resource Files**

Located in `qubership-apihub-ui-tests/resources/portal/api-quality/`:

**Rulesets:**

- `aq-tab-ruleset.yaml`: Triggers issues on repeatable elements (operationId, summary, description, tags) to allow multiple issues of each type. Used for ALL validations in this test plan.

**Specs:**

- `aq-tab-large-oas30.yaml`: Large OAS 3.0 file with 2 issues of each type (Error, Warning, Info, Hint).
- `aq-tab-combo-oas31.yaml`: Small OAS 3.1 file with combined issues on single lines.
- `aq-graphql.graphql`: GraphQL schema.

### **2.4. Setup Order in `beforeAll`**

1. Create group `API-Quality` (G_AQ) and package `PKG_AQ_TAB_N` in VAR_GR.
2. Create `aq-tab-ruleset`.
3. Activate `aq-tab-ruleset` for OAS 3.0 and OAS 3.1. (GraphQL validation not needed/supported for this tab's primary features, but can be active to verify exclusion.)
4. Publish `v1-tab-multi` (V_AQ_TAB_MULTI_N) with `aq-tab-large-oas30.yaml`, `aq-tab-combo-oas31.yaml`, and `aq-graphql.graphql`.
5. Publish `v2-tab-mixed` (V_AQ_TAB_MIXED_N) with `aq-tab-large-oas30.yaml` and `aq-tab-combo-oas31.yaml`.

### **2.5. Cleanup Strategy**

- Activate default server rulesets.
- Delete custom test rulesets.
- Package cleanup handled by `apihub-teardown.ts`.

### **2.6. Test Case Data Usage Map**

| Test Case ID                  | Data Source      | Mock? | Notes                                            |
| ----------------------------- | ---------------- | ----- | ------------------------------------------------ |
| P-AQ-TAB-UI-1                 | V_AQ_TAB_MIXED_N | No    | Uses OAS 3.0 document                            |
| P-AQ-TAB-UI-2-M               | Mock             | Yes   | Mock system config to disable linter             |
| P-AQ-TAB-DOC-1                | V_AQ_TAB_MULTI_N | No    | Uses all 3 documents (OAS 3.0, OAS 3.1, GraphQL) |
| P-AQ-TAB-DOC-2                | V_AQ_TAB_MULTI_N | No    | Uses multiple documents for search               |
| P-AQ-TAB-DOC-3                | V_AQ_TAB_MULTI_N | No    | Uses OAS 3.0 and OAS 3.1 documents               |
| P-AQ-TAB-RULE-1..3            | V_AQ_TAB_MIXED_N | No    | Uses OAS 3.0 document with active ruleset        |
| P-AQ-TAB-CONTENT-1..2         | V_AQ_TAB_MIXED_N | No    | Uses large OAS 3.0 spec                          |
| P-AQ-TAB-CONTENT-3-YAML/JSON  | V_AQ_TAB_MIXED_N | No    | Validation Issues Sorting                        |
| P-AQ-TAB-CONTENT-4-YAML/JSON  | V_AQ_TAB_MIXED_N | No    | Issue Navigation highlights selected line        |
| P-AQ-TAB-TIP-1-YAML/JSON      | V_AQ_TAB_MIXED_N | No    | Uses large OAS 3.0 spec                          |
| P-AQ-TAB-TIP-2-YAML/JSON      | V_AQ_TAB_MIXED_N | No    | Uses combo OAS 3.1 spec (combo types)            |
| P-AQ-TAB-TIP-3-YAML/JSON      | V_AQ_TAB_MIXED_N | No    | Uses combo OAS 3.1 spec (multi-message)          |
| P-AQ-TAB-TIP-4-YAML/JSON      | V_AQ_TAB_MIXED_N | No    | Uses large OAS 3.0 spec                          |
| P-AQ-TAB-POPUP-1..3-YAML/JSON | V_AQ_TAB_MIXED_N | No    | Uses large OAS 3.0 spec                          |
| P-AQ-TAB-NAV-1..4-YAML/JSON   | V_AQ_TAB_MIXED_N | No    | Uses large OAS 3.0 spec or combo                 |
| P-AQ-TAB-EDGE-1-M             | Mock             | Yes   | Mock validation summary endpoint (404)           |

## Part 3: Implementation Instructions

### **3.1. General Guidelines**

- Follow `qubership-apihub-ui-tests/AGENTS.md` and `qubership-apihub-ui-tests/docs/CODING_GUIDELINES.md`.
- Use the **Standard Icon Verification** (`toHaveIcon`) and **Search Operations** patterns documented in `qubership-apihub-ui-tests/docs/CODING_GUIDELINES.md`.
- Avoid duplication: extract repeated patterns into helper functions:
  - **Document Switching**: use `switchToTestDocument(...)` helper with a generic step name "Switch to test document".
  - **Navigation**: use `navigateToApiQualityTab(...)` helper.
  - **Common Assertions**: extract repeated assertion patterns into reusable helpers.

### **3.2. Page Object Model (POM)**

**Status:** POM for API Quality Tab is **implemented**.

- **Location:** `qubership-apihub-ui-tests/src/packages/portal/pages/PortalPage/VersionPage/VersionPackagePage/ApiQualityTab/`
- **Key Components:**
  - `ApiQualityTab` (main entry point, extends `Tab`)
  - `ValidatedDocumentSelect` (dropdown)
  - `ValidationRuleset` (ruleset info)
  - `RawView` (document viewer wrapper)
  - `ValidationResultsTableRow` (issue list row)
  - `RulesetInfoDialog` (popup; shared between Summary and Tab scopes)

### **3.3. Test File Structure**

- **File:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts` (add to existing file)
- **Describe Block:** `test.describe('API Quality Tab', ...)`

### **3.4. Mocks**

The following test cases require mocking API responses:

- **P-AQ-TAB-EDGE-1-M**: Mock validation summary endpoint to return 404.
  - Endpoint: `**/validation/summary`
  - Response: 404 status with `LintResultNotFound` code
  - Note: UI checks `validationSummary?.status === ClientValidationStatuses.SUCCESS` to determine if results are available. When summary returns 404, placeholder is displayed.
