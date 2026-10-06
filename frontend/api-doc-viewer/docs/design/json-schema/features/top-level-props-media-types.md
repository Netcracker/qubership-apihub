# Top-level property media types

A badge with a media type next to a root property's name in `JsonSchemaViewer`. Status:
implemented (plain only). A workaround restored from the legacy (api-data-model based) viewer.

## Purpose

A host can render a schema synthesized from another structure, e.g. one property per OpenAPI
operation parameter. A parameter described with `content` instead of `schema` has a media type
(`application/json`, …) that the property schema cannot express. The host passes it alongside the
schema and the viewer shows it as a badge.

## API

| Prop | Type | Default |
| --- | --- | --- |
| `topLevelPropsMediaTypes` | `Record<string, string>` — property key → media type | `undefined` (no badges) |

Same name and shape as the legacy viewer's prop, so existing host maps plug in unchanged.

## Plain

| Element | Rule |
| --- | --- |
| Which nodes | **direct properties of the root** (`property` kind whose parent is the root node) whose key is in the map; nested properties with the same key get no badge (the legacy viewer matched by title at any depth) |
| Where | title-row subheader, **after** the type label, circular-ref icon, and tags |
| Look | `UxBadge`, kind `default-outline`, text = the media type |
| Display modes | both `simple` and `detailed` |

## With diffs

Not supported: `JsonSchemaDiffsViewer` has no such prop and shows no badge. Supporting it needs a
before/after media-type pair per property and its own diff styling.

## Regression coverage

- Story `JSON Schema Suite/Top Level Props Media Types` with a paired screenshot IT
  (`src/it/json-schema-suite/top-level-props-media-types.it-test.ts`).
- Unit test of the matching rule: `packages/api-doc-viewer/tests/top-level-props-media-types.test.ts`.

## Related documents

- [../display-coverage.md](../display-coverage.md)
