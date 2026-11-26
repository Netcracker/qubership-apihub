---
name: apihub-mui-coding
description: "Styles and composes MUI components in the qubership-apihub monorepo: the MUI 5 API the workspace pins, styled() before sx, theme tokens from the module theme, layout and Typography patterns, icons, and buttons. Use when styling or laying out components in frontend/ui or frontend/rest-playground."
---

# MUI in the APIHUB monorepo

## Version

Both modules pin MUI 5 with Emotion; the exact versions are in each module's `package.json`. MUI 6 and 7 APIs do
not exist here: no stable `Grid2`, no `size` prop on `Grid`, no Pigment CSS. Check the 5.x documentation before you
use a prop you remember from a newer major.

## Styling

- Style with `styled()` first, for anything reusable or more than one or two properties. Use `sx` only for a
  one-off adjustment that `styled()` cannot express cleanly, and with theme values, not literals. Existing code
  uses `sx` widely; do not rewrite it outside the task.
- A style that depends on a prop is a `styled()` component that takes the prop, as its siblings in the file are,
  not an `sx` callback or a condition inside `sx`. Keep the prop off the DOM element with `shouldForwardProp`:

  ```tsx
  const Row = styled(Box, { shouldForwardProp: (prop) => prop !== '$selected' })<{ $selected: boolean }>(
    ({ theme, $selected }) => ({ background: $selected ? theme.palette.action.selected : 'transparent' }),
  )
  ```

- Style a layout element with `styled(Box)` (or `Stack`), not `styled('div')`, unless the native element is
  needed for semantics or browser behaviour.
- Take colours, spacing, typography, and breakpoints from the theme: `theme.palette.*`, `theme.spacing(n)`,
  `theme.typography.*`. The themes are `packages/shared/src/themes/` in `ui` (imported as
  `@netcracker/qubership-apihub-ui-shared/themes/theme`) and `src/themes/theme.ts` in `rest-playground`. A new
  colour goes into the theme or the module's colour constants, not into a component.
- Text takes its font from a `Typography` variant of the theme, not from `fontFamily`, `fontSize`, or `fontWeight`
  literals. Where no variant matches the design, take the variant that the closest similar component uses and set
  only the size or weight that differs; do not add a theme variant for one component.
- When the same text style repeats, define a `styled(Typography)` variant or align from the parent `Box` or
  `Stack`; do not repeat `component`, `color`, and `textAlign` props on each `Typography`.

## Components

- Reuse the shared components of `ui` (`packages/shared/src/components/`) before composing MUI primitives into a
  new one.
- Keep components small and focused, with explicitly typed props, and compose them through `children` rather than a
  growing list of boolean props.

## Icons

- Import icons from `@mui/icons-material` one per statement by default export, as the modules do
  (`import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'`).
- A new custom icon of `ui` (`packages/shared/src/icons`) is built with `createSvgIcon` from `@mui/material`, so it
  takes `fontSize` and `color` like an MUI icon, and goes into `MUI_ICONS_REGISTRY` of the icon palette story in the
  same package. A component that returns an `svg` inside a `div` is the older form; do not add one. Draw the icon
  that the design gives, not a similar stock MUI icon.
- Name a shared icon variant by its shape, `...FilledIcon` or `...OutlinedIcon`, not by its source (`...IconMui`).
  Where an icon also has an older variant with a fixed size and colour, use the `createSvgIcon` one.
- Size an icon with a `fontSize` variant (`inherit`, `extra-small`, `small`, `medium`, `large`; the theme of `ui`
  adds `extra-small`), never with pixels in `fontSize`, `sx`, `width`, or `height`.
- Colour an icon with a theme colour in its `color` prop (`action`, `disabled`, `warning`, `error`), and give it no
  `sx`. In a button, an icon takes no `color`, so it inherits the colour of the text, or `color="action"` where it
  must be grey.
- A component that adds logic or a tooltip around an icon is named `...Indicator`; a component named `...Icon` only
  draws the icon.

## Buttons

- `ButtonBase` renders a native `button`, which does not inherit the font of the page, so text inside a
  `ButtonBase` is a `Typography` with a theme variant.
- A disabled button keeps its variant, `contained` for the main action: the theme draws the disabled look, so do
  not switch `variant` on `disabled`.
- Place an icon in a button with `startIcon` or `endIcon`, or as a child with padding, not with a negative margin.
