# AI Agent Guide: Technical Design

This guide is for the **Technical Design** task.

**Role**: **Test Architect**
**Goal**: Produce technical instructions for POM implementation and TDM.

## 1. Output Artifacts

1. **`pom-instructions.md`**: Technical design for Page Object Models.
2. **`tdm-instructions.md`** (Optional): Specific technical details for data helpers if complex.
   Save in `ai-agent-local/research/<feature-name>/` (or user-specified path).

## 2. Process

### Step 1: POM Architecture

- **Hierarchy**: Define the POM structure (Page -> Tab -> Component).
- **Naming**: Enforce `PascalCase` for classes.
- **Reuse**: Identify existing components to reuse.
- **Locators**: Define strategy (prefer `data-testid`).

### Step 2: File Structure

- Specify where new files should be created.
- Follow project structure: `src/packages/[module]/pages/...`

### Step 3: High-Level Instructions ONLY

- **DO NOT** write full implementation code (e.g., class definitions with methods).
- **DO** describe the component's purpose, location, and key elements/methods.
- **DO** reference base classes to extend (e.g., `BaseComponent`, `BaseDialog`).
- **DO** list critical selectors or `data-testid`s required.

## 3. Template & Patterns

Use this exact structure for the output file:

````markdown
# Page Object Model (POM) Creation Instructions: [Feature Name]

## 1. Feature Overview and Test Cases

- **Feature Overview**: `path/to/feature-overview.md`
- **end-to-end test cases**: `path/to/test-plan.md`

## 2. UI Implementation & `data-testid` References

**IMPORTANT**: Verify all files are accessible.

> **Note**: Your POM structure in the test project does not need to mirror the UI component hierarchy exactly. The primary purpose of these references is to identify stable selectors for automation. If a required element lacks a `data-testid` or has an unstable one, you should modify the UI source code to add or improve it.

- `path/to/Component.tsx`

### `data-testid` Convention

- Use **`PascalCase`**.

## 3. Required POM Architecture

The feature will be located within `[ParentPage]`.

- **`[ParentPage]`**: `src/packages/[module]/pages/[ParentPage].ts`
- **`[FeatureTab]`**: Child of `[ParentPage]`. Describe its responsibility.
- **`[SubComponent]`**: Describe responsibility and location.

### Simplified Structure:

```
[ParentPage]
└── [FeatureTab]
    ├── [Component1]
    ├── [Component2]
    └── [Dialog]
```

## 4. Key Implementation Patterns & References

Identify and list relevant existing files that serve as good examples for the new feature.

- **Main Page Structure**: `[Reference a similar page object]`
- **Tab/Component Logic**: `[Reference a similar tab or component]`
- **Dialog Implementation**: `[Reference a similar dialog]`
- **Interactions**: `[Reference a similar test file]`
````
