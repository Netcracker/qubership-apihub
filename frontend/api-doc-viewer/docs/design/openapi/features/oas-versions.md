# OAS 3.0 and OAS 3.1

What the OpenAPI stack shares between OAS 3.0.x and 3.1.x, what differs, and where each
difference is implemented. Status: **implemented** (first iteration; see [../notes/2026-10-implementation-decisions.md](../notes/2026-10-implementation-decisions.md)).

## Principle

Shared code by default; every version difference goes through **one** strategy object, the
**dialect**. No `if (version === …)` outside dialect classes — in next-data-model or in the viewer.

Most differences never reach the OpenAPI stack:

| Layer | Absorbs |
| --- | --- |
| `api-unifier` (`normalize` / `denormalize`, `apiDiff`) | `$ref` resolution incl. OAS 3.1 Reference Object `summary` / `description` overrides; `components.pathItems` (3.1) and path-item `$ref`; path-item parameter merge; schema unification per dialect (`openApiJsonSchemaRules(version)`: OAS 3.0 schema rules vs JSON Schema 2020-12-like rules for 3.1, e.g. 3.1 `type: [T, 'null']` → `anyOf`) |
| JSON Schema stack | every schema keyword difference (`nullable` vs `null` type, boolean vs numeric exclusive bounds, `example` vs `examples`, `const`, `contentMediaType`) — it infers the dialect from the fields ([validation rows](../../json-schema/features/validation-rows.md#value-range-dialects)) |

What is left for the OpenAPI stack is small and listed below.

## Dialect resolution

```text
packages/next-data-model/src/building-service/openapi/shared/dialects/
  dialect.ts                 OpenApiDialect (interface) + OpenApiDialectBase (abstract, shared defaults)
  openapi-30-dialect.ts      OpenApi30Dialect extends OpenApiDialectBase
  openapi-31-dialect.ts      OpenApi31Dialect extends OpenApiDialectBase
  dialect-resolver.ts        OpenApiDialectResolver.resolve(source): OpenApiDialect | null
```

| Rule | Detail |
| --- | --- |
| Source of truth | `resolveSpec(source).type` from `@netcracker/qubership-apihub-api-unifier` → `SPEC_TYPE_OPEN_API_30` / `SPEC_TYPE_OPEN_API_31` (`OpenApiSpecVersion`). Do not parse `openapi` by hand. |
| Unsupported | Swagger 2.0, OAS 3.2+, non-OpenAPI → `null`; the transformer logs and returns `null`, the viewer renders nothing. |
| Merged documents | The merged `openapi` field holds the **after** value; a version change shows up as an `openapi` replace diff, which the viewer ignores. The dialect of a merged document is the after version. |
| Exposure | `specVersion` is stored on the `operation` node value. Viewers never branch on it: version-dependent **labels and flags** are resolved into node values by the transformer (e.g. `requiredScopesKind`). |
| Instances | Dialects are stateless; the resolver returns shared singletons. |

```typescript
export interface OpenApiDialect {
  readonly specVersion: OpenApiSpecVersion
  /** Security scheme types this version defines. Unknown types are still rendered, with a dev-mode warning. */
  readonly securitySchemeTypes: ReadonlySet<string>
  /** How the scopes array of a Security Requirement Object is interpreted for one scheme type. */
  resolveRequiredScopesKind(schemeType: string | undefined): 'scopes' | 'roles' | 'ignored'
  /** Whether the Responses Object is required on an operation (only drives a dev-mode warning). */
  readonly isResponsesObjectRequired: boolean
}
```

## Differences handled by the dialect

### Security

| Concern | OAS 3.0 | OAS 3.1 | Dialect member |
| --- | --- | --- | --- |
| Scheme types | `apiKey`, `http`, `oauth2`, `openIdConnect` | the same + `mutualTLS` | `securitySchemeTypes` |
| Scopes of `oauth2`, `openIdConnect` | required scopes | required scopes | `resolveRequiredScopesKind` → `'scopes'` |
| Scopes of any other type | must be empty | MAY list **role names** | 3.0 → `'ignored'` (non-empty list: dev-mode warning, row hidden); 3.1 → `'roles'` (row `Required roles`) |
| `mutualTLS` card | — (unknown type: shown as is, dev warning) | type label `Mutual TLS`, no detail rows | `securitySchemeTypes` |

Fixtures: `oas30/fields/security/*`, `oas31/fields/security/*`;
diffs: `openapi-diffs/oas31/02-mutual-tls-alternative-added`, `oas31/04-role-scopes-added`.

### Responses

| Concern | OAS 3.0 | OAS 3.1 | Effect |
| --- | --- | --- | --- |
| `responses` on an operation | required | optional | Section hidden when absent in both versions; 3.0 additionally logs a dev-mode warning (`isResponsesObjectRequired`). |

Fixture: `oas31/fields/responses/01-no-responses`.

## Differences absorbed upstream (no OpenAPI-stack code)

Listed so that nobody adds code for them; each needs only a fixture.

| Concern | OAS 3.0 | OAS 3.1 | Handled by | Fixture |
| --- | --- | --- | --- | --- |
| Reference Object siblings | ignored | `summary` / `description` override the target | `api-unifier` (`referenceObjectResolver(allowedOverrides)`) — the merged parameter / response already has the overriding description (E12) | `oas31/structure/01-reference-description-overrides`, `02-components-path-items` |
| `components.pathItems` | invalid (removed by the unifier with a validation error) | allowed | `api-unifier` | same |
| Path-item `$ref` | allowed | allowed | `api-unifier` | same |
| Nullable | `nullable: true` | `type: [T, 'null']` → unified to `anyOf: [T, {type: null}]` (E10) | JSON Schema stack (combiner selector) | `oas31/fields/schemas/01-nullable-type-array-parameter`, `02-nullable-type-array-body` |
| Exclusive bounds | boolean flags | numbers | JSON Schema value-range dialects | `oas31/fields/schemas/03-numeric-exclusive-bounds` |
| Examples in schemas | `example` | `examples` (array) | JSON Schema `transformExample` | `oas31/fields/schemas/04-examples-array` |
| `const`, `contentMediaType`, `contentEncoding` | — | allowed | JSON Schema stack (`const` and `contentMediaType` are not displayed there: triage against JSON Schema coverage) | `oas31/fields/schemas/05-const`, `08-content-media-type-encoding` |
| Enum without `type` | rare | common | unified to `type: any` with `enum` | `oas31/fields/schemas/06-enum-without-type` |
| Boolean schemas (`true` / `false`) | invalid | allowed | JSON Schema stack | `oas31/fields/schemas/07-boolean-schema` |
| `requestBody` on `GET` / `HEAD` / `DELETE` | "not supported" semantics | allowed | rendered as is in both | — |
| `webhooks`, `jsonSchemaDialect`, `$schema` | — | allowed | out of scope (operation viewer) | — |

## Schemas

The OpenAPI stack **never rewrites schemas** for a dialect: the synthesizer copies parameter and
header schemas verbatim, and body schemas are passed as merged. Any schema display difference is a
JSON Schema stack topic.

## Testing matrix

| Layer | OAS 3.0 | OAS 3.1 |
| --- | --- | --- |
| Dialect unit tests | resolver returns `OpenApi30Dialect` for `3.0.0`–`3.0.4`; scope kinds | resolver returns `OpenApi31Dialect` for `3.1.0`–`3.1.1`; scope kinds incl. `mutualTLS` |
| Transformer unit tests | every entity on `oas30/*` fixtures | every entity on `oas31/*` fixtures |
| Stories / ITs | `OpenAPI Operation Suite/OAS 3.0` | `OpenAPI Operation Suite/OAS 3.1` |
| Diff stories / ITs | `OpenAPI Operation Diffs Suite/*` (3.0 base) | `OpenAPI Operation Diffs Suite/OAS 3.1` |

Never assume one dialect in a shared test — the validation-rows rule applies here too.

## Related documents

- [../entities/security.md](../entities/security.md)
- [../notes/2026-10-design-analysis.md](../notes/2026-10-design-analysis.md) — E10, E12
