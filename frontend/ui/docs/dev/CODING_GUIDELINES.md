# Coding guidelines

TypeScript, React, MUI, and file conventions for **APIHUB UI** (`packages/portal`, `packages/agents`, `packages/shared`).

## Project-specific TypeScript conventions

- Prefer **explicit domain types** for identifiers and units (e.g. `Key`, `PackageKey`, `VersionKey`, `Pixel`).
- Keep these types through public APIs and boundaries. Avoid silently collapsing them back to primitives in function signatures and return types.
- Avoid `any`. Use narrow types + type guards for runtime boundaries.
- **Comparisons**: use `===` / `!==` only. Do not use `x == null` or `x != null`; for optional values use types and explicit checks (`x === null`, `x === undefined`, or both).
- **lodash-es**: use existing helpers from `lodash-es` (`isEmpty`, `groupBy`, `merge`, `sortBy`, etc.) instead of reimplementing the same logic locally. Import named functions only (`import { isEmpty } from 'lodash-es'`). Add domain-specific helpers only when Lodash does not fit.
- **Inline types**:
  - If a **return type** is a function type (or contains one, e.g. `() => void`, `(id: ChatId) => Promise<void>`), extract a named `type` and use it in the signature. Applies to hooks, handlers returned from hooks, and exported utilities.
  - If a function type appears **only inside another type** (e.g. a field on props or options) and stays simple (single call signature, few parameters), it may stay inline.
  - For non-function types: extract named types for complex unions/intersections in public signatures; simple fields (`string`, literals, `T | null`) may stay inline.
- **Object literals**: in one object, if every property has the same name for key and value (`foo` / `foo`), use shorthand for all (`{ foo, bar }`). If at least one property differs (`label: title`), use long form for every property in that object (`{ foo: foo, bar: bar, label: title }`). Never mix shorthand and long form (`{ foo, bar: baz }` is forbidden).
- Prefer **`const` object unions** with `as const` over `enum` for new code.
- **Naming**: related constants, types, and factories for one entity share a **common prefix** at the start (e.g. `AI_CHAT_ROOT`, `aiChatListKey`, `AiChatMessage`).
- **Filenames** (match `qubership-apihub-ui` portal conventions):
  - **`.tsx` with a primary React component**: PascalCase, same as the exported component (`ChatScreen.tsx` -> `ChatScreen`).
  - **`.ts` without a primary component** (hooks, utils, reducers, constants, types, `/api`): **camelCase** (`panelContext.ts`, `useHistoryScreen.ts`, `composerMultilineLayout.ts`).
  - Suffixes: `*.story.ts` for Storybook; `*.unit.test.ts` for unit tests.
  - Do not use kebab-case for new portal source files unless an existing folder already standardizes on it.
  - **No `index.ts` / `index.tsx` barrel files** for new code (`filenames/no-index` in ESLint). Import from concrete module files (e.g. `types/chat.ts`, not `types/index.ts`). Legacy `index.*` entry points may exist with an eslint-disable; do not add new barrels or reexport folders.
- Export symbols only when another file imports them. Helpers, types, constants, and child components used only within the same file stay unexported.
- Avoid duplicating logic and bloated conditions: extract shared helpers, hooks, or functions instead of copypasting branches. Prefer early returns, named booleans, or `if`/`switch` over nested or chained ternaries and long inline `&&` / `?:` trees.

### Named functions: `function` vs `const` arrow

Use a mixed style by role:

- **`function`**: module-level named logic - exported utilities, `/api` request helpers, hooks (`use...`), reducers, parsers, type guards, and private helpers at the **bottom of the file** (see File organization). Required for TypeScript overloads.
- **`const` + arrow**: React components (`const Foo: FC<...> = ...`), callbacks (`.map`, event handlers, react-query `predicate`), and short value factories (e.g. query-key builders).
- **Inside a component or hook**: local handlers and helpers use arrows (they read props/state from the closure).

Do not call a `const` helper during module initialization from a line above its declaration (e.g. `export const x = helper()` while `helper` is defined later). Calls from other functions at runtime are allowed.

## Import organization

- Import order is strict:
  1. Third-party modules (`react`, `@mui/*`, `react-router`, `zod`, etc.),
  2. then `ui-shared` package imports,
  3. then all other local project imports.
     Keep exactly one empty line between each import group.
- Use explicit package aliases instead of generic `@apihub/*` shortcuts. Prefer concrete monorepo aliases (for example: `@netcracker/qubership-apihub-ui-portal`, `@netcracker/qubership-apihub-ui-shared`, etc.) according to local tsconfig path setup.
- Inline type imports in named imports to avoid duplicate import statements from the same source, e.g.:
  - `import { type FC, memo, useCallback, useMemo, useRef } from 'react';`
  - `import { type ApiResult, apiClient } from '@netcracker/...';`
- Prefer `import type` when the statement contains only types.

## React patterns

- Prefer function components + hooks.
- Every new React component must set an explicit `displayName` (including components wrapped with `memo`, `forwardRef`, or other HOCs) so DevTools, error boundaries, and tests show stable names.
- Colocate state with the smallest owning component; split components before adding memoization.
- Use memoization (`useMemo`, `useCallback`, `React.memo`) only with a measured need (re-renders, expensive compute, unstable deps).
- Error handling: use explicit empty/error/loading states; add error boundaries where a subtree failure must not crash the whole tree.
- Conditional JSX: if a branch renders nothing, use `{condition && <Node />}`, not `{condition ? <Node /> : null}`. Use a ternary only when both branches render different non-null content.

## API hooks and mutations

- `/api` hooks: HTTP, serialization, transport errors, react-query cache keys/invalidation only. No navigation, toasts, focus, or feature UI state.
- View-model helpers (grouping, sorting, selectors) live outside `/api` if reused across screens.
- `mutate` / `mutateAsync` only inside `/api` hooks. Components and screen hooks call named methods (`deleteChat(chatId)`, `renameChat(...)`), never `mutate` with inline callbacks.
- UI side effects for a mutation (panel state, rollback) go in `state/` or next to the feature UI (`use*.ts` beside screens/components) as typed action objects; the screen hook passes them into the `/api` hook. Keep transport logic in a non-exported mutation-options builder in the same `/api` file.

## MUI patterns

- Use theme-driven styling via `styled` first; use `sx` only if `styled` cannot express the layout, and use theme tokens. Use `styled` for reusable/component-level styles; use inline styles only for one-off trivial tweaks. Do not use `sx` by default.
- Use **`styled(Box)`** (or another MUI layout primitive), not **`styled('div')`**, unless a native element is required for semantics or browser behavior.
- **Typography**: use a **`styled(Typography)`** variant (or parent `Box` / `Stack` alignment), not many one-off props (`component`, `color`, `textAlign`, etc.) on inline JSX, when the pattern repeats.
- Keep component composition predictable: small focused components, props typed explicitly.

## File organization

Put **all helpers last** in every file. Public/exported API and main logic come first; private helpers and implementation details come after.

- **Component files** (`.tsx`): constants and types, main component, child components, styled-components, helper functions.
- **Non-component files** (`.ts` utilities, `/api`, reducers, parsers): types and constants, exported functions and hooks, then private helpers (`function` at file bottom per Named functions above).

## Accessibility baseline

- Use semantic elements first; add ARIA only if semantics are insufficient.
- Every interactive control must be keyboard accessible and have an accessible name.
- Manage focus when opening dialogs/menus; ensure visible focus states.
