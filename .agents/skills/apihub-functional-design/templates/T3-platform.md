<!--
TEMPLATE: T3 — Platform / Domain Design
USE WHEN:
  - Feature = support for a whole new API type (AsyncAPI, GraphQL, new spec format),
    OR a whole new product domain (Agent Cloud Services),
    OR a cross-tab feature that touches 4+ product tabs (Overview, Operation, Deprecated, Documents, API Quality, etc.).
  - You need a top-level "Scope" table listing which tabs/pages are in and out of scope.
  - You need cross-cutting logic sections: Data Collection, Build Result, Extensions Registry.
  - Target length: 300-800 lines

EXAMPLES IN WIKI AND LOCAL:
  - AsyncAPI Publishing (wiki + local MD)
  - DI-Portal-COMP-003 API Changes

HOW TO USE:
  1. Delete every HTML comment before publishing.
  2. The `## Scope` table is mandatory for T3.
  3. Duplicate "## <Tab Name> Tab" section once per tab covered.
  4. Use "## Data Collection Logic" for rules that describe HOW the system extracts data
     from the source specification (what is APIHUB Operation for this format, how IDs are computed, etc.).
  5. Use "## Build Result" for the backend contract — what api-processor sends to backend per operation.
  6. Use "## Custom Properties (Extensions)" for the registry of x-extensions this feature uses.
-->

