# qubership-apihub-api-processor

TypeScript/Node.js library that processes API source specifications (REST/OpenAPI, GraphQL, text, and unknown files) into a **package-version build result**: parsed documents, extracted operations, optional version comparisons (changelog), export artifacts, and notifications.

This repository is published as `@netcracker/qubership-apihub-api-processor`.

## What it does (high level)

The main entry point is `PackageVersionBuilder`. You provide:

- **Build configuration** (`BuildConfig`) that describes *what* to build (package id/version, files/refs, build type, etc.)
- **Resolvers** (`BuilderResolvers`) that describe *how* to fetch inputs (files, previous version data, templates, documents, etc.)

The builder produces a `BuildResult` that contains:

- **documents** (`Map<string, VersionDocument>`)
- **operations** (`Map<string, ApiOperation>`)
- **comparisons** (`VersionsComparison[]`, when changelog comparison is enabled)
- **notifications** (errors/warnings/info produced during parsing/building)
- **exportDocuments / exportFileName** (for export-related build types)
- **merged** document (for merged outputs where applicable)

## Technologies used in this repo

- **Language**: TypeScript
- **Runtime**: Node.js (see `package.json` engines: Node >= 18)
- **Build**: `tsc` (CommonJS) + `vite` (ES/UMD bundle + types via `vite-plugin-dts`)
- **Testing**: Jest + `ts-jest`
- **API parsing & processing**: `graphql`, `swagger2openapi`, `js-yaml`, `ajv`, plus Netcracker ApiHub libraries:
  - `@netcracker/qubership-apihub-api-diff`
  - `@netcracker/qubership-apihub-api-unifier`
  - `@netcracker/qubership-apihub-graphapi`
  - `@netcracker/qubership-apihub-json-crawl`

## Installation (as a dependency)

```bash
npm i @netcracker/qubership-apihub-api-processor
```

## Basic usage

```typescript
import { PackageVersionBuilder } from '@netcracker/qubership-apihub-api-processor'

const builder = new PackageVersionBuilder(config, {
  resolvers: {
    fileResolver: this.fileResolver.bind(this),
    ...versionResolvers,
  },
})

const buildResult = await builder.run()
```

## Configuration model

### BuildConfig

`BuildConfig` includes (among other fields):

- **packageId / version**: identify the package version being built
- **status**: `release | draft | archived | release-candidate` (and `''` for some build types)
- **previousVersion / previousVersionPackageId**: previous version for changelog comparisons
- **buildType**: selects the processing strategy (see below)
- **files**: list of `{ fileId, ... }` source inputs (YAML/JSON/GraphQL/MD/Proto/etc. depending on supported formats)
- **refs**: references to other packages/versions to include or resolve against
- **format / allowedOasExtensions / operationsSpecTransformation**: export-specific switches (for export build types)

### Build types (strategies)

The builder selects a strategy based on `buildType`:

- **`build`**: build documents and operations; optionally compute comparisons to `previousVersion`
- **`changelog`**: build changelog/comparisons (requires previous version)
- **`prefix-groups-changelog`**: changelog with group prefixing logic
- **`exportVersion`**: export a whole version in the selected format
- **`exportRestDocument`**: export a single REST document by `documentId`
- **`exportRestOperationsGroup`**: export a REST operations group (`groupName`) using a transformation (`reducedSourceSpecifications` or `mergedSpecification`)

Deprecated (still present in constants/types):

- **`documentGroup`**
- **`reducedSourceSpecifications`**
- **`mergedSpecification`**

## Resolvers (I/O boundary)

`PackageVersionBuilder` itself does not know how to fetch files or previous versions — it delegates this to resolvers.

Only **`fileResolver` is required**. The rest are optional in the type system, but some build types/flows will throw if a resolver is missing.

Resolvers you can provide (see `BuilderResolvers`):

- **fileResolver**: load a file by `fileId` (required)
- **packageResolver**: resolve package metadata
- **versionResolver**: resolve version metadata (used for comparisons and various flows)
- **versionOperationsResolver**: fetch operations for a given version (may include operation data)
- **versionReferencesResolver**: fetch references for a version
- **versionDeprecatedResolver**: fetch deprecated operations/items for a version
- **versionComparisonResolver**: fetch cached comparison summary (optional)
- **groupDocumentsResolver**: fetch documents filtered by operation group
- **versionDocumentsResolver**: fetch documents for a version (optionally filtered by apiType)
- **rawDocumentResolver**: fetch a raw document file by (version, packageId, slug)
- **groupExportTemplateResolver / templateResolver**: resolve templates for export

