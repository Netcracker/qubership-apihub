# API Quality Validation Result (Summary Tab) — Feature Overview (Legacy: before stable `data-testid`)

## Meta

- **Scope:** `aq-summary-before-testid`
- **Type:** `overview`
- **Status:** legacy snapshot kept for reference (historical gaps in `data-testid`)
- **Related (current):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.overview.md`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.pom.md`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.test-plan.md`

## 1. Feature Description

This feature provides users with the ability to view the results of API quality validation (linting) directly on the Summary tab of a Package Version. It integrates with the `qubership-api-linter-service` to display validation status, issue counts, and ruleset information.

The core functionalities include:

- Displaying the "Quality Validation" section in the Summary tab when the linter service is enabled.
- Showing the current validation status (Checking, In Progress, Success, Error, Not Validated).
- Displaying a summary of quality issues broken down by severity (Error, Warning, Info, Hint).
- Listing active validation rulesets with links to their details.
- Providing a manual "Run Validation" trigger if validation has not been run or if rulesets are inactive.
- Handling validation failures (e.g., when specific documents fail to validate).
- Displaying a detailed "Ruleset Info" popup with file details and activation history.

## 2. UI Components and Interactions

The feature is primarily contained within the `OperationTypeSummary.tsx` component, with sub-components for specific interactions.

### 2.1. Main View (`OperationTypeSummary.tsx`)

Container `data-testid`: `ValidationsContent-{apiType}` (e.g., `ValidationsContent-openapi`)

#### 2.1.1. Quality Validation Section

- **Header**: "Quality Validation"
  - **Warning Icon**:
    - Condition: `clientValidationStatus === 'error'`
    - `data-testid`: `ValidationFailedAlert`
    - Tooltip: "Validation failed. Some documents could not be processed during quality validation. See information icon below for details about failed documents."
- **Placeholder State**:
  - Text varies by status:
    - `checking`: "Checking validation status..."
    - `in-progress`: "Validation is in progress, please wait..."
    - `not-validated`: "No validation results." + **Run Validation Link** (see below)
  - **Run Validation Link** (Primary - in Placeholder):
    - Condition: `clientValidationStatus === 'not-validated'`
    - Action: Triggers manual validation.
    - Text: "Run Validation"
    - `data-testid`: **MISSING** (needs to be added to `<Link>` in `getApiQualitySummaryPlaceholder`)
- **Summary State** (Success/Results):
  - **Rulesets List**:
    - Component: `ValidationRulesettLink`
    - Container: `Box` wrapping each ruleset
    - `data-testid`: **MISSING** (container box needs ID)
    - **Ruleset Name Link**:
      - Action: Opens Ruleset Info Dialog.
      - `data-testid`: **MISSING**
    - **API Type Chip**:
      - Values: `"OAS 2.0"`, `"OAS 3.0"`, `"OAS 3.1"`
      - `data-testid`: **MISSING**
    - **Status Chip**:
      - Values: `"Active"` or `"Inactive"` (capitalized)
      - `data-testid`: **MISSING**
    - **Run Validation Link** (Secondary - below Rulesets List):
      - Condition: Inactive rulesets exist (`hasInactiveRulesets === true`).
      - Text: "Run Validation"
      - `data-testid`: **MISSING**
  - **Issue Counts**:
    - Container: `Box` with `gridArea='qualityIssuesNumber'`
    - `data-testid`: **MISSING**
    - **Items** (Error, Warning, Info, Hint):
      - `data-testid`: **MISSING** (should be `IssueCount-{severity}`)
    - Tooltip: `ValidationIssuesTooltip`
  - **Failed Documents**:
    - Condition: `validationFailed === true` (`clientValidationStatus === 'error'`)
    - Container: `Box` with `gridArea="failedDocumentsNumber"`
    - `data-testid`: **MISSING**
    - Content: Count of failed documents + Info icon with tooltip listing document names.

### 2.2. Ruleset Info Popup (`RulesetInfoDialog.tsx`)

Triggered by clicking a ruleset name in `ValidationRulesettLink`.

- **Dialog**:
  - `data-testid`: **MISSING**
  - **Title**: `{Ruleset Name}`
  - **Close Button**:
    - `data-testid`: **MISSING**
  - **Chips** (in Dialog Title):
    - **API Type**: `data-testid`: **MISSING**
    - **Status**: `data-testid`: **MISSING**

#### 2.2.1. File Panel (`RulesetFilePanel.tsx`)

- **Header**: "Spectral Ruleset"
- **File Info**:
  - Icon: `FileIcon`
  - Name: `{filename}`
- **Controls** (`ValidationRulesetFileControls.tsx`):
  - **Download Button**:
    - Hint: "Download"
    - `data-testid`: `DownloadButton`
  - **Copy Link Button**:
    - Hint: "Copy public URL"
    - `data-testid`: `CopyPublicUrlButton`

#### 2.2.2. Activation History (`RulesetActivationHistoryTable.tsx`)

- **Table**:
  - `data-testid`: **MISSING**
  - **Column**: "Activation History"
  - **Rows**:
    - Content: Date range formatted as `{activeFrom} - {activeTo}`
    - Date Format: `"DD MMM, YYYY"` (e.g., "24 Nov, 2025")
    - **Active Ruleset**: `"DD MMM, YYYY - ..."`
    - **Inactive Ruleset**: `"DD MMM, YYYY - DD MMM, YYYY"`
    - `data-testid`: **MISSING**

### 2.3. Sub-Components Details

#### `ValidationRulesettLink.tsx`

Component that displays ruleset name as a link with API Type and Status chips. Used in both Summary State and Ruleset Info Dialog.

- **Name Link**:
  - Action: Opens Ruleset Info Dialog via `showRulesetInfoDialog(data)`.
  - `data-testid`: **MISSING**
- **API Type Chip**:
  - `data-testid`: **MISSING**
- **Status Chip**:
  - `data-testid`: **MISSING**
- **Optional Label**:
  - If `showLabel={true}` (default), displays "Ruleset" text before the name link.

#### `ValidationIssuesTooltip.tsx`

- Wraps issue counts.
- `data-testid`: **MISSING**

## 3. Business Logic and Rules

### 3.1. Main View Logic

- **Visibility**:
  - "Quality Validation" section visible ONLY if `linterEnabled` is true.
  - `linterEnabled` = `ApiQualityLinterEnabledContext` && `packageKind === PACKAGE` && `apiType != GRAPHQL`.
- **Validation Status Mapping**:
  - `checking` -> "Checking validation status..."
  - `in-progress` -> "Validation is in progress, please wait..."
  - `success` -> Show results.
  - `error` -> Show results + warning icon + failed documents.
  - `not-validated` -> Show "No validation results." + Run Validation Link.
- **Manual Validation**:
  - Triggers `POST /api/v1/packages/{id}/versions/{v}/validation`.
  - Sets status to `checking`.
  - Invalidates `validation-summary-for-package-version` query.

### 3.2. Ruleset Info Popup Logic

- **Data Loading**:
  - Fetches metadata: `GET /api/v1/rulesets/{id}`
  - Fetches history: `GET /api/v1/rulesets/{id}/activation-history`
  - Shows `Skeleton` while loading.
  - Shows "No ruleset found" placeholder if data is missing.

## 4. API Endpoints and Data Models

### API Endpoints

- `GET /api/v1/packages/{packageId}/versions/{version}/validation/summary`
- `POST /api/v1/packages/{packageId}/versions/{version}/validation`
- `GET /api/v1/rulesets/{id}`
- `GET /api/v1/rulesets/{id}/activation-history`
