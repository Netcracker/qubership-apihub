# MSW mocks

The Portal and the Agent UI mock backend responses in the browser with [Mock Service Worker](https://mswjs.io/)
(MSW). MSW is the main way to mock the backend in the UI. A handler can change a few fields of a real response,
answer a request without the backend, or serve an endpoint that the backend does not have yet. A request that no
handler takes reaches the backend unchanged.

The Express mock servers in `packages/portal/server/` and `packages/agents/server/`
([portal-mock-server.md](./portal-mock-server.md)) are deprecated. Add new mocks to MSW; the Express routes will move
here too.

## Turn the mocks on

MSW works on top of proxy mode ([local-development.md](./local-development.md)), so set `proxyServer` in
`vite.config.ts` of the app first.

1. From `packages/portal` or `packages/agents`, run `pnpm dev:proxy:msw`.
2. Check that the browser console shows `[MSW] Mocking enabled.`.

On a dev server started with `pnpm dev:proxy`, `localStorage.msw = 'true'` and a reload turn the mocks on too;
`localStorage.removeItem('msw')` and a reload turn them off.

Only a dev server starts the worker. `src/mocks/enable-mocking.ts` of each app checks `import.meta.env.DEV`, so a
production build contains no MSW code, and the Vite plugin `removeMswFromDistPlugin` deletes `mockServiceWorker.js`
from `dist`.

The worker files `packages/portal/public/mockServiceWorker.js` and `packages/agents/public/mockServiceWorker.js` are
committed. After an upgrade of `msw`, refresh them from the workspace root:

```bash
pnpm --filter @netcracker/qubership-apihub-ui run msw:init
```

## Where the handlers are

| Path | Content |
| --- | --- |
| `packages/portal/src/mocks/browser-worker.ts` | The list of handlers that the Portal registers |
| `packages/portal/src/mocks/handlers/` | Portal handlers, one file per endpoint domain: versions, notifications, comparison |
| `packages/agents/src/mocks/browser-worker.ts` | The list of handlers that the Agent UI registers |
| `packages/agents/src/mocks/handlers/` | Agent UI handlers: services, snapshots |
| `packages/shared/src/mocks/` | Code of both apps: `patchJsonResponse` and the version flag markers |

## Add a mock

1. Put the handler into the file of its endpoint domain under `src/mocks/handlers/` of the app. For a new domain,
   create a file and add its handlers to `browser-worker.ts`.
2. Type the request and response bodies with the wire types of `entities/` (`...Dto`), so that a change of the
   backend contract fails the type check of the mock too.
3. To change a real response, return `patchJsonResponse(request, patch)`: it sends the request to the backend past the
   mocks and returns the backend status with the body that `patch` makes of the real one. Return `passthrough()` for
   a request that the mock leaves alone.
4. When a marker in a version or snapshot name selects the case, keep the marker in a named constant. The handlers
   match markers as substrings, so a new marker must not contain an existing one, and no existing marker may contain
   it.
5. Describe the case on this page.

Mock only what a running backend cannot produce on demand, such as an endpoint that is not implemented yet or a state
that test data cannot create.

## Publication error cases

These handlers patch the responses of a real backend for the publication error cases that a backend does not produce
on demand. A handler changes only the fields that a marker in the version or snapshot name selects. The handlers of
the versions list, the references, the changes summary, and the Agent services list always rewrite the JSON body;
with no marker in a name, its fields stay as the backend sent them.

To check a case, publish a version whose name contains a marker, such as `2026.4-errors-build`.

The first five markers set the flags of a package version: in the version, the versions list, and the references of
the Portal, and in the baseline versions of the Agent. A name gets the flags of the first of them that it contains.

| Marker | Case |
| --- | --- |
| `errors-processor-mismatch-and-build` | Built by an outdated api-processor, with errors |
| `errors-processor-mismatch` | Built by an outdated api-processor |
| `errors-build-and-comparison` | Errors and changelog errors |
| `errors-build` | Errors, no changelog errors |
| `errors-comparison` | On a package version: changelog errors and `hasErrors: false`. On an Agent snapshot: changelog errors on every service, and `hasErrors` stays as the backend sent it |
| `errors-revisions` | Revisions 1 to 5 of the version get the five cases above, in this order |
| `errors-deleted-reference` | In a dashboard version: the second top-level reference and the first child of the first top-level reference are deleted |
| `errors-changes-summary` | In either version of a comparison: the comparison has errors, and the version flags stay as the backend sent them |
| `errors-ref-comparison` | In a package version of a dashboard comparison: the comparison of that package has errors |
| `errors-publish-failed` | In an Agent snapshot or promoted version: every publication of the run fails |

A version whose marker sets errors also gets one notification without a document, under **Empty** in the Document
Notifications dialog; a current backend returns none there. The dialog opens only from a document with errors, so
publish documents that have errors. Documents with errors, API types with errors, and the notifications of documents
need no mock: a published version with broken documents gives them.
