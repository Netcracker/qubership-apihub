# JSO diff fixtures

Before/after YAML pairs for `JsoDiffsViewer`: `property/<group>.<n>-<story>-<change>/{before,after}.yaml`.
Each case changes the value of one property, grouped by the value's starting shape. Design:
`docs/design/jso/features/diffs.md`.

## Categories

| Group | Cases | Starting value | Story file (`jso-diffs-suite/`) |
| ---: | ---: | --- | --- |
| 1 | 11 | string | `stringValue.stories.tsx` |
| 2 | 11 | number | `numberValue.stories.tsx` |
| 3 | 11 | boolean | `booleanValue.stories.tsx` |
| 4 | 11 | null | `nullValue.stories.tsx` |
| 5 | 11 | object with primitive properties | `objectPrimitiveProps.stories.tsx` |
| 6 | 11 | object with object properties | `objectPropsObjects.stories.tsx` |
| 7 | 11 | object with array properties | `objectPropsArrays.stories.tsx` |
| 8 | 11 | object with all property types | `objectAllPropTypes.stories.tsx` |
| 9 | 11 | array of primitives | `arrayPrimitives.stories.tsx` |
| 10 | 11 | array of objects | `arrayObjects.stories.tsx` |
| 11 | 11 | array of arrays | `arrayArrayItems.stories.tsx` |
| 12 | 11 | array of all item types | `arrayAllItemTypes.stories.tsx` |
| 13, 14 | 4 + 8 | string with an embedded JSON Schema | `stringJsonSchema.stories.tsx` |
| 15 | 8 | object with an embedded JSON Schema | `objectJsonSchema.stories.tsx` |
| 16 | 2 | node changes summary | `nodeChangesSummary.stories.tsx` |

Groups 1–12 each cover transitions to every other shape (primitive ↔ primitive, primitive ↔
object, primitive ↔ array, object ↔ array).

Plain JSO stories (`JSO Suite/General`, 19 stories) use inline data in
`packages/api-doc-viewer/src/stories/jso-suite/` and have no fixtures here.

## Storybook and screenshot tests

Story root `JSO Diffs Suite` (154 stories); fixtures are loaded by `property-samples-common.tsx`.
ITs: `packages/api-doc-viewer/src/it/jso-diffs-suite.*.it-test.ts`.

## Regenerate

Hand-written fixtures; there is no generator. After visual changes run
`npm run regenerate-screenshots` in `packages/api-doc-viewer/`.
