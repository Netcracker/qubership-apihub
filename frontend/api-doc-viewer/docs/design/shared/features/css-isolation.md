# CSS isolation

Status: **implemented**. Every CSS class the library renders, and every global rule it ships, is made
unique to the library at build time, so the published `dist/style.css` cannot restyle the host
application and host classes with common names (`flex`, `selected`, `root`) cannot collide with the
library's. Source code keeps human-friendly class names.

## Requirements

1. Source code writes plain class names: Tailwind utilities (`flex`, `px-4`, `hover:bg-gray-100`) and
   the library's own classes (`selected`, `diffs-border-shadow_breaking`).
2. In the rendered DOM and in `dist/style.css` every one of these classes carries the prefix
   **`api-doc-viewer-`** (`api-doc-viewer-flex`). The prefix is fixed — stable across releases, readable
   in DevTools.
3. No rule of `dist/style.css` matches an element outside a viewer: Tailwind's preflight reset and the
   library's element rules (`ul`, `a`, `button`, `h1`, `:root` …) are scoped to the viewer root.
4. Rendering inside a viewer does not change: specificity and cascade order of every rule are kept.
5. The library's `@font-face` families and `@keyframes` names do not merge with the host's.

## Mechanism

Two halves that apply the **same rule** — prefix every class token with `api-doc-viewer-`:

| Half | Where | What |
| --- | --- | --- |
| Runtime | `cn()` — `packages/api-doc-viewer/src/utils/common/cn.ts` | Every `className` is `cn(...)`. It takes strings, arrays, and falsy values, splits on whitespace, and prefixes each token. Idempotent: a token that already starts with the prefix is kept, so a class string can pass through `cn()` more than once (prop forwarding). |
| Build | PostCSS plugin — `packages/api-doc-viewer/postcss/css-isolation.cjs`, runs after `tailwindcss` and `autoprefixer` | Rewrites the CSS of files under `packages/api-doc-viewer/src/` (CSS of dependencies, e.g. Storybook's, is left alone): prefixes class selectors, scopes global rules, renames font families and keyframes. |

Tailwind scans the source as before (`tailwind.config.js` `content`), so it generates rules for the
plain names; the plugin then renames them. Tailwind's own `prefix` option is **not** used: it would
require prefixed names in the source and inserts the prefix after variants (`hover:tw-x`), which a
whole-token rule cannot mirror.

Class tokens map one to one, including variants, negatives, important modifiers, and arbitrary
values: `hover:bg-x` → `api-doc-viewer-hover:bg-x` (selector `.api-doc-viewer-hover\:bg-x:hover`),
`-mt-1` → `api-doc-viewer--mt-1`, `!mt-0` → `api-doc-viewer-!mt-0`, `min-w-[16px]` →
`api-doc-viewer-min-w-[16px]`. `group` / `peer` markers work because both the marker and the
dependent selector are renamed.

## Viewer root

Every public viewer (and its error fallback) renders its outermost element with `cn('root')` →
**`api-doc-viewer-root`**. Global rules are scoped to it. Nested viewers (JSON Schema inside OpenAPI,
JSO inside AsyncAPI) render nested roots; the scoping is idempotent for them.

## Global rule scoping

A complex selector that contains no class after renaming is global. The plugin scopes it with
`:where()`, which adds **zero specificity**, so the cascade inside a viewer is unchanged (requirement
4):

| Source selector | Output |
| --- | --- |
| `:root`, `html`, `body`, `:host` (as the first compound) | `:where(.api-doc-viewer-root)` |
| any other first compound — `ul`, `*`, `a:hover`, `[data-precededby="x"]` | the compound plus `:where(.api-doc-viewer-root, .api-doc-viewer-root *)`, inserted before a pseudo-element (`::before`) |
| contains a class — `.markdown ul`, `button.selected` | classes prefixed only |

Examples: `*, ::before, ::after` → `*:where(.R, .R *), :where(.R, .R *)::before, …`; `ul ul` →
`ul:where(.R, .R *) ul`. CSS custom properties defined on `:root` move to the viewer root with the
rule and keep their names: they no longer leak out, and inside a viewer they override host variables
of the same name.

The light-scheme `:root` rule of `src/index.css` (a Vite template leftover) no longer sets
`background-color: #ffffff`: on the viewer root it would paint a white box in a host with another
background. Text color and font settings stay.

Inbound leaks are **not** guaranteed against: a host element rule (`button { … }`) has the same
specificity as the library's scoped element rule, so load order decides. Library classes outrank host
element rules by specificity as before.

## Fonts and keyframes

- `@font-face` families declared by the library — `Inter`, `Inter Medium`, `Inter Semi Bold`,
  `Inter Variable`, `Fire Code` (listed in `postcss.config.js`) — are renamed to
  `api-doc-viewer <family>` in `@font-face` and in every `font-family` declaration of the processed
  CSS (the `font` shorthand is not rewritten; the stylesheets do not use it with a family). `src: local('Inter')` keeps the
  system-installed font name. Inline styles use the constants in `src/consts/fonts.ts`.
- `@keyframes` names are prefixed, and so are references to them in `animation` / `animation-name`
  of the same style sheet.

## Rules for code

1. **Every `className` is `cn(...)`** — literal, template, prop, or variable alike
   (`className={cn(className)}` for forwarded props). ESLint enforces it (`no-restricted-syntax` on
   `packages/api-doc-viewer/src/**/*.tsx`).
2. **Class values stay plain everywhere else.** Constants (`X_AXIS_PADDING_ROWS`), config maps
   (`OPENAPI_RESPONSE_CODE_TONE_CLASSES`), and class props (`toneClass`, `maxWidthClass`) hold plain
   names; only `cn()` at the `className` site prefixes them.
3. **Code that reads classes from the DOM matches the prefixed name** (`api-doc-viewer-selected`);
   prefer `data-*` attributes for new DOM queries. Build the name with `cn()` where the code can import
   it. Current reader: `src/stories/shared/auto-switch.ts` (story auto-switch).
4. **Source CSS uses plain names** — tests that read CSS as text (color config) keep working.

## Host contract

- Hosts must not rely on the library's styles outside a viewer (there are none) or on unprefixed
  class names. Styling a viewer from the host uses `api-doc-viewer-*` classes and is not a stable API.
- Storybook stands in for a host and needs no page-level replacement for the formerly global
  preflight: its preview already sets `body { margin: 0 }`, so screenshots are unchanged.

## Regression coverage

- Unit tests: `packages/api-doc-viewer/tests/cn.test.ts`, `packages/api-doc-viewer/tests/css-isolation.test.ts`.
- Screenshot ITs: unchanged snapshots are the acceptance criterion for requirement 4.

## Related documents

- [color-config.md](color-config.md) — class-per-color config; its classes are prefixed like any other.
