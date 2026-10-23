---
name: apihub-mui-coding
description: "Styles and composes MUI components in the qubership-apihub monorepo: the MUI 5 API the workspace pins, styled() before sx, theme tokens from the module theme, and layout and Typography patterns. Use when styling or laying out components in frontend/ui or frontend/rest-playground."
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
- Style a layout element with `styled(Box)` (or `Stack`), not `styled('div')`, unless the native element is
  needed for semantics or browser behaviour.
- Take colours, spacing, typography, and breakpoints from the theme: `theme.palette.*`, `theme.spacing(n)`,
  `theme.typography.*`. The themes are `packages/shared/src/themes/` in `ui` (imported as
  `@netcracker/qubership-apihub-ui-shared/themes/theme`) and `src/themes/theme.ts` in `rest-playground`. A new
  colour goes into the theme or the module's colour constants, not into a component.
- When the same text style repeats, define a `styled(Typography)` variant or align from the parent `Box` or
  `Stack`; do not repeat `component`, `color`, and `textAlign` props on each `Typography`.

## Components

- Reuse the shared components of `ui` (`packages/shared/src/components/`) before composing MUI primitives into a
  new one.
- Import icons from `@mui/icons-material` one per statement by default export, as the modules do
  (`import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'`).
- Keep components small and focused, with explicitly typed props, and compose them through `children` rather than a
  growing list of boolean props.
