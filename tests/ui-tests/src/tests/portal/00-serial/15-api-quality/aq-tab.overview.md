# API Quality Tab (Full Page) — Feature Overview

## Meta

- **Scope:** `aq-tab`
- **Type:** `overview`
- **Related artifacts:**
  - **POM instructions:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.pom.md`
  - **Test plan:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.test-plan.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-tab.support.ts`

## 1. Feature Description

This feature provides a dedicated full-page view for detailed API quality validation results. It allows users to inspect specific issues found during validation, view them in the context of the document content, and navigate between different documents within a package version.

The core functionalities include:

- **Dedicated Tab**: A standard tab within the Version Page, accessible via the tab navigation.
  - **Enabled**: When validation status is `success`.
  - **Disabled**:
    - When validation status is `inProgress`. Tooltip: "API quality check is in progress".
    - When validation status is `error` (API returns `status: 'error'`). Tooltip: "API quality check is failed".
    - **Note:** When hovering over disabled tabs, use `force: true` option to bypass pointer event interception.
- **Document Selection**: Switching between different validated documents (e.g., OAS 2.0, OAS 3.0) using a dropdown.
  - **Note:** GraphQL documents are currently not supported in the detailed Quality view and will not appear in the list.
- **Ruleset Information**: Displaying the active ruleset used for validation, with a link to its details.
- **Issue List**: A table listing all validation issues (Error, Warning, Info, Hint) with their messages.
- **Document Viewer**: A Monaco Editor displaying the document content (YAML or JSON).
- **Issue Navigation**: Clicking an issue in the table highlights the corresponding line in the document viewer.
- **Format Toggling**: Switching the document viewer between YAML and JSON formats.

## 2. UI Components and Interactions

The feature is primarily contained within the `VersionApiQualitySubPage` and `VersionApiQualityCard` components.

### 2.1. Main Page (`VersionApiQualitySubPage.tsx`)

- **Layout**: Uses `LayoutWithSidebar`.
- **Body**: Contains the `VersionApiQualityCard`.

### 2.2. Main Card (`VersionApiQualityCard.tsx`)

- **Structure**: A "TwoSidedCard" layout.
  - **Left Side**: Controls and Issue List.
  - **Right Side**: Document Viewer.
- **Placeholder**:
  - If validation results are not available (`validationSummaryAvailable` is false), a placeholder is shown:
    - Text: "API Quality results are not available. Please check the Summary tab for validation status".
    - `data-testid`: `ApiQualityNoResultsPlaceholder`

#### 2.2.1. Left Header (Controls)

- **Document Selector** (`ValidatedDocumentSelector.tsx`):
  - A dropdown button displaying the currently selected document's API type logo and name.
  - **Interaction**: Clicking opens a menu to search and select other validated documents.
  - **Document Order**: Documents in the selector are ordered alphabetically by their slug (as returned by the backend API). The first document in alphabetical order is selected by default.
  - `data-testid`:
    - Main Dropdown Button: `ValidatedDocumentSelectorButton`
    - Search Bar: `ValidatedDocumentSearchBar`
    - List Item: `ValidatedDocumentButton`
- **Ruleset Link** (`ValidationRulesetLink.tsx`):
  - Displays the name of the ruleset used for the selected document.
  - **Interaction**: Clicking opens the Ruleset Info Dialog (shared with Summary tab).
  - `data-testid`: `ValidationRulesetLinkName` (on Link)
  - `data-testid`: `ValidationRulesetApiTypeChip` (on API Type chip)
  - `data-testid`: `ValidationRulesetStatusChip` (on Status chip)

#### 2.2.2. Left Body (Issue List)

- **Component**: `ValidationResultsTable.tsx`
- **Table Columns**:
  - **Type**: Severity icon (Error, Warning, Info, Hint).
  - **Message**: The text description of the issue.
- **Interaction**:
  - Clicking a row selects the issue (`onSelectIssue`).
  - This updates the `selectedIssuePath` state, which triggers the document viewer to highlight/scroll to the issue.
- **Loading State**: Shows `ValidationResultsTableSkeleton` while fetching details.
- `data-testid`: `Cell-type`, `Cell-message` for table cells.

#### 2.2.3. Right Header (Format Toggler)

- **Component**: `Toggler`
- **Options**: `YAML`, `JSON`.
- **Interaction**: Switches the format of the displayed document content.
- **Default**: YAML.
- `data-testid`: `ModeButton-{mode}` (e.g., `ModeButton-yaml`, `ModeButton-json`).

