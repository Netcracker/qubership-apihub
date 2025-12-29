# API Quality Validation Result (Summary Tab) — Feature Overview

## Meta

- **Scope:** `aq-summary`
- **Type:** `overview`
- **Related artifacts:**
  - **POM instructions:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.pom.md`
  - **Test plan:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.test-plan.md`
  - **Legacy (before stable `data-testid`)**: `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary-before-testid.overview.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-summary.support.ts`

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

### Multiple Documents and API Types

A package version can contain multiple documents with different OpenAPI specifications (OAS 2.0, OAS 3.0, OAS 3.1) or different API types (REST, GraphQL):

- **Multiple documents with different OpenAPI specifications** (OAS 2.0, OAS 3.0, OAS 3.1):
  - All documents are aggregated together in the validation summary.
  - The `useAggregatedValidationSummaryByPackageVersion` hook sums up issue counts from all documents
    in the `validationSummary.documents` array.
  - Each document has an `apiType` field indicating its OpenAPI specification (`"openapi-2-0"`,
    `"openapi-3-0"`, or `"openapi-3-1"`).
  - Rulesets are matched to documents based on their specification type. Multiple rulesets (one per
    specification type) can be displayed in the same `OperationTypeSummary` section.

- **GraphQL API type**: Currently, GraphQL is **not supported** by the linter service. When a version contains only GraphQL documents or has GraphQL as one of its API types:
  - The "Quality Validation" section is **not displayed** for GraphQL API type (`useApiQualityLinterEnabled` returns `false` for GraphQL)
  - GraphQL documents are not included in the validation summary response
  - If a version contains both REST and GraphQL documents, only REST documents will be validated and shown in the Quality Validation section

- **REST + GraphQL in the same version**: When a version contains both REST and GraphQL documents:
  - REST documents are validated and displayed in the Quality Validation section
  - GraphQL documents are ignored (not validated, not shown)
  - Each API type gets its own `OperationTypeSummary` section, but only REST section will show Quality Validation

## 2. UI Components and Interactions

The feature is primarily contained within the `OperationTypeSummary.tsx` component, with sub-components for specific interactions.

### 2.1. Main View (`OperationTypeSummary.tsx`)

