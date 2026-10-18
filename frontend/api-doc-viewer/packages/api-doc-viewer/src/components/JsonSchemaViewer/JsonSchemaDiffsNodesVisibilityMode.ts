/**
 * "Showing/hiding unchanged nodes" feature toggle for the JSON Schema diffs viewer.
 *
 * The public prop (`JsonSchemaDiffsViewerProps.hideUnchangedNodes`) is a boolean today, but
 * the underlying concept is modeled here as a proper mode (mirroring `LayoutMode`/`DisplayMode`)
 * because a third mode is already planned: `show-only-nodes-with-filtered-changes` (hide a node
 * unless it has a diff whose type is in a caller-supplied `diffTypes` list). See
 * `refactoring-notes.md` (agent-packages/api-doc-viewer-authoring) for the full design analysis.
 * `diffTypes` itself is currently an API placeholder with no implementation.
 */
export const SHOW_ALL_NODES_MODE = "show-all"
export const SHOW_ONLY_CHANGED_NODES_MODE = "show-only-changed-nodes"

export type JsonSchemaDiffsNodesVisibilityMode =
  | typeof SHOW_ALL_NODES_MODE
  | typeof SHOW_ONLY_CHANGED_NODES_MODE

/** Boundary conversion for the current boolean public prop - the only place that needs to change
 * shape when the public API itself grows a third mode. */
export function resolveJsonSchemaDiffsNodesVisibilityMode(
  hideUnchangedNodes: boolean,
): JsonSchemaDiffsNodesVisibilityMode {
  return hideUnchangedNodes ? SHOW_ONLY_CHANGED_NODES_MODE : SHOW_ALL_NODES_MODE
}

/** Every mode except `show-all` collapses unchanged content - `show-only-nodes-with-filtered-changes`
 * will too, just with a `diffTypes`-aware "changed" predicate, so this stays correct unchanged once
 * that mode is added. */
export function isHideUnchangedNodesMode(mode: JsonSchemaDiffsNodesVisibilityMode): boolean {
  return mode !== SHOW_ALL_NODES_MODE
}
