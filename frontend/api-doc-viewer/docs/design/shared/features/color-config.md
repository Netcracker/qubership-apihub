# Color config (badges and selector tones)

Status: **implemented**. Every badge and selector-option color that carries API-type meaning (HTTP
method, AsyncAPI action, response-code class, DDL column flag, meta-flag tag) is defined in **one CSS
file per API type**. Changing a color is a one-line edit of that file; no component and no TS module
holds a color value.

## Layout

| File (`packages/api-doc-viewer/src/components/shared-styles/colors/`) | Colors | Class names come from |
| --- | --- | --- |
| `openapi.css` | HTTP method badges (address row); response-code selector options (untouched / hovered / selected); black text of a yellow-highlighted (renamed) response-code / media-type option title (`OptionKeyText`, class `openapi-option-key-text`) — other selectors, e.g. JSON Schema combiner options, keep the button's text color on the highlighter | `utils/openapi/http-method-badge-config.ts`, `utils/openapi/response-code-tone.ts` |
| `async-api.css` | operation action badges (`SEND`, `RECEIVE`) | `utils/async-api/action-badge-config.ts` |
| `ddlapi.css` | column flag badges (`PK`, `FK`, `unique`, `not null`, `generated`) | `components/DdlTableViewer/consts.ts` |
| `icon-buttons.css` | icon buttons of every viewer: the scroll-strip arrows (`‹` `›`) and the "three dots" reveal trigger — enabled / hovered / disabled colors, hover background, radius, as CSS variables on `.icon-button` ([arrow-scroll-strip.md](arrow-scroll-strip.md#arrow-button-styles-shared-icon-button-config)) | `ArrowScrollStrip`, `ShowUnchangedTrigger` |
| `json-schema.css` | meta-flag tags (`read-only`, `write-only`, `deprecated`); also used by the OpenAPI operation `deprecated` tag and the legacy GraphQL viewers | `consts/tags.ts` |
| `index.css` | `@import`s the five files | — |

`src/index.css` imports `colors/index.css` before `@tailwind base` (`@import` must come first). Every
viewer root imports `src/index.css`, so the classes exist wherever a badge renders, legacy GraphQL
included.

Kept out of scope: diff chrome colors (`shared-styles/diffs/`, severity colors in
`kit/ux/UxMarker/consts.ts`), the neutral `Selector` / `UxBadge` kinds (`Selector.css`,
`UxBadge.css`), and the legacy GraphQL operation badges (`ux-badge_operation-*` in `UxBadge.css`).

## Rules

1. **TS maps, CSS paints.** A TS config maps a domain value to a literal class name
   (`OPENAPI_HTTP_METHOD_BADGE_CONFIG`, `OPENAPI_RESPONSE_CODE_TONE_CLASSES`,
   `ASYNC_API_ACTION_BADGE_CONFIG`); the class's colors live in the API type's color file. The TS
   modules stay CSS-free so jest can import them.
2. **Shared components take a class, not a color.** `AddressRow` takes `badge.colorClass`, `UxBadge`
   takes `colorSchema`, `Selector` takes `SelectorOption.toneClass`. The shared component never knows
   which API type painted it.
3. **Order-independent specificity.** The bundle order of CSS files is not guaranteed, so a color rule
   that overrides a shared component's own rule must outrank it by specificity (e.g.
   `button.button-selector-option.openapi-response-code_2xx:hover` over
   `button.button-selector-option:hover`), never by load order.
4. **Tests read the CSS as text.** `packages/api-doc-viewer/tests/openapi-viewer-config.test.ts` checks
   every mapped class has a rule and asserts the specified OpenAPI colors.

## Related documents

- [../../openapi/features/response-code-selector.md](../../openapi/features/response-code-selector.md)
- [../../openapi/entities/operation.md](../../openapi/entities/operation.md#http-method-badge-config)