#### 2.2.4. Right Body (Document Viewer)

- **Component**: `MonacoEditor`
- **Content**: The raw document content, transformed to the selected format (YAML/JSON).
- **Markers**: Validation issues are overlaid as markers (`transformIssuesToMarkers`).
- **Interaction**:
  - Displays squiggly lines for issues.
  - Hovering over an issue shows the message.
  - Receives `selectedUri` (from `selectedIssuePath`) to scroll to the selected issue.
  - **View Problem**:
    - **Mouse Interaction**:
      - Hovering a marker shows Tooltip.
      - Clicking "View Problem" opens the Monaco Peek widget ("Problem Popup").
    - **Keyboard Shortcuts**:
      - `Alt+F8`: Opens the "View Problem" popup for the current issue.
      - `F8`: Navigates to the next issue.
      - `Shift+F8`: Navigates to the previous issue.
- **Loading State**: Shows `LoadingIndicator` while fetching document content.

## 3. Business Logic and Rules

- **Data Fetching**:
  - Fetches validation details for the selected document using `useValidationDetailsByDocument`.
  - Fetches raw document content using `usePublishedDocumentRaw`.
- **Document Selection**:
  - Defaults to the first document in the validation summary list.
  - Updates URL or internal state (implementation uses local state `selectedDocument`).
- **Issue Mapping**:
  - Issues returned by the API contain a `path` (array of keys/indices).
  - This path is converted to a `SpecItemUri` (string) using `issuePathToSpecItemUri`.
  - The `SpecItemUri` is used by Monaco Editor to locate the code segment.
- **Format Transformation**:
  - The document content is fetched in its original format.
  - `useTransformedRawDocumentByFormat` converts it to the selected format (YAML <-> JSON) for display.

## 4. API Endpoints and Data Models

### API Endpoints

- `GET /api/v1/packages/{packageId}/versions/{version}/validation/documents/{documentId}/details`:
  - Fetches validation details (issues, ruleset info) for a specific document.
  - `documentId` is the document slug.

### Data Models

```typescript
export type ValidationDetailsDto = {
  ruleset: RulesetMetadata
  issues: Issue[]
  document: DocumentMetadata
}

export type Issue = {
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  path: (string | number)[] // e.g. ["paths", "/users", "get"]
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}
```

## 5. Test Scenarios (High Level)

### 5.1. UI Visibility and Navigation

- Navigate to the Package Version page and click on the "API Quality" tab.
- Verify the Document Selector, Issue List table, and Document Viewer are visible.
- Verify the tab is **disabled** when validation status is `inProgress` (tooltip: "API quality check is in progress").
- Verify the tab is **disabled** when validation status is `failed` (tooltip: "API quality check is failed").

### 5.2. Document Selector

- Verify the Document Selector list contains all validated OAS documents with correct icons.
- Verify GraphQL documents are NOT shown in the list.
- Verify Document Selector search filters correctly.
- Verify switching documents updates the Issue List, Document Viewer, and Ruleset link.

### 5.3. Ruleset and Dialog

- Verify the Ruleset link displays the correct ruleset name, API Type chip, and "Active" status chip.
- Verify clicking the Ruleset link opens the Ruleset Info Dialog.
- Verify Download and Copy Link functionality in the Ruleset Info Dialog.

### 5.4. Content and Interactions

- Verify the Issue List displays issues with correct severity icons and messages.
- Verify clicking an issue in the table highlights the corresponding line in the Document Viewer.
- Verify Format Toggler switches between YAML and JSON.
- Verify issues are sorted by severity (Error → Warning → Info → Hint) and then by document position.

### 5.5. Monaco Tooltip / Popup / Navigation

- Verify Tooltip appears when hovering over an issue marker (squiggly line) in the Document Viewer.
- Verify Tooltip displays the issue message and a "View Problem" button (except Hint issues).
- Verify Tooltip can display multiple issues on the same location (combo + multi-rule).
- Verify Popup opens via "View Problem" button and via `Alt+F8`.
- Verify Next/Previous navigation via buttons and via `F8` / `Shift+F8`.
- Verify navigation follows severity order: Errors → Warnings → Info → Hints.

### 5.6. Edge Cases

- **No Validation Results**: Verify placeholder is shown if validation results are not available.
- **Empty Issue List**: If a document has no issues (but status is success), the table should be empty.
