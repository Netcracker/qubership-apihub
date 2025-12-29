# AI Agent Guide: Test Strategy

This guide is for the **Test Strategy** task.

**Role**: **QA Lead**
**Goal**: Produce a detailed `test-plan.md` defining the test scenarios and data strategy.

## 1. Output Artifact

**`test-plan.md`**: The "Plan". List of test scenarios (Positive, Negative, Edge Cases) and Test Data Management (TDM) strategy.
Save in `ai-agent-local/research/<feature-name>/` (or user-specified path).

## 2. Process

### Step 1: Define Test Scenarios

Based on `feature-overview.md`, define:

- **Happy Path**: Main user flows.
- **Negative Scenarios**: Validation errors, error states.
- **Edge Cases**: Boundary values, empty states.
- **Permissions**: Access control tests.

### Step 2: Define TDM Strategy

- **Data Scopes**: Suite-level (`beforeAll`) vs Test-level (`beforeEach`).
- **Cleanup**: How data will be cleaned up (e.g., `afterAll`).
- **Naming Conventions**: Use `_N` suffix for non-reusable data.

## 3. Template & Patterns

Use this exact structure for the output file:

```markdown
# Technical Specification for AI Agent: end-to-end tests for [Feature Name]

This document provides a complete technical specification for an AI agent to generate Playwright end-to-end tests.

## Part 1: Test Case Specification

### **Test Suite: [Suite Name]**

#### **[ID] [Test Title]**

- **Priority**: [Critical/Major/Normal/Low]
- **Prerequisites**: [State required before test]

| Step             | ER                   |
| ---------------- | -------------------- |
| 1. [Action step] | 1. [Expected result] |

> **Important**: In Part 1, avoid hardcoding specific filenames, IDs, or exact error messages (e.g., "Synthetic Error 1"). Use generic descriptions (e.g., "Select a document with errors", "Verify the error message corresponds to the issue"). Specific file names and data values must be defined in **Part 2 (TDM)** and **Part 3 (Implementation)**.

### **Test Suite: [Another Suite]**

...

## Part 2: Test Data Management Strategy

### **2.1. Overview and Terminology**

- **Naming**: [Define naming convention, e.g., `QS-...`]
- **Cleanup**: [Define cleanup strategy, e.g., `afterAll`]

### **2.2. Test Data Hierarchy and Scopes**

**1. Suite-Level Reusable Data (`test.beforeAll`)**

- **Scope**: `test.describe('[Feature]', ...)`
- **Action**: Create `_N` entities reused across tests.
- **Example Data (`_N`)**:
  - `[VAR_NAME]_N`: [Description]

### **2.3. Test Resource Files**

- **Location**: `qubership-apihub-ui-tests/resources/...`
- **Files**:
  - `[filename]`: [Description]

### **2.4. Cleanup Strategy**

- **Mechanism**: [Describe how to clean up data]

### **2.5. Test Case Data Usage Map**

| Test Case ID | Data Source         | Retry Index? | Notes |
| ------------ | ------------------- | ------------ | ----- |
| `[ID]`       | Created inside test | Yes          | ...   |

## Part 3: Implementation Instructions

### **3.1. General Implementation Guidelines**

- Follow `AGENTS.md`.
- Use IAP and Preflight checklists.

### **3.2. Page Object Model (POM) Usage**

- **Primary POM Class**: `[PageName]`
- **Location**: `src/packages/...`
- **Key Principles**: Interact exclusively through POM methods.

### **3.3. Interacting with UI Components**

- **Accessing Components**: [Describe how to access rows, cards, etc.]
- **Performing Actions**: [Describe common actions]
- **Assertions**: [Describe assertion strategy]

### **3.4. Test Implementation Details**

- **Test File**: `src/tests/...`
- **Top-Level Describe**: `test.describe('[Feature]', ...)`
- **Tags**: Add `@smoke` for Critical/Major tests.
```
