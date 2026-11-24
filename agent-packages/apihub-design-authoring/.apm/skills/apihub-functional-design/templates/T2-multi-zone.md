<!--
TEMPLATE: T2 — Multi-Zone Design
USE WHEN:
  - Feature spans 2+ UI zones (tabs, toolbars, dialogs) that belong to one story
  - You need a Backend section (DB, API contract, processor rules) separate from UI tables
  - Use Cases use the 3-column table: Description | UI (Mockup) | API / Logic
  - NOT a whole new spec format / domain (use T3) and NOT a single linear popup (use T1)
  - Target length: 150-400 lines

EXAMPLES:
  - Operation migration tracking (API Contracts registry + API Changes chip)
  - Multi-tab document shareability (local drafts)

HOW TO USE:
  1. Delete every HTML comment before publishing.
  2. Replace every <PLACEHOLDER> with real content.
  3. Keep section names exactly as written — automation relies on them.
  4. Delete Backend subsections that do not apply (Database, Component, etc.).
-->

|                          |                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design Item ID**       | <DI-Portal-XXX-YYY>                                                                                                                                           |
| **Design Item Name**     | <Short feature name, Title Case>                                                                                                                              |
| **Related Design Items** | <[Related Item Name](https://github.com/Netcracker/qubership-apihub/wiki/...)> <[Related Item Name](https://github.com/Netcracker/qubership-apihub/wiki/...)> |
| **Related API**          | • <Human name> (HTTP METHOD /path)<br>• <Human name> (HTTP METHOD /path)                                                                                      |
| **Revision History**     | • DD.MM.YYYY — Initial version.<br>• DD.MM.YYYY — <What changed and why>.                                                                                   |

---

# Summary

<2-5 sentences: what the feature does, who benefits, and the core problem it solves.
Do NOT list everything here — details live in the sections below. Think of this as
"if the reader reads only this paragraph, they should understand what the feature is for".>

# Assumptions

- <Constraint 1 — e.g. "This feature applies only to package versions; it is not supported for dashboards.">
- <Constraint 2 — e.g. "Document matching for copying status is done by `fileId`, consistent with existing version lineage logic.">
- <Constraint 3 — e.g. "<Tab> is out of scope for this design (handled by separate stories).">

# Domain Concepts

<Name the concept and define it exactly, including enum of allowed values if any.>

| Concept / Value | Description |
| --------------- | ----------- |
| <name>          | <definition, default, who can change it> |

# Use Cases

### Use Case 1: <e.g. "API Contracts — Migrated Operations registry (package owners)">

<Optional 1-2 sentence intro describing the entry point / precondition for this use case.>

| Description | UI (Mockup) | API / Logic |
| ----------- | ----------- | ----------- |
| <Sub-function 1: user action, system response, validation, permissions.> | [Figma — <frame name>](<node link>) | <METHOD /path> or client-side rule |
| <Sub-function 2> | [Figma — <frame name>](<link>) | |
| <Sub-function 3> | — | <If no mockup, explain in Description> |

### Use Case 2: <e.g. "API Changes — migrated removal">

| Description | UI (Mockup) | API / Logic |
| ----------- | ----------- | ----------- |
| <Sub-function 1> | [Figma —](link) | <Endpoint / logic> |
| <Sub-function 2> | [Figma —](link) | <Endpoint / logic> |

# Backend

## Database

<Add a `<column_name>` column to the `<table>` table:

- Type: <enum | string | ...>
- Default: `<value>`
- Nullable: <yes/no>

Delete this subsection if persistence is unchanged.>

## API Contract Changes

### `<RequestOrResponseName>` — new field

| Field | Type | Required | Default | Description |
| ----- | ---- | -------- | ------- | ----------- |
| `<fieldName>` | `<type>` | <Yes/No> | `<value>` | <What it controls, who sends it, who reads it.> |

**Context:** <1-2 sentences; name similar fields this follows.>

## Component: <e.g. "portal-backend" or "api-processor">

1. <Action the component performs.>
2. <Next action with endpoint if relevant.>
3. <Filtering / transformation / derivation rule.>

Delete subsections that do not apply.

# Mockups

[Figma — <feature / task page>](<root Figma link>)

Per-step links live in the Use Case tables above.
