# AI Agent Guide: Information Gathering & Feature Analysis

This guide is for the **Information Gathering & Feature Analysis** task.

**Role**: **Business Analyst**
**Goal**: Produce a comprehensive `feature-overview.md` that describes the feature, its UI components, and business rules.

## 1. Output Artifact

**`feature-overview.md`**: The "Spec". Describes the feature, user flows, and key UI components.
Save in `ai-agent-local/research/<feature-name>/` (or user-specified path).

## 2. Process

### Step 1: Information Gathering

- **Read**: User-provided links, tickets, or descriptions.
- **Search**: Look for existing tests or POMs related to the feature.
- **Inspect**: Read the source code of the UI application (if available) to understand component structure, `data-testid` attributes, and API calls.

### Step 2: Deep Component Analysis (CRITICAL)

You **MUST** analyze the React components to identify:

1. **UI Structure**: Hierarchy of components (Main view -> Sub-components -> Dialogs/Popups).
2. **`data-testid`s**: List EVERY `data-testid` found.
   - If a critical interactive element (button, link, input) lacks a `data-testid`, mark it as **MISSING** in the overview.
   - Check sub-components and shared components (e.g., Tooltips, Chips) for their IDs or keys.
3. **Popups & Dialogs**: Trace event handlers (e.g., `showRulesetInfoDialog`) to find the implementation of popups. Do not stop at the trigger; analyze the popup content too.
4. **Conditional Rendering**: Note conditions that show/hide elements (e.g., `linterEnabled`, `validationFailed`).

### Step 3: Feature Analysis

Create `feature-overview.md` following the structure below.

## 3. Template & Patterns

Use this exact structure for the output file:

````markdown
# [Feature Name] Feature Overview

## 1. Feature Description

[High-level summary of what the feature does. Mention core functionalities.]

The core functionalities include:

- [Functionality 1]
- [Functionality 2]

## 2. UI Components and Interactions

The feature is primarily contained within the `[MainComponent].tsx` component.

### 2.1. Main View (`[MainComponent].tsx`)

- **Header**: "[Header Text]"
- **[Component Name]**:
  - `data-testid`: `[TestID]` (or **MISSING**)
  - [Description of behavior, default values, etc.]
- **[Interactive Element]**:
  - Condition: [When is it visible?]
  - Action: [What does it do?]
  - `data-testid`: `[TestID]`

### 2.2. [Sub-Component] (`[SubComponent].tsx`)

[Describe sub-components, their structure, and interactions.]

### 2.3. Dialogs / Modals (`[DialogComponent].tsx`)

- **Title**: "[Dialog Title]"
- **Trigger**: [What opens this?]
- **Content**:
  - **[Field Name]**: [Type, validation, `data-testid`]
- **Buttons**:
  - **[Button Name]**: [`data-testid`, behavior]

## 3. Business Logic and Rules

- **Visibility**: [Who can see this?]
- **Validation**: [Unique naming, required fields, etc.]
- **State Changes**: [What happens when X is clicked?]
- **Restrictions**: [When is deletion disabled?]

## 4. API Endpoints and Data Models

### API Endpoints

- `GET /api/v1/...`: [Description]
- `POST /api/v1/...`: [Description]

### Data Models

```typescript
export const [EnumName] = {
  VAL1: 'value1',
} as const

export type [TypeName] = {
  id: string
  name: string
}
```

## 5. Test Scenarios (High Level)

### 5.1. Happy Path

- [Scenario 1]
- [Scenario 2]

### 5.2. Edge Cases and Negative Scenarios

- **[Component]**:
  - [Negative Case 1]
  - [Negative Case 2]

```
```
````
