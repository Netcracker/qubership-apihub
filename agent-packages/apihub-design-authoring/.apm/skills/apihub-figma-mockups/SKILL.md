---
name: apihub-figma-mockups
description: >-
  Builds APIHUB Portal mockups in Figma for an analyst task: creates a task page in the APIHUB Portal (Copy) file,
  clones the reference frames of the screens the task changes, edits them with components of the APIHUB and
  Netcracker X libraries, and captures new screens from the local UI. Use when the user asks for mockups, Figma
  frames, or screens of a task, or shares a link to one of the APIHUB Figma files.
---

# APIHUB mockups in Figma

The agent builds the mockups; the user reviews them. **File keys, library keys, and the reference page catalog** live
in `references/portal-figma-files.md` next to this skill (after `apm install`:
`.agents/skills/apihub-figma-mockups/references/portal-figma-files.md`). Read that file before the first Figma call.

Load the `figma-use` skill before any `use_figma` call and pass `skillNames: "figma-use"` on every call.

## Workflow

1. Read `references/portal-figma-files.md` for Portal (Copy) `fileKey`, libraries, and reference page IDs.
2. Call `create_session` with the Portal (Copy) `fileKey` and reuse its `sessionId` on every later call.
3. Agree on the task: ticket number, short title, and use cases that need screens. Do not create a page until the
   user asked for mockups of a concrete task.
4. Create the task page `<ticket> - <short title>` at the end of Portal (Copy), after earlier task pages.
5. Pick reference pages from the catalog. List their frames read-only, then clone only the frames the task changes onto
   the task page. Never edit a reference page.
6. Lay frames in a row, 100 px apart. Name each `<use case number> <state>`, e.g. `UC-2 Popup: Delete version`, so
   `apihub-functional-design` can link from the UI column.
7. Apply changes: load fonts first; variants via `setProperties`; new parts as library instances. Mark non-obvious
   changes with the `Annotation` component from the Library.
8. When no reference frame fits or it is outdated: start the local Portal (`apihub-local-ui` when available), capture
   with `generate_figma_design` onto the task page, rebuild from library components, delete the raw capture.
9. Screenshot each changed frame (at most five per call) and fix mismatches.
10. Return one link per frame using the frame link pattern from `references/portal-figma-files.md`.

Mockups of earlier tasks live in Tasks (Copy). Read them when a task continues an earlier one (AsyncAPI, DDL
rendering); write there only when the user asks.

## Libraries and components

Prefer [APIHUB] Library; use Netcracker X libraries only when the APIHUB component does not exist. The fastest way to
find the right component is to read instances in a reference frame that already shows it. See library keys in
`references/portal-figma-files.md`.

## Rules

- Never write to the Library file or to the original team files.
- Do not call `get_design_context`; read structure through `use_figma` and `$fig.query`.
- Nodes cannot be cloned between files: clone inside Portal (Copy) only.
- Clean up: no probe pages, raw captures, or stray nodes.
- Screen frames use vertical auto layout: set `layoutPositioning = 'ABSOLUTE'` on overlay, popup, or tooltip before
  you move it.
- To edit inside nested instances, detach from the top down: find the target, detach its topmost instance ancestor,
  find the target again, and repeat. `findOne` may skip instance sublayers; walk `children` by hand.
- Do not rely on child order or property keys from another instance: pick a child by name and props; read
  `componentProperties` of the node you change. A failed script rolls back all of its changes.
- Some Library rows use absolute text (`Title with Status`): rebuild the row as a new auto-layout frame before adding a
  chip beside the text.
- Popups: clone `01. Popup` and `bg` from a reference popup frame, set `Popup Name` before detach, then replace the
  content frame.

## Related skills

- `apihub-functional-design` — use case tables and Figma links in the FD document.
- `apihub-design-mockup-sync` — after mockups exist, reconcile frames with FD rows and link column.
- `apihub-local-ui` — run Portal locally when reference frames are missing or stale (optional; may be a personal skill).