- **Section Container**: `Box` component containing the entire "API Validation" section
  - `data-testid`: `RestApiValidationSection` for REST API type
  - `data-testid`: `GraphQlApiValidationSection` for GraphQL API type
  - Used to verify that Quality Validation section is not displayed for GraphQL API type
  - **Section Header**: `{API_TYPE_TITLE_MAP[apiType]} Validation` (e.g., "REST API Validation" or "GraphQL API Validation")
    - No `data-testid` on header (it's on the container)

Container `data-testid`: `ValidationsContent-{apiType}` (e.g., `ValidationsContent-openapi`)

#### 2.1.1. Quality Validation Section

- **Header**: "Quality Validation"
  - `data-testid`: `QualityValidationTitle`
  - **Warning Icon**:
    - Condition: `clientValidationStatus === 'error'`
    - `data-testid`: `ValidationFailedAlert`
    - Tooltip: "Validation failed. Some documents could not be processed during quality validation. See information icon below for details about failed documents."
- **Placeholder State**:
  - Container: `Typography` with `gridArea='linterValidationPlaceholder'`
  - `data-testid`: `QualityValidationPlaceholder`
  - Text varies by status:
    - `checking`: "Checking validation status..."
    - `in-progress`: "Validation is in progress, please wait..."
    - `not-validated`: "No validation results." + **Run Validation Link** (see below)
  - **Run Validation Link** (Primary - in Placeholder):
    - Condition: `clientValidationStatus === 'not-validated'`
    - See section 2.3.2 ("Run Validation Link") for details.
    - `data-testid`: `RunValidationLink`
- **Summary State** (Success/Results):
  - **Rulesets List**:
    - Component: `ValidationRulesetLink` (see section 2.3.1, "ValidationRulesetLink.tsx", for details)
    - Container: `Box` wrapping each ruleset
    - `data-testid`: `ValidationRulesetContainer`
    - Contains: Ruleset Name Link, API Type Chip, Status Chip (all with `data-testid` as per section 2.3.1, "ValidationRulesetLink.tsx")
    - **Run Validation Link** (Secondary - below Rulesets List):
      - Condition: Inactive rulesets exist (`hasInactiveRulesets === true`).
      - See section 2.3.2 ("Run Validation Link") for details.
      - `data-testid`: `RunValidationLink`
  - **Issue Counts**:
    - Container: `Box` with `gridArea='qualityIssuesNumber'`
    - `data-testid`: `QualityIssuesContainer`
    - **Items** (Error, Warning, Info, Hint):
      - Each item displays an icon and a count.
      - `data-testid`: `IssueCount-{severity}` (e.g., `IssueCount-error`, `IssueCount-warning`)
    - Tooltip: `ValidationIssuesTooltip` (no `data-testid` needed).
  - **Failed Documents**:
    - Condition: `validationFailed === true` (i.e., `clientValidationStatus === 'error'`).
    - Container: `Box` with `gridArea="failedDocumentsNumber"`
    - `data-testid`: `FailedDocumentsContainer`
    - Content: Count of failed documents + Info icon with tooltip listing document names.

### 2.2. Ruleset Info Popup (`RulesetInfoDialog.tsx`)

Triggered by clicking a ruleset name in `ValidationRulesetLink`.

- **Dialog**:
  - `data-testid`: `RulesetInfoDialog`
  - **Title**: `{Ruleset Name}`
  - **Close Button**:
    - `data-testid`: `CloseRulesetInfoDialogButton`
  - **Chips** (in Dialog Title):
    - Uses `ValidationRulesetLink` component (see section 2.3.1, "ValidationRulesetLink.tsx")
    - **API Type Chip**: `data-testid`: `ValidationRulesetApiTypeChip`
    - **Status Chip**: `data-testid`: `ValidationRulesetStatusChip`

#### 2.2.1. File Panel (`RulesetFilePanel.tsx`)

- **Header**: "Spectral Ruleset"
- **File Info Container**:
  - `data-testid`: `RulesetFileNameContainer`
  - Name: `{filename}`
- **Controls** (`ValidationRulesetFileControls.tsx`):
  - **Download Button**: `data-testid`: `DownloadButton`
  - **Copy Link Button**: `data-testid`: `CopyPublicUrlButton`

#### 2.2.2. Activation History (`RulesetActivationHistoryTable.tsx`)

- **Table**:
  - `data-testid`: `RulesetActivationHistoryTable`
  - **Column**: "Activation History"
  - **Cells**:
    - Content: Date range formatted as `{activeFrom} - {activeTo}`
    - Date Format: `"DD MMM, YYYY"` (e.g., "24 Nov, 2025")
    - **Active Ruleset**: `"DD MMM, YYYY - ..."` when `activeTo` is undefined/null
    - **Inactive Ruleset**: `"DD MMM, YYYY - DD MMM, YYYY"` when `activeTo` is defined
    - `data-testid`: `Cell-{column.id}` (e.g., `Cell-activationHistory`)

### 2.3. Sub-Components Details

#### 2.3.1. `ValidationRulesetLink.tsx`

Component that displays ruleset name as a link with API Type and Status chips. Used in both Summary State (section 2.1.1) and Ruleset Info Dialog (section 2.2).

- **Name Link**:
  - Action: Opens Ruleset Info Dialog via `showRulesetInfoDialog(data)`.
  - `data-testid`: `ValidationRulesetLinkName`
- **API Type Chip**:
  - Values: `"OAS 2.0"`, `"OAS 3.0"`, `"OAS 3.1"`
  - `data-testid`: `ValidationRulesetApiTypeChip`
- **Status Chip**:
  - Values: `"Active"` or `"Inactive"`
  - `data-testid`: `ValidationRulesetStatusChip`

#### 2.3.2. Run Validation Link

Link that triggers manual validation. Appears in two places:

- **Primary** (in Placeholder State): When `clientValidationStatus === 'not-validated'`
- **Secondary** (below Rulesets List): When inactive rulesets exist (`hasInactiveRulesets === true`)

- **Action**: Triggers manual validation via `onManualRunLinter` callback.
- **Text**: "Run Validation"
- **`data-testid`**: `RunValidationLink`

#### 2.3.3. `ValidationIssuesTooltip.tsx`

- Wraps issue counts.
- No `data-testid` needed (tooltips don't require test IDs).

## 3. Business Logic and Rules

### 3.1. Main View Logic

- **Visibility**:
  - "Quality Validation" section visible ONLY if `linterEnabled` is true.
  - `linterEnabled` = `ApiQualityLinterEnabledContext` && `packageKind === PACKAGE` && `apiType != GRAPHQL`.
  - GraphQL API type is excluded from validation (`NOT_LINTED_API_TYPES` includes `API_TYPE_GRAPHQL`).
- **Validation Status Mapping**:
  - `checking` -> "Checking validation status..."
  - `in-progress` -> "Validation is in progress, please wait..."
  - `success` -> Show results (Summary State with rulesets, issue counts).
  - `error` -> Show results + red warning icon + failed documents section.
  - `not-validated` -> Show "No validation results." + Run Validation Link (Primary).
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
- **Content Display**:
  - Shows API Type and Status chips in the title.
  - Shows File Panel with download/copy controls.
  - Shows Activation History table with date ranges.

## 4. API Endpoints and Data Models

### API Endpoints

- `GET /api/v1/packages/{packageId}/versions/{version}/validation/summary`: Main summary data.
- `POST /api/v1/packages/{packageId}/versions/{version}/validation`: Trigger validation.
- `GET /api/v1/rulesets/{id}`: Ruleset metadata (for popup).
- `GET /api/v1/rulesets/{id}/activation-history`: History (for popup).

### Data Models

```typescript
export const ClientValidationStatuses = {
  CHECKING: 'checking',
  IN_PROGRESS: 'in-progress',
  SUCCESS: 'success',
  ERROR: 'error',
  NOT_VALIDATED: 'not-validated',
} as const

export type RulesetMetadata = {
  id: string
  name: string
  apiType: 'openapi-2-0' | 'openapi-3-0' | 'openapi-3-1'
  status: 'active' | 'inactive'
  fileName: string
}
```

## 5. Test Scenarios (High Level)

### 5.1. Happy Path

- **View Summary**:
  - Verify `ValidationsContent-{apiType}` is visible.
  - Verify Ruleset Name, API Type chip, and Status chip are displayed.
  - Verify Issue Counts match API response.
  - Click Ruleset Name -> Verify Popup opens.
- **Ruleset Popup Interaction**:
  - Verify Title matches ruleset name.
  - Verify chips are present in dialog title.
  - Verify filename is correct.
  - Click "Download" button -> Verify download action.
  - Click "Copy Link" button -> Verify clipboard content/notification.
  - Verify Activation History table rows format.
  - Close Popup -> Verify it closes.
- **Manual Run**:
  - Click "Run Validation" link (primary or secondary).
  - Verify status transition: `checking` -> `in-progress` -> `success`.
  - Verify summary is refreshed after completion.

### 5.2. Edge Cases

- **Validation Failed**:
  - Verify `ValidationFailedAlert` icon and tooltip.
  - Verify failed documents count + tooltip with document names.
- **Linter Disabled**:
  - Verify `QualityValidationTitle` is NOT visible.
- **Multiple Documents**:
  - Verify aggregation across OAS 2.0/3.0/3.1.
  - Verify GraphQL section does not show Quality Validation.
- **Status Transitions**:
  - Use mocks to test `inProgress`, `error`, `not-validated`, and loading states.