## Incremental rebuilds

`PackageVersionBuilder.update()` supports incremental rebuild scenarios:

- Clears caches depending on `cleanCache`
- Re-parses only changed inputs (based on `changedFiles`)
- Recomputes comparisons when previous version changed or inputs changed (unless `withoutChangelog`)

## High-level architecture (ASCII)

The library is structured as a pipeline with a **single public orchestrator** (`PackageVersionBuilder`), pluggable **strategies** (by build type), reusable **components**, and per-api-type **builders**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PUBLIC API / ENTRY                             │
│                                                                             │
│                       PackageVersionBuilder (main)                          │
│                        ┌────────────────────────┐                           │
│                        │ run()                  │                           │
│                        │ update()               │                           │
│                        │ createVersionPackage() │                           │
│                        └───────────┬────────────┘                           │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STRATEGIES (Strategy pattern)                       │
│                                                                             │
│  BuilderStrategyContext selects & runs:                                      │
│  - BuildStrategy                                                            │
│  - ChangelogStrategy                                                        │
│  - DocumentGroupStrategy / PrefixGroupsChangelogStrategy                     │
│  - MergedDocumentGroupStrategy                                              │
│  - ExportVersionStrategy / ExportRestDocumentStrategy                        │
│  - ExportRestOperationsGroupStrategy                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               COMPONENTS                                    │
│                                                                             │
│  Files → Document → Operations → Compare → Package/Deprecated                │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API TYPE BUILDERS                                   │
│                                                                             │
│  REST (OpenAPI)  |  GraphQL  |  Text  |  Unknown                             │
│   - parser       |  - parser |  ...   |  ...                                 │
│   - document     |  - doc    |        |                                      │
│   - operations   |  - ops    |        |                                      │
│   - changes      |  - changes|        |                                      │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RESOLVERS & STORAGE                                    │
│                                                                             │
│  External resolvers supply I/O (files, versions, documents, templates).      │
│  Internal caches store parsedFiles/documents/operations and version caches.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data flow (simplified)

```
1) BuildConfig + Resolvers
   ↓
2) PackageVersionBuilder.run() selects strategy by buildType
   ↓
3) Strategy invokes components using BuilderContext / CompareContext
   ↓
4) Components parse inputs via apiBuilders (REST/GraphQL/Text/Unknown)
   ↓
5) BuildResult is produced: documents, operations, comparisons, notifications, exports
```

## Build artifacts (this repo)

This repo builds two sets of outputs (see `package.json` and Vite config):

- **CommonJS**: `dist/cjs` (via `tsc --module commonjs --outDir dist/cjs`)
- **ES/UMD bundle + types**: `dist/esm/apihub-builder.es.js` and `dist/esm/apihub-builder.umd.js` (via `vite build`)

## How to build (repo)

```bash
npm ci
npm run build
```

## How to run tests

```bash
npm test
```

Coverage:

```bash
npm run test:coverage
```

## How to run & debug (repo)

This is a library, so there is no `start` script. For debugging runtime behavior, the repo contains a performance harness entrypoint at `test/performance.ts` and a dedicated Vite config for it.

- Build the performance bundle:

```bash
npm run performance:build
```

- Run it with Node inspector:

```bash
npm run performance:run-inspect
```

Notes:

- `npm run performance:run-inspect` executes `node --inspect dist/index.es.js` (the file produced by the performance Vite build).
- `profile:*` and `operation:test` scripts in `package.json` reference `./test/profile.js` and `./test/operation.js`, but those files are not present in this repository snapshot.

## Local development tips

The repo includes helper scripts to link/unlink related ApiHub packages (useful when developing multiple packages together):

```bash
npm run development:link
```

```bash
npm run development:unlink
```

## Repository layout (quick map)

- **`src/builder.ts`**: `PackageVersionBuilder` orchestrator (run/update/package creation)
- **`src/strategies/`**: build-type strategies (build, changelog, export, etc.)
- **`src/components/`**: reusable build components (files/document/operations/compare/package/deprecated)
- **`src/apitypes/`**: per-API-type logic (REST/OpenAPI, GraphQL, text, unknown)
- **`src/types/`**: public and internal types (configs, resolvers, build results)
- **`src/utils/`**: shared helpers (diff/merge/validate/logging/etc.)
- **`test/`**: Jest test suite + test projects fixtures
