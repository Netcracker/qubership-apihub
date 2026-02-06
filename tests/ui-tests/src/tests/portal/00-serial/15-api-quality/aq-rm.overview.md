# Ruleset Management — Feature Overview

## Meta

- **Scope:** `aq-rm`
- **Type:** `overview`
- **Related artifacts:**
  - **POM instructions:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.pom.md`
  - **Test plan:** `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.test-plan.md`
- **Implementation (tests):**
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/api-quality.spec.ts`
  - `qubership-apihub-ui-tests/src/tests/portal/00-serial/15-api-quality/aq-rm.support.ts`

## 1. Feature Description

The Ruleset Management feature allows administrators to manage linter rulesets for API validation. Initially, it supports Spectral, with plans to incorporate other linters in the future.

The core functionalities include:

- Viewing a list of available rulesets.
- Switching between API types to see corresponding rulesets.
- Creating new rulesets by uploading a file.
- Activating a specific ruleset for API validation.
- Deleting rulesets.
- Downloading a ruleset file.
- Getting a direct link to view the ruleset file in the browser.
- Viewing the activation history of a ruleset.

## 2. UI Components and Interactions

The feature is primarily contained within the `RulesetManagementTab.tsx` component (UI project).

### 2.1. Main View (`RulesetManagementTab.tsx`)

- **Header**: "API Quality Ruleset Management"
- **API Type Selector**: A dropdown to filter rulesets by API type.
  - `data-testid`: `RulesetApiTypeSelector` (within the component)
  - Defaults to "OAS 3.0".
  - Values: `OAS 2.0`, `OAS 3.0`, `OAS 3.1`
  - Changing the selection filters the table content.
- **Add Ruleset Button**:
  - `data-testid`: `AddRulesetButton`
  - Opens the "Create Ruleset" dialog.
  - Disabled while the ruleset list is loading.

### 2.2. Ruleset Table (`RulesetTable.tsx`)

- Displays a list of rulesets for the selected API type.
- **Columns**:
  - **Ruleset Name**
  - **Activation History**
  - **Status**: `Active` or `Inactive`
  - **Created At**
  - **Controls** (row hover actions)

#### Date Formats

- **Created At**: `DD MMM, YYYY` (e.g., "15 Jan, 2025")
- **Activation History**:
  - Empty (null/hidden) for rulesets never activated
  - `"DD MMM, YYYY - ..."` for active rulesets
  - `"DD MMM, YYYY - DD MMM, YYYY"` for inactive rulesets with history
  - Tooltip records (when multiple activations exist) use `DD MMM, YYYY`

### 2.3. Create Ruleset Dialog (`CreateRulesetDialog.tsx`)

- **Title**: "Create Ruleset for [API Type]" (e.g., "Create Ruleset for OAS 3.0")
- **Fields**:
  - **Name** (`data-testid`: `NameTextField`) — required
  - **Ruleset File** — required, extension validated (`.yaml`/`.yml`)
- **Buttons**:
  - **Create** (`data-testid`: `CreateButton`) — enabled only when name + file provided
  - **Cancel** (`data-testid`: `CancelButton`)

### 2.4. Ruleset Actions (`RulesetActions.tsx`)

Actions are displayed on row hover.

- **Activate** (`data-testid`: `ActivateButton`)
  - Disabled for already active ruleset
  - Opens confirmation dialog
- **Download** — downloads ruleset file
- **Copy Link** — copies direct URL
- **Delete** (`data-testid`: `DeleteButton`)
  - Disabled for active ruleset OR ruleset with history; tooltip explains why

#### Delete Button Disabled Tooltips

- Active ruleset: "Cannot delete active ruleset"
- Ruleset with history: "The ruleset cannot be deleted due to existing versions that have been validated against this ruleset"

## 3. Business Logic and Rules

- **Visibility**: Ruleset Management tab is visible only for **system administrator** users.
- **Unique Naming**: Ruleset name must be unique within an API type.
- **Activation**:
  - Only one ruleset can be active per API type
  - Activating a new ruleset deactivates previously active
- **Activation History**:
  - Displayed only after first activation
  - Tooltip icon appears if multiple activation records exist
- **Copy Link**: Produces a direct URL to view ruleset file
- **Deletion Restrictions**:
  - Cannot delete active ruleset
  - Cannot delete ruleset that has ever been activated
- **File Upload**:
  - UI validates extension only, not file content

## 4. API Endpoints and Data Models

### API Endpoints

- `GET /api/v1/rulesets`: list rulesets
- `POST /api/v1/rulesets`: create ruleset
- `POST /api/v1/rulesets/{id}/activation`: activate ruleset
- `DELETE /api/v1/rulesets/{id}`: delete ruleset
- `GET /api/v1/rulesets/{id}/data`: download/view ruleset file

### Data Models

```typescript
export const RULESET_API_TYPE_TITLE_MAP = {
  [RulesetApiTypes.OAS_2_0]: 'OAS 2.0',
  [RulesetApiTypes.OAS_3_0]: 'OAS 3.0',
  [RulesetApiTypes.OAS_3_1]: 'OAS 3.1',
}

export const RulesetStatuses = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
} as const
export type RulesetStatus = (typeof RulesetStatuses)[keyof typeof RulesetStatuses]

export const RulesetApiTypes = {
  OAS_2_0: 'openapi-2-0',
  OAS_3_0: 'openapi-3-0',
  OAS_3_1: 'openapi-3-1',
} as const
export type RulesetApiType = (typeof RulesetApiTypes)[keyof typeof RulesetApiTypes]

export const RulesetLinters = {
  SPECTRAL: 'spectral',
} as const
export type RulesetLinter = (typeof RulesetLinters)[keyof typeof RulesetLinters]

export type RulesetDto = Readonly<{
  id: string
  name: string
  fileName: string
  status: RulesetStatus
  apiType: RulesetApiType
  linter: RulesetLinter
  createdAt: string
  canBeDeleted: boolean
}>

export type RulesetActivation = {
  activeFrom: string
  activeTo?: string
}
```

## 5. Test Scenarios (High Level)

### 5.1. Happy Path

- View the list of rulesets for OAS 3.0
- Switch to OAS 3.1 and view its rulesets
- Create a new inactive ruleset
- Activate an inactive ruleset
- Download a ruleset
- Copy ruleset link
- Delete an inactive never-activated ruleset

### 5.2. Negative / Edge

- Duplicate name error
- Invalid extension upload error
- Activate button disabled for active ruleset
- Delete disabled for active ruleset + for ruleset with history