|                          |   |
| ------------------------ | - |
| **Design Item ID**       | <DI-Portal-XXX-YYY> |
| **Design Item Name**     | <Feature name — usually "<Format> Publishing" or "<Domain> Support"> |
| **Related Design Items** | <[Related Item Name](https://github.com/Netcracker/qubership-apihub/wiki/...)><br><[Related Item Name](https://github.com/Netcracker/qubership-apihub/wiki/...)> |
| **Related API**          | • <Human name of endpoint> (HTTP METHOD /path)<br>• <Human name of endpoint> (HTTP METHOD /path) |
| **Revision History**     | • DD.MM.YYYY — Initial version.<br>• DD.MM.YYYY — <What changed and why>. |

***

# Summary

<2-5 sentences: what platform/format is being added, which product areas are affected at a high level.
Example: "This design document describes the implementation of AsyncAPI 3.0 specification support and rendering in APIHUB Portal.">

# Assumptions

<!-- For T3 designs, Assumptions typically cover format-level conventions
     (what counts as an APIHUB Operation in this format, how labels behave, etc.)
     AND cross-story boundaries (what is handled by separate design items).
     Scope (which tabs) goes into the separate Scope table below. -->

- <Format-level convention — e.g. "For AsyncAPI, the term *APIHUB API Operation* denotes the combination of three entities: channel, operation, and message. One row in the operations list corresponds to one such triple.">
- <Cross-story boundary — e.g. "API Changes tab and API Quality tab are out of scope for this document (handled by separate stories).">
- <List-definition — e.g. "List of all channels in the current package version means the set of channels used by at least one APIHUB operation in the AsyncAPI document(s) of the current package version.">
- <Behavior difference vs existing formats — e.g. "For AsyncAPI 3.0, functional metadata (API Kind, Audience, deprecation) shall be defined using specification extensions (e.g. x-api-kind, x-audience). This is a change from REST/OpenAPI behavior, where labels can affect functional metadata.">

# Scope

<!-- This table is MANDATORY for T3 designs. It is the map readers use
     to quickly see what UI surface is covered and what is deferred. -->

| Page / Functionality | Scope | Out of Scope |
| -------------------- | ----- | ------------ |
| **Overview Tab**     | • <item 1><br>• <item 2><br>• <item 3> | • <deferred item>                |
| **Operation Tab**    | • Filters<br>• List of operations<br>• List view<br>• Detailed view | • Export to Excel |
| **API Changes Tab**  | —                                      | Out of Scope                     |
| **Deprecated Tab**   | Same as Operation Tab, with deprecated badges | • Export to Excel          |
| **API Quality Tab**  | —                                      | Out of Scope                     |
| **Documents Tab**    | • Overview tab<br>• View operations tab<br>• Export<br>• Copy public link | • Preview (Stoplight)<br>• Export with extensions settings |

---

# Data Collection Logic

<!-- This section defines HOW the system extracts data from source specifications:
       - What is an "APIHUB Operation" for this format (its identity, its boundaries)
       - How IDs are computed (OperationID formula, slug rules)
       - How a single-operation specification is composed (what fields to include, refs to resolve)
       - Protocol / Audience / API Kind / Deprecated derivation rules
     If your feature does not introduce a new format/domain, you likely want T2, not T3.
     DELETE any sub-section below that does not apply. -->

## Summary

<1-2 sentences on what this section covers and what is explicitly out of scope for data collection in this story.
Example: "This section defines how the system computes or collects data (derivation rules, filter criteria, operationId, bwc, deprecated, etc.). Out of scope for this story: tags, models used in operation, externalDocs (with refs).">

## APIHUB Operation Collection — base rules

- <Rule 1 — e.g. "The system shall collect APIHUB operations only from documents that have a <section> section. If the document has no <section>, no APIHUB operations shall be collected from that document.">
- <Rule 2 — e.g. "Each collected APIHUB operation shall be uniquely identified by the OperationId calculated for the triple (channel, operation, message).">

## OperationID Calculation Rules

<!-- Use a formula + table if the ID is composed from multiple source fields. -->

**Formula:**

`operationId = <segment_1> + "-" + <segment_2>`

| Segment      | Source (in the spec)                                                                 | Description                  |
| ------------ | ------------------------------------------------------------------------------------ | ---------------------------- |
| <segment_1>  | <where it comes from, with a spec quote if relevant>                                  | <example value>              |
| <segment_2>  | <where it comes from>                                                                 | <example value>              |

## Single Operation Specification Composition Rules

<!-- Describe what must be present in a single-operation spec for it to be valid and complete.
     This is the contract the builder/api-processor produces. -->

When the system builds or stores a representation of a single APIHUB operation, the result MUST satisfy:

1. <Invariant 1 — e.g. "Be a valid <format> specification (conformant to <version>).">
2. <Invariant 2 — e.g. "Contain all data relevant for the <unit> that constitutes this APIHUB operation (no missing refs, no incomplete context).">

### Root-level (validity and context)

| Element  | Requirement | Notes                                                        |
| -------- | ----------- | ------------------------------------------------------------ |
| <field>  | Required    | <Why it is required and where the value comes from.>         |
| <field>  | Optional    | <When to include it.>                                        |
| <field>  | As needed   | <Condition under which it must be included.>                 |

### <Main object, e.g. "Channel object">

<What fields to include. Which nested maps to prune vs keep.>

### <Components>

| Component              | When to include                                                           |
| ---------------------- | ------------------------------------------------------------------------- |
| `components.schemas`   | Every schema ref'd by the message payload, headers, or by other schemas.  |
| `components.messages`  | <When to include>                                                         |
| `components.<X>`       | <When to include>                                                         |

## <Metadata derivation: Protocol / Audience / API Kind / Deprecated>

<!-- For each piece of APIHUB metadata the format does NOT provide natively,
     describe HOW it is derived. Use the pattern: "Source object → extension → resolution order".
     Example sub-sections:
       - Protocol
       - Audience
       - API Kind (bwc / no-bwc)
       - Deprecated
     DELETE sub-sections that do not apply to your format. -->

### Protocol

<Describe how the Protocol value is derived. Include fallback behavior for unresolvable values.>

### Audience

<Describe extension(s) used, allowed values, and the resolution order (which object-level overrides which).>

**Extension by object:**

- <Object 1> — extension `<x-...>` (string). Allowed values: ...
- <Object 2> — extension `<x-...>` (string). Allowed values: ...

**Resolution order:**

<Explicit text describing which level is default, which overrides which. End with the final fallback.>

### API Kind (bwc / no-bwc)

<Same structure as Audience.>

### Deprecated

<Same structure as Audience, but also cover how the human-readable deprecated label is formatted.>

**Deprecation label format:**

| Where the deprecated item is located | Label format                                        |
| ------------------------------------ | --------------------------------------------------- |
| <path pattern 1>                     | `[Deprecated] <template>`                           |
| <path pattern 2>                     | `[Deprecated] <template>`                           |

---

# <Tab name> Tab

<!-- Repeat this block once for each tab listed as "in Scope" in the Scope table.
     Each tab gets one H2 and one 3-column table (Description | Mockups | API).
     The table rows are the individual sub-functions of that tab.
     Do NOT mix backend logic into this table — only UI behavior and
     the concrete API endpoint(s) the UI calls.
     Backend-level logic belongs in "## Build Result" or "## Data Collection Logic". -->

| Description | Mockups | API |
| ----------- | ------- | --- |
| **<Sub-function name>.** <Full behavior description, including validations, edge cases, and what is shown/hidden. Write in spec style: "If the user X, the system shall Y.">  | [Figma — <node>](<link>) | <METHOD /path> |
| **<Sub-function name>.** <Behavior.> | [Figma — <node>](<link>) | <METHOD /path> |

# <Next Tab name> Tab

| Description | Mockups | API |
| ----------- | ------- | --- |
| ... | ... | ... |

<!-- Duplicate "# <Tab name> Tab" blocks for every in-scope tab.
     Example tabs for a format design:
       # Overview Tab
       # API Operation Tab  (or "Operations Tab")
       # Deprecated Tab
       # Documents Tab -->

---

# Build Result

<!-- This section is the CONTRACT between api-processor (producer) and backend (consumer).
     For each APIHUB operation, what fields are sent, what is required, what is optional. -->

When publishing, the <producer> sends to the <consumer> one operation object per APIHUB operation. Each object shall conform to the <schema name> schema. Type-specific data shall be sent in `externalMetadata`.

## Required fields (all API types)

| Field                       | Description |
| --------------------------- | ----------- |
| `operationId`               | <Format-specific derivation.> |
| `documentId`                | <Description.> |
| `title`                     | <Fallback chain if missing.> |
| `apiType`                   | <Value for this format.> |
| `apiAudience`               | <Derivation — reference the Audience sub-section above.> |
| `apiKind`                   | <Derivation — reference the API Kind sub-section above.> |
| `versionInternalDocumentId` | <Description.> |

## Optional fields (all API types)

| Field              | Description |
| ------------------ | ----------- |
| `deprecated`       | <Description.> |
| `externalMetadata` | <Type-specific metadata; shape depends on `apiType` — see below.> |

## `<Format> Operation Metadata` (shape of `externalMetadata` for this apiType)

| Key               | Required | Description |
| ----------------- | -------- | ----------- |
| `<key_1>`         | Yes      | <Description including format-specific derivation.> |
| `<key_2>`         | Yes      | <Description.> |
| `<key_3>`         | No       | <Description.> |

---

# Custom Properties (Extensions)

<!-- The registry of x-extensions this feature uses.
     Each row = one extension, at one object level. Be explicit about the object. -->

| Specification object | Extension / custom property | Format  | Mandatory | Description |
| -------------------- | --------------------------- | ------- | --------- | ----------- |
| <Object>             | `<x-api-kind>`              | String  | no        | Value: `no-bwc`. <Meaning at this object level.>  |
| <Object>             | `<x-deprecated>`            | boolean | no        | <Meaning at this object level.> |
| <Object>             | `<x-...>`                   | <type>  | <yes/no>  | <Meaning.> |

---

# Mockups

<!-- One root Figma link. Per-step links already live in the tab tables above. -->

[Figma — <feature name>](<root Figma link>)
