# Extending the skill

The skill is most useful for the largest changes, such as plain and with-diffs viewers for a new API type, and those
are the ones its scripts do not cover yet. Before building test data, check the coverage; when it falls short, extend
the skill itself (its package source, then redeploy), not the plan folder. A plan folder is deleted after QA finishes
([handover.md](handover.md)); only the skill keeps what was learned.

## Coverage check (phase 2)

| Question | Covered when | Otherwise |
| --- | --- | --- |
| Can the fixtures of every API type in scope be read? | A builder of `scripts/packing/builders/` reads them, or the OpenAPI folder reader does (`sample.yaml`, `before.yaml`/`after.yaml`, `document.yaml`, `.json`, `.sql`) | Write a builder |
| Can the documents be packed or kept apart without ID clashes? | The type is OpenAPI (merged by path prefix), or has a format module in `scripts/packing/formats/` | Write a format module |
| Can the packed data be checked against the fixtures? | OpenAPI (`apiDiff`), or the format module's `compare` | Write `compare` |
| Is there a baseline for its cases? | `baselines.mjs` finds the stories' PNGs (about 98% for existing types) | Add a `baselineHint` to the cases, or extend the lookup |
| Does the host app show the type? | The analysis found the pages and comparison flows ([analysis.md](analysis.md)) | Record it as a decision for the team; the viewer may not be wired into the portal yet |
| Does the case format fit? | Areas, cells, and the Open column describe the type's views | Add what is missing to [cases.md](cases.md) and the templates |

## Adding an API type

1. **Learn how APIHUB identifies its entities.** Read `frontend/api-processor/src/apitypes/<type>/` (the operation or
   entity ID function, for example `calculateAsyncOperationId`, `calculateDdlEntityId`) and the comparison code next
   to it. Two cases of one version must not produce the same ID.
2. **Learn the fixtures.** Read `frontend/api-doc-viewer/packages/samples/<type>*/README.md`, the stories of the new
   viewers (`packages/api-doc-viewer/src/stories/<type>*`), and the screenshot ITs. Note programmatic suites: they are
   TypeScript builders the stories import, reachable through `typescript-loader.mjs`.
3. **Choose the packing.** Merge cases into a few documents only when a case can move under a prefix without changing
   anything the viewer shows (OpenAPI paths). Otherwise keep one document per case (`format: 'files'`) and rename only
   the names the ID is built from.
4. **Write the builder** `scripts/packing/builders/<type>.mjs`: functions that return cases
   (`{ id, fixture, sides, extension, title? }`), reusing `numberedCaseDirs`, `caseFile`, and `readYaml` of `lib.mjs`.
   Keep the renaming in one exported function per type, as `prefixAsyncApiOperations` does.
5. **Write the format** `scripts/packing/formats/<type>.mjs` (the interface is at the top of `formats/index.mjs`):
   `matches`, `lookFor` (what QA searches in the portal), `ids` (the APIHUB IDs, from step 1), and `compare` (parse the
   written document and the fixture with the type's own parser and compare them with the renaming undone). The engine
   loads every module of the folder; nothing else changes.
6. **Prove it.** Build a throwaway plan from `templates/test-plan.config.mjs` with one package of the new type, run
   `pack.mjs` and `verify.mjs`, then break one written document and one renaming by hand and see `verify.mjs` fail.
   Delete the throwaway folder.
7. **Document it.** Add the builder and the format to [test-data.md](test-data.md), the changed paths of the type to
   [analysis.md](analysis.md), the host-app facts you found to the analysis, and every surprise to
   [lessons.md](lessons.md).
8. **Redeploy.** From the repository root: `apm install --target cursor,claude`. Edit only the package source
   (`frontend/api-doc-viewer/agent-packages/api-doc-viewer-feature-test-plan/`), never the deployed copies.

## Updating the skill after every plan (phase 9)

At the end of each run, before handing over:

- Move any plan-specific code that turned out to be general (a builder in the plan's `config/`, a helper written
  twice) into the skill's builders or `lib.mjs`.
- Add to [lessons.md](lessons.md) what was not obvious: a host-app limit, a fixture shape, a wrong first claim, a
  check that missed a defect. Keep each lesson general; the plan folder that prompted it will be gone.
- Update the interview, the templates, and the references where the run needed something they lacked.
- Redeploy with `apm install --target cursor,claude`, and tell the user which skill files changed so that they can
  commit them separately from the plan.
