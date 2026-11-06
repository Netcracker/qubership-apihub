# Selector options are nested nodes

**Status:** rule for every API type (2026-10-30). Implemented in AsyncAPI (message section selector,
bindings) and OpenAPI (response codes, media types); the shared Security module follows it for its
alternatives. Supersedes OpenAPI decision I1 ("all OpenAPI nodes are simple").

## Rule

When a row offers a choice between options — a selector, a toolbar of alternatives, a set of codes —
the options are **nested nodes of one complex container node** that stands for that choice:

| API type | Container (complex) | Nested options | Selector row |
| --- | --- | --- | --- |
| AsyncAPI | `messageSectionSelector` | message sections (payload, headers, …) | section selector |
| AsyncAPI | `bindings` | `binding` per protocol | binding selector |
| OpenAPI | `responses` | `response` per code | response-code selector in the Responses title row |
| OpenAPI | `content` (request and response Body) | `mediaType` per media type | media-type selector in the Body title row |
| Security (OpenAPI, AsyncAPI) | `securityAlternatives` | `securityRequirement` per alternative | security toolbar |

The children of an option are ordinary children of that option.

## Shape

- The crawl rule of the container sets `complex: true`; the shared hooks then add every crawled
  option as a nested node of the container (`container.addNestedNode`). An option's `container` is
  the complex node; its `parent` is the **container's parent** (for example `response.parent` is the
  operation).
- A complex node has no own value: `value(id?)` and `childrenNodes(id?)` **delegate to a nested
  node** (the given one, else the first). Read options with `nestedNodes()` / `findNestedNode(id)` only,
  through the API type's option helpers; never call `childrenNodes()` on a container — it silently
  returns the first option's children.
- A node that needs its own value and also owns a choice keeps the value and gets a **dedicated
  container child** for the choice: `security` (simple, `isInheritedFromDocument`,
  `allowsAnonymous`, the title row) → `securityAlternatives` (complex, the toolbar) →
  `securityRequirement`.
- Node ids do not change with the shape (they come from the crawl path), so view state keyed by node
  id keeps working.

## Diffs

- The options' add / remove / rename records live on the **container's crawl value**, keyed by the
  option key; the record-driven aggregators take the container as the owner of an option
  (`containerNode ?? parentNode`): an option inherits the container's whole add / remove, else
  reads its own entry from the container's descendant diffs.
- The selector row belongs to the container: its synthetic options diff (`OPENAPI_RESPONSE_OPTIONS_DIFF_KEY`,
  `OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY`, `SECURITY_ALTERNATIVES_DIFF_KEY`) is a field diff of the container
  (or, where the selector sits in an owner's title row, of that owner), with its severity placement.
- Selected-option state is view state (AsyncAPI: the selector component; OpenAPI:
  `OpenApiViewStateContext`, because the parent level plans separators from the selected option).

## Related documents

- Tree model: [../architecture/data-model-plain.md](../architecture/data-model-plain.md),
  [../architecture/data-model-with-diffs.md](../architecture/data-model-with-diffs.md).
- OpenAPI: [../../openapi/entities/responses.md](../../openapi/entities/responses.md),
  [../../openapi/entities/request-body.md](../../openapi/entities/request-body.md),
  [../../openapi/entities/security.md](../../openapi/entities/security.md).
- AsyncAPI Security: [../../async-api/features/security.md](../../async-api/features/security.md).
- Review finding F25: [../../openapi/notes/2026-10-architecture-review.md](../../openapi/notes/2026-10-architecture-review.md).
