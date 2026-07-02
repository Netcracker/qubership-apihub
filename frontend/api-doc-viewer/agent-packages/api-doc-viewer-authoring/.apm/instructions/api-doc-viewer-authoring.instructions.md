---
description: Conventions for extending api-doc-viewer React viewer components.
applyTo: "packages/api-doc-viewer/src/**/*.{ts,tsx}"
---

## Always-on rule

Do not modify legacy viewers (`JsonSchemaViewer`, `GraphSchemaViewer`,
`GraphQLOperationViewer`) without explicit user approval. Prefer
`AsyncApiOperationViewer`, `JsoViewer`, and `DdlTableViewer` for new work.

## Skill trigger: `api-doc-viewer-authoring`

When editing `packages/api-doc-viewer/src` to add or change viewer
components, layouts, diff rendering, or Storybook stories, apply the
`api-doc-viewer-authoring` skill.
