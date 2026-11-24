---
name: apihub-design-mockup-sync
description: >-
  Map and reconcile APIHUB functional design documents with Figma task-page mockups: list frames, match Use Case
  rows to UC-named frames, find gaps, fix UI (Mockup) links, and report orphans. Use when the user asks to compare
  design and mockups, sync or fill Figma links, map frames to use cases, or validate UC coverage.
---

# FD ↔ Figma mockup sync

Align **functional design** (T1/T2/T3 from `apihub-functional-design`) with **task-page frames** built under
`apihub-figma-mockups`. Produce a mapping report; update the FD file only when the user explicitly asks to sync, fix,
or fill the links.

Read `references/mapping-conventions.md` for naming and matching rules.

## Inputs

Ask only if missing:

| Input | Purpose |
| ----- | ------- |
| FD path | Markdown file to read or update |
| Figma task page | URL, or ticket id to find page `<ticket> - …` on Portal (Copy) |
| Mode | **report** (default) or **update** FD |

Before Figma calls: load `figma-use`; read `references/portal-figma-files.md` of the `apihub-figma-mockups` skill
(`.agents/skills/apihub-figma-mockups/references/portal-figma-files.md`) for the `fileKey`.

## Workflow

### 1. Parse the FD

1. Detect template shape: T1 (Execution + Mockups), T2/T3 (Use Cases with **UI (Mockup)** column).
2. List every **Use Case** section (`### Use Case N: …` or T3 tab blocks).
3. For each table row (or T1 mockup bullet), capture: UC id, short label, Description snippet, current UI link (if
   any), line range in file.
4. Note rows with `—`, empty UI cells, or placeholder links.

### 2. Inventory Figma

1. `create_session` with Portal (Copy) `fileKey`; reuse `sessionId`.
2. Open the task page; list **top-level frames** (name, node id).
3. Optionally screenshot frames (≤ 5 per call) when comparing visible UI to Description text.

### 3. Build the mapping

For each FD row, assign a status:

| Status | Meaning |
| ------ | ------- |
| **Matched** | Frame exists; link present and node id matches |
| **Link missing** | Frame matched by UC/title; UI column empty or `—` wrongly |
| **Link stale** | URL node id not on task page or content mismatch |
| **FD only** | No frame; behaviour needs mockup or explicit `—` |
| **Figma only** | Frame on page; no FD row (orphan) |
| **Review** | Weak keyword match only |

Apply matching priority from `references/mapping-conventions.md`.

### 4. Deliver the report

Always output a **mapping table** in chat (Markdown):

| UC / row | FD summary | Figma frame | Status | Suggested action |

Then:

- **Orphan frames:** rename to `UC-n …`, add FD row, or remove (recommend; do not delete in Figma without user yes).
- **FD only:** list for mockup work (`apihub-figma-mockups`) or mark `—` in FD.
- **Stale / missing links:** show corrected markdown link line per row.

Add a short **coverage** line: `X/Y rows linked, Z orphan frames`.

### 5. Update mode (only on request)

When the user asked to sync or update the file:

1. Edit only the **UI (Mockup)** column (and T1 `# Mockups` links). Do not rewrite Description or API / Logic unless
   the user asked.
2. Use link pattern from `portal-figma-files.md`; link text = frame name or `UC-n <state>`.
3. Leave **Open questions** at the end of the FD if mismatches remain.

Do not commit unless the user asks.

## Content sanity check (lightweight)

When screenshots or structure are available, flag **obvious** contradictions only, for example:

- Description says popup but frame is full page;
- missing error state when Description mentions validation message;
- tab name in UC title does not match visible tab in frame.

Mark these **Review**; do not refactor the whole FD.

## Related skills

- `apihub-figma-mockups` — create or rename frames on the task page.
- `apihub-functional-design` — author or extend Use Cases after mapping gaps are agreed.

## Output checklist

- [ ] Mapping table for every Use Case row (T2/T3) or mockup slot (T1)
- [ ] Orphan frames listed
- [ ] Corrected link snippets for **Link missing** / **Link stale**
- [ ] FD file touched only in **update** mode and only UI link cells
- [ ] Open questions when **Review** or **FD only** items remain
