# build-id

The build id of a workspace package: a hash of its sources and of the workspace packages it depends on. A package
reports `<version from package.json>+<build id>`, for example `5.7.2+282fe2a072`.

Two builds of the same sources report the same string wherever they run. A branch that changes the code without a
version bump reports a different one, which is what the check "this version was built by another api-processor"
and the "reload the page" prompt of the UI need.

## What it hashes

- The files of the package and of every package in its `dependencies` with a `workspace:` range, transitively.
- An app (`includeDevDependencies: true`) also follows its own workspace `devDependencies`, because it bundles them.
  A library's `devDependencies` are its tools and never count.
- `extraDirs`: directories outside that closure that the build still reads. Each one is labeled by its path
  relative to the workspace root. The UI passes `frontend/ui/vite-plugins`.
- Not `node_modules`, build output, tests, stories, documentation, Markdown, and similar files that no build reads.
- Line endings are normalized and names are sorted by code unit, so a Windows and a Linux checkout of one commit agree.

## API

```js
import { computeBuildId, stampedVersion } from '@netcracker/qubership-apihub-build-id'

stampedVersion(packageDir)                                   // '5.7.2+282fe2a072'
stampedVersion(appDir, { includeDevDependencies: true })     // '3.10.2+3ed957bfd9'
```

```js
// vite.config.ts of a library with a tsc build next to the Vite one
import { stampedVersionPlugin } from '@netcracker/qubership-apihub-build-id/vite-plugin'

plugins: [stampedVersionPlugin(__dirname)]
```

`stampedVersionPlugin` replaces the import of the package's own `package.json` with a module that exports only
`version`. A UI app does not use it: it passes the version through Vite `define` and never imports its manifest.

From the command line: `node tools/build-id/build-id.mts <package dir>`.

## Who uses it

| Consumer | How |
|----------|-----|
| `frontend/api-processor` | the Vite plugin, and `scripts/stamp-cjs-version.mjs` for the CommonJS build |
| `frontend/ui` | `vite-plugins/app-version.ts`, for `define` and for `version.json`; the stamp includes `vite-plugins` |
| `tools/ci/announce-versions.js` | loads `build-id.mts` by path, because the workflow runs no install |

## Source

The package is TypeScript (`build-id.mts`, `vite-plugin.mts`) that Node 24 runs as it is, by stripping the types, so
there is no build step and no separate declaration files: the consumers read the types from the source. It therefore
uses only syntax that has no runtime form (no enums, no parameter properties), and `tsconfig.json` enforces that.

## Test

```bash
node --test tools/build-id/build-id.test.mjs   # behavior
pnpm --filter @netcracker/qubership-apihub-build-id run typecheck
```

The root `pnpm run test:tools` runs the tests with the other tools.
