---
name: apihub-ui-authoring
description: "Writes and reviews code of the APIHUB UI module (frontend/ui, the Portal and Agents SPAs and their shared package): where code goes, file names, import aliases, wire types, the split between /api hooks and UI code, test IDs, and how request errors reach the user. Use when adding or changing TypeScript in frontend/ui, including request error handling, mutations, and notifications."
---

# APIHUB UI

What is specific to `frontend/ui`; the generic rules are in the TypeScript, React, and MUI skills. Build and test
commands are in `frontend/ui/AGENTS.md`.

## Where code goes

| What | Where |
|---|---|
| Code both SPAs use: components, hooks, request helpers, themes, entities | `packages/shared/src/` |
| Portal screens, `api-hooks/`, feature folders such as `components/AiAssistant/` | `packages/portal/src/` |
| Agents SPA | `packages/agents/src/` |
| Dev servers (Express, dev only) | `packages/<spa>/server/` |
| MSW mocks for `dev:proxy:msw` | `packages/<spa>/src/mocks/handlers/` |

## Files

- A `.tsx` file with a primary React component is PascalCase and named after the component (`ChatScreen.tsx`
  exports `ChatScreen`). A `.ts` file without one (hooks, utils, reducers, constants, types, `/api`) is camelCase.
  Use kebab-case only in a folder that already standardizes on it.
- Unit tests are `*.unit-test.ts` beside the code, stories are `*.stories.tsx`; the unit-test suite and the Storybook of
  `ui-shared` collect them from all three packages. `*.unit.test.ts` and `*.story.ts` are never picked up.
- No new `index.ts` or `index.tsx` barrels (`filenames/no-index`); import from the concrete file.

## Imports

Use the aliases of the package's `tsconfig.json`: `@portal/<folder>/...`, `@agents/<folder>/...`, and
`@netcracker/qubership-apihub-ui-shared/<path>` (`./<path>` inside `packages/shared`). No generic `@apihub/*`.

## Wire types

A type that mirrors backend JSON ends in `Dto` (`PackageVersionDto`) and lives in `entities/`; the UI type drops
the suffix and keeps only the fields the UI uses. Map one to the other in the hook or an entity mapper
(`toPackageVersionContent`); while the shapes match, `type Foo = FooDto` is enough.

## API hooks and mutations

- `/api` hooks hold HTTP, serialization, transport errors, and React Query keys and invalidation only: no
  navigation, notifications, focus, or feature UI state. Shared view-model helpers live outside `/api`.
- Only `/api` hooks call `mutate` or `mutateAsync`; components and screen hooks call named methods
  (`deleteChat(chatId)`).
- UI side effects of a mutation (notification, panel state, rollback) are typed action objects from `state/` or the
  screen hook, passed into the `/api` hook. The transport logic stays in a non-exported mutation-options builder.

## Request errors and notifications

The helpers in `packages/shared/src/utils/requests.ts` (and the `portalRequest*` wrappers, which add `API_V2`)
handle a response that is not OK like this:

| Case | Result |
|---|---|
| `401`, or `404` with `ignoreNotFound: true` | rejects with no error object (`error?.message` in existing code) |
| `customErrorHandler` passed | the handler runs, then the request **resolves** with `null` (`''` from `requestText`) |
| any other status | dispatches `FETCH_ERROR_EVENT` (`Error <status>` and the backend message), throws `HttpError` |
| `requestBlob` | throws `NotFoundError` or `Error` and dispatches nothing |

- In the Portal, `ExceptionSituationHandler` (mounted in `BasePage.tsx`) turns `FETCH_ERROR_EVENT` into an error
  snackbar, and for `404` and `500` **replaces the whole page with the error page**. Pass `ignoreNotFound: true`
  where a missing resource is a normal answer.
- The Agents SPA has no such listener: a failed request shows nothing unless the feature shows it.
- So an `onError` notification is needed only for a feature-specific message, for errors the helpers do not
  dispatch (`customErrorHandler`, `requestBlob`, client-side failures), and in the Agents SPA. In the Portal it
  otherwise replaces the global snackbar, which holds one notification at a time.
- Notify with `useShowSuccessNotification`, `useShowErrorNotification`, `useShowInfoNotification`, or
  `useShowWarningNotification` (`{ title?, message, link?, button? }`). For a snackbar regardless of status,
  dispatch `FETCH_ERROR_EVENT` with `forceSnackbar: true`, as `components/AiAssistant/api/errors.ts` does.
- A query still renders its own loading, empty, and error states; the snackbar does not replace them.

## Test IDs

Take `data-testid` through `TestableProps` from `@netcracker/qubership-apihub-ui-shared/components/Testable`,
destructured as `'data-testid': dataTestId`; do not add a separate `dataTestId` prop.
