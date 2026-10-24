---
name: apihub-typescript-coding
description: "Writes and reviews TypeScript in the frontend modules of the qubership-apihub monorepo: the rules of the pnpm workspace, the type, naming, function, import, and file conventions the modules share, and where a module deviates. Use when adding or changing TypeScript in frontend/ or tests/ui-tests/."
---

# TypeScript in the APIHUB frontend

Each TypeScript module has its own ESLint config and style. Decide in this order:

1. The module's ESLint config and the code around the change.
2. The module's own skill: `apihub-ui-authoring` in `frontend/ui`, the `*-authoring` skills of the libraries,
   `tests/ui-tests/docs/CODING_GUIDELINES.md` in the UI tests.
3. This skill, for whatever the first two leave open.

## Workspace traps

- `nodeLinker: isolated`: a project resolves only the packages its own `package.json` declares, so an import that
  works in a neighbour can fail here. Add the dependency with `pnpm --filter <package name> add <dep>`.
- Workspace packages resolve to the dependency's built `dist/`. `TS2307: Cannot find module
  '@netcracker/qubership-apihub-...'` usually means the dependency is not built:
  `pnpm exec nx run <dependency>:build`.
- Since TypeScript 6, `types` defaults to `[]`: a `tsconfig.json` that compiles tests or Node code lists the global
  types it needs, such as `node` and those of the test framework.

## Libraries without UI

`api-processor`, `api-diff`, `api-unifier`, `api-visitor`, `json-crawl`, `ddlapi`, `graphapi`, `http-spec`, and
`compatibility-suites` run both in the browser (the build worker of `ui`) and in Node (`build-task-consumer`).

- Keep their `src/` free of Node built-ins (`node:fs`, `path`, `process`, `Buffer`) and of DOM APIs; only tests and
  `bin/` scripts may use Node.
- The entry module and the `main`, `module`, and `exports` fields of `package.json` are the public API. Before
  changing an export, list the consumers with `pnpm exec nx show projects --affected --files=<file>`.

## Types

- Prefer explicit domain types for identifiers and units (`Key`, `PackageKey`, `VersionKey`, `Pixel`), and keep
  them through public APIs and boundaries. Do not collapse them back to primitives in signatures and return types:
  an operation on a `Pixel` returns a `Pixel`.
- No `any`. Use narrow types and type guards at runtime boundaries; avoid unchecked `as`. Reuse the module's guards
  before writing a new one.
- Derive related shapes with `Pick`, `Omit`, and `Partial` instead of copying fields.
- Prefer `const` object unions with `as const` over `enum` in new code. Keep an existing `enum` that is part of a
  published API.
- Inline types:
  - A return type that is a function type, or contains one (`() => void`, `(id: ChatId) => Promise<void>`), gets a
    named `type` used in the signature. This applies to hooks, handlers returned from hooks, and exported utilities.
  - A simple function type used only as a field of another type (props, options) may stay inline.
  - Complex unions and intersections in public signatures get a named type; simple fields (`string`, literals,
    `T | null`) may stay inline.

## Comparisons and booleans

- `===` and `!==` only; never `==` or `!=`, not even `x == null`. For nullish checks compare explicitly
  (`x === null`, `x === undefined`) or use `??`.
- Do not compare a boolean with a literal: `if (flag)`, not `if (flag === true)`.
- Default an optional boolean with `??` (`prop ?? false`), not `||`: `false` is a valid value, not missing data.
- `.some()` and `.every()` already return a boolean; do not wrap the callback result in `Boolean(...)`.

## Naming and objects

- Related constants, types, and factories for one entity share a common prefix at the start: `AI_CHAT_ROOT`,
  `aiChatListKey`, `AiChatMessage`.
- In one object literal, use shorthand for every property or for none: `{ foo, bar }` or
  `{ foo: foo, bar: bar, label: title }`, never `{ foo, label: title }`.
- Name a new file like its neighbours in the same folder. The defaults:

  | Module | File names |
  |---|---|
  | `ui` | see `apihub-ui-authoring` |
  | `rest-playground`, `apispec-view` | PascalCase for a file whose main export is a React component, camelCase otherwise |
  | `api-doc-viewer` | PascalCase for React components, kebab-case otherwise |
  | `api-diff`, `api-processor`, `api-unifier`, `api-visitor`, `json-crawl`, `class-view`, `compatibility-suites` | kebab-case, with dotted qualifiers where the folder has them (`asyncapi3.compare.rules.ts`) |
  | `ddlapi`, `graphapi`, `http-spec` | camelCase |
  | `build-task-consumer` | NestJS names (`builder.module.ts`, `builder.service.ts`) |
  | `tests/ui-tests` | see `tests/ui-tests/docs/CODING_GUIDELINES.md` |

## Functions

Use a mixed style by role:

- `function` for module-level named logic: exported utilities, request helpers, hooks (`use...`), reducers, parsers,
  type guards, and private helpers at the bottom of the file. TypeScript overloads need it.
- `const` with an arrow for React components (`const Foo: FC<...> = ...`), callbacks (`.map`, event handlers,
  React Query `predicate`), and short value factories such as query-key builders.
- Inside a component or hook, local handlers and helpers are arrows: they read props and state from the closure.

Do not call a `const` helper during module initialization from a line above its declaration
(`export const x = helper()` with `helper` defined later). Calls from other functions at run time are fine.

Do not duplicate logic or grow conditions: extract a shared helper, hook, or function instead of copying a branch.
Prefer early returns, named booleans, and `if` or `switch` over nested or chained ternaries and long inline `&&` or
`?:` trees.

## Imports and exports

- Order the groups: third-party packages (`react`, `@mui/*`, `react-router`, `zod`), then workspace packages
  (`@netcracker/qubership-apihub-*`), then the module's own imports. Exactly one blank line between groups.
- One import statement per module. Mark type-only bindings inline (`import { type FC, memo, useRef } from 'react'`);
  never split one module into `import type { ... }` and `import { ... }` lines. Use `import type` only when every
  binding of the statement is a type. `lint:fix` can split a mixed import; merge it back.
- Import a workspace package by its package name, never by a relative path into another module's `src/`.
- Export a symbol only when another file imports it. Helpers, types, constants, and child components used only in
  their file stay unexported. A library's public API is its entry module; changing it changes every consumer.
- `lodash-es`, never `lodash`. Import each helper by its subpath default export
  (`import groupBy from 'lodash-es/groupBy'`), so a file pulls in only the helpers it uses. Use an existing helper
  instead of re-implementing it; write a domain helper only where Lodash does not fit.

## File organization

- Put all helpers last. Public and exported API and the main logic come first, private helpers and implementation
  details after them.
- A non-component file (`.ts` utilities, `/api`, reducers, parsers): types and constants, exported functions and
  hooks, then private helpers. Component files: see `apihub-react-coding`.
- Put shared leaf constants (layout sizes, query keys) in a module of their own. Importing them from a component file
  that transitively imports the consumer causes a circular-initialization error at load time.
- No copyright header, license block, or author notice on a new file. Match the surrounding file style otherwise.

## Comments

Comments explain why, not what the next line does. Do not reference paths outside the repository, section numbers
or plan IDs of internal documents, ticket IDs, or links that are not publicly reachable. Mark follow-up work as
`TODO(<scope>): <what>`, for example `TODO(api-processor): drop the fallback once DDL builds report errors`.
