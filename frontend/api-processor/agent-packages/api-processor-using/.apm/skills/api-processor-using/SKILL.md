---
name: api-processor-using
description: Use when consuming the api-processor library from another TypeScript project — building, comparing (changelog), or exporting a package version with PackageVersionBuilder, or importing its shared types, constants, and utilities.
---

# Using api-processor

api-processor turns API source specifications (REST/OpenAPI, GraphQL, AsyncAPI, MCP,
DDL, text) into a package-version build result. Its public API is split across two
entries; which one you import decides whether you pull in the DDL parser and its
~1.1 MB WASM.

## Two entry points: the light root and `/processor`

- **`@netcracker/qubership-apihub-api-processor`** — the **light** surface: shared
  types, constants and api-type ids (`BUILD_TYPE`, `REST_API_TYPE`,
  `VERSION_VALIDATION_LEVEL`, `VERSION_STATUS`, `ShareabilityStatus`,
  `VersionsComparison`, …) and pure utilities (`calculateNormalizedRestOperationId`,
  `calculateDdlEntityId`, compare-summary helpers, …). It is parser-free — safe to
  import from anywhere, including main-thread / UI code.
- **`@netcracker/qubership-apihub-api-processor/processor`** — the **engine**:
  `PackageVersionBuilder` plus the build strategy and the compare/build machinery.
  It transitively imports `@netcracker/qubership-apihub-ddlapi/parser`, so importing
  it pulls the DDL parser (libpg-query WASM). Import it **only** where spec
  processing actually runs.

```typescript
// shared types / constants / utils — from the light root
import { BUILD_TYPE, VERSION_VALIDATION_LEVEL, type VersionsComparison } from '@netcracker/qubership-apihub-api-processor'
// the build engine — from /processor
import { PackageVersionBuilder } from '@netcracker/qubership-apihub-api-processor/processor'
```

The light root re-exports every type the engine returns (e.g. `VersionsComparison`,
`BuilderResolvers`, `FileId`), so a consumer can type its calls without importing
`/processor` anywhere but the module that actually runs the build.

## Keep `PackageVersionBuilder` off the main thread

`PackageVersionBuilder` is the only reason to import `/processor`, and it drags in
the DDL parser + WASM. In a browser app, run it in a **Web Worker**, never the main
bundle:

- The worker module imports `PackageVersionBuilder` from `/processor`; everything on
  the main thread imports only the light root. That confines the parser/WASM to the
  worker chunk and keeps it out of the main app bundle.
- Instantiate the worker **lazily** — create it on the first publish / changelog /
  export, not at app load — so the worker chunk (and the WASM it loads on the first
  DDL parse) is fetched only when processing actually happens.
- ddlapi's browser `/parser` build is self-contained (WASM inlined), so **no
  bundler WASM plugins are needed**. Just keep ddlapi out of esbuild pre-bundling
  (`optimizeDeps.exclude: ['@netcracker/qubership-apihub-ddlapi']`) so it stays a
  lazily-loaded chunk.

In Node, import `/processor` directly (CJS `require` resolves the externalized
parser, which reads its WASM from `node_modules` via `fs`) — no plumbing required.

## Never import the engine from main-thread or shared code

Importing `PackageVersionBuilder` — or anything else from `/processor` — into a
module that runs on the main thread re-introduces the parser/WASM into the main
bundle, defeating the split. The types, constants, and utilities you need there all
live on the light root. Consumers enforce this with an ESLint
`@typescript-eslint/no-restricted-imports` rule that forbids `/processor` (and
`ddlapi/parser`) outside the designated worker / engine files.
