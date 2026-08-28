---
description: Conventions for extending the next-data-model tree and diff aggregation layer.
applyTo: "packages/next-data-model/src/**/*.ts"
---

When editing `packages/next-data-model/src` to add or change tree builders,
diff aggregators, crawl rules, or tree node types, apply the
`next-data-model-authoring` skill.

When the task adds or changes **node visibility** (`node-visibility-data`,
`*NodeViewer` pair refactor Phase 1, list-last-row / row visibility rules), read
[node-visibility/authoring.md](../skills/next-data-model-authoring/node-visibility/authoring.md)
in that skill package first.

Default for non-JSO API types: `<Spec>TreeWithDiffsBuilder` extends
`<Spec>TreeBuilder` (shared crawl/node creation; diffs-only overrides).
JSO keeps a parallel plain / with-diffs stack under
`building-service/jso/` and `model/jso/` — follow existing JSO patterns
there. Details live in the skill.
