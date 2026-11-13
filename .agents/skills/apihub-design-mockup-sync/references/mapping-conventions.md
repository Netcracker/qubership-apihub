# FD ↔ Figma mapping conventions

## Figma side (from `apihub-figma-mockups`)

- Task page name: `<ticket> - <short title>` on Portal (Copy).
- Frame name: `<UC id> <state>`, e.g. `UC-2 Popup: Delete version`, `UC-1 Overview`.
- Frames on the task page are top-level siblings in a row (1440 × 780).
- Link format: see `apihub-figma-mockups/references/portal-figma-files.md` (replace `:` in node id with `-`).

## FD side (from `apihub-functional-design`)

| Template | Where UI links live |
| -------- | ------------------- |
| T1 | `# Mockups` section and optional inline `[Figma — …](url)` |
| T2/T3 | `### Use Case N: …` then table column **UI (Mockup)** |

**UI column link text:** `[UC-<n> <short state>](url)` or `[Figma — <frame title>](url)`. Prefer the frame title from
Figma.

**No mockup for a row:** use `—` in the UI column; Description must still be testable.

## Matching priority

1. **UC number:** frame name or Figma link text starts with `UC-<n>` matching the `### Use Case N` heading.
2. **Exact frame title:** normalized case-insensitive match between frame `name` and markdown link label.
3. **Keyword match** (low confidence): one distinctive phrase shared by Description row and frame name — mark
   **Review** in the report, do not auto-link without user confirmation.
4. **Orphan frame:** on the task page, not referenced by any row → list for rename, new UC row, or delete in Figma.
5. **Unlinked row:** visible UI behaviour in Description, empty UI cell or broken link → needs frame or `—`.

## Granularity

- **One table row = one observable behaviour.** Multiple rows may share one frame only when the mockup is identical
  (same link repeated, or `—` with explanation in Description).
- **One frame ≠ multiple unrelated states.** Split frames in Figma when the user must see distinct chrome (popup open
  vs closed, error vs success).

## Stale links

A link is **stale** when the node id no longer exists on the task page or the screenshot shows a different screen than
the Description. Offer a corrected `node-id` from the current frame list.
