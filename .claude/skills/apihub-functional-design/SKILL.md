---
name: apihub-functional-design
description: >-
  Write APIHUB functional design documents from Figma mockups, tickets, or briefs using shipped T1/T2/T3
  templates. Use when the user asks for a design item, functional design, FD, wiki design, use cases from mockups,
  or brief-style documentation for Portal or Agent UI.
---

# APIHUB functional design authoring

Author functional designs (FD) for APIHUB Portal or Agent UI. **Templates ship with this skill** in the sibling
`templates/` folder (deployed to `.agents/skills/apihub-functional-design/templates/` and
`.claude/skills/apihub-functional-design/templates/`).

## Canonical templates

Read the full skeleton from **one** of these files before you write:

| ID | File (next to this skill) | Choose when |
| -- | --------------------------- | ----------- |
| T1 | `templates/T1-single-flow.md` | One linear flow (single screen/popup); API only as sub-bullets under Execution; ~50–150 lines. |
| T2 | `templates/T2-multi-zone.md` | 2+ UI zones **or** separate Backend section; Use Cases = Description \| UI \| API / Logic tables. |
| T3 | `templates/T3-platform.md` | New API type/domain or 4+ tabs; mandatory **Scope** table; Data Collection, Build Result, Extensions. |

See `templates/README.md` for examples. If unsure between T2 and T3, prefer **T2** unless the Scope table and
format-level collection rules are required.

**Quick mapping**

- Copy / Export version dialog → **T1**
- Operation migration, multi-tab feature with REST changes → **T2**
- AsyncAPI publishing, whole Agent domain → **T3**

**Do not** copy template bodies into the output from memory only — open the chosen `templates/T*.md` and mirror its
section headings.

## Where to save the document

| Target | Path | Commit |
| ------ | ---- | ------ |
| Local draft (default) | `analysis and design/<release>/<Feature Name>.md` | Never; keep the folder in `.git/info/exclude` |
| Product contract-type design | `docs/design/contract-types/<slug>.md` | When the user asks for a repo design page |

The numbered **DI-Portal-*** wiki layout in `docs/design/README.md` is a **different** header shape. Use this skill
for **T1/T2/T3** only. Do not mix the two shapes in one file without the user confirming.

## Examples (depth and tone)

Read for **prose style**, **Assumptions**, **Scope**, and tab or Use Case tables:

- `docs/design/contract-types/asyncapi-publishing.md`: T3 shape (Scope table, one section per tab).
- `docs/design/contract-types/asyncapi.md`: T3 with Data Collection, Build Result, and Extensions.
- Optional local reference, absent in most clones: `analysis and design/R2026.4/APIHUB UI rework/APIHUB Agent UI
  rework (revised).md`.

Templates define **section names and skeleton**; the examples define **how much to write** in each row.

## Workflow

1. **Clarify inputs** (ask only if missing): Design Item ID, feature name, release folder (e.g. `R2026.4/<area>/`),
   Figma file/page or frame links, wiki ticket, output path, and whether Backend / DB sections apply.
2. **Pick template** (T1/T2/T3), **read** the matching file under `templates/`, and copy its structure into the new
   document.
3. **Read Figma** when mockups exist — apply skill `apihub-figma-mockups` (same `apihub-design-authoring` package):
   - One Use Case per mockup frame (or per numbered UC on the task page).
   - UI column: `[<frame title>](https://www.figma.com/design/<fileKey>/?node-id=<id-with-dashes>)`.
4. **Read code/API** when relevant (skill `apihub-design-api-trace`): OpenAPI under `backend/*/docs/api/`, Portal UI
   hooks — only to fill API / Logic and Backend; do not paste implementation detail into UI rows.
5. **Write content**:
   - Remove all `<!-- ... -->` template comments from the delivered file.
   - Metadata table: real ID, name, related items, Related API summary, Revision History with today’s date.
   - **Assumptions**: permissions, dashboard vs package, out-of-scope tabs, tolerant vs strict behaviour.
   - **Domain Concepts**: terms the reader needs (registry, migration, severity override, etc.).
   - **Use Cases**: present tense; each table row = one testable behaviour; edge cases inline in Description.
   - Mark gaps as **TBD** or **Assumption:** — never invent API paths without checking code or agreeing with user.
6. **Self-check** against the examples: Summary readable alone; mockup links on every visible state; API column
   names method and path; Security (T1) or Backend subsections deleted if N/A.

## Writing rules

- **Language**: English for design documents unless the user asks for another language.
- **Headings**: Keep the template section titles (`Summary`, `Use Cases`, `Execution`, `Scope`, …) word for word.
- **Heading levels**: Local drafts may keep the template levels (`# Summary`). A file under `docs/` gets one H1 with
  the feature name and every template section one level lower (`## Summary`, `### Use Case 1`): markdownlint
  (MD025) fails on a second H1.
- **Tables**: Three columns for T2/T3 UI use cases — **Description** | **UI (Mockup)** | **API / Logic**.
- **Figma links**: Prefer task-page frames; label link text with UC number and short state name.
- **Permissions**: Name APIHUB permissions explicitly (e.g. `create_and_update_package`) when UI is owner-only.
- **Out of scope**: List in Assumptions or T3 Scope table, not buried in a single use case footnote.

## Related skills

- `apihub-figma-mockups` — build or read Portal mockups in Figma (shipped in the same package).
- `apihub-design-mockup-sync` — map Use Case rows to Figma frames and fix **UI (Mockup)** links.
- `apihub-design-api-trace` — fill **Related API** and **API / Logic** from OpenAPI and UI hooks.
- `apihub-pr-review` / `postman-e2e-followup` — after FD is stable, check implementation impact (only when asked).
- `markdown-line-length-120` — applies to committed repo `docs/`; tables are exempt from the line length.

## Output checklist

- [ ] Correct template (T1/T2/T3) and structure read from `templates/T*.md`
- [ ] No HTML comments left in the file
- [ ] One H1 per file when the file is under `docs/`
- [ ] Every mockup frame referenced in a Use Case row
- [ ] Backend section present only when T2/T3 and there are contract or persistence changes
- [ ] Open questions listed at end if mockups or API are incomplete
