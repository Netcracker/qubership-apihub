---
name: apihub-react-coding
description: "Writes and reviews React components and hooks in the qubership-apihub monorepo: the React 18 API surface the workspace pins, component and state patterns, conditional rendering, styling per module, test IDs, and the accessibility baseline. Use when adding or changing *.tsx components or use*.ts hooks in frontend/."
---

# React in the APIHUB monorepo

Where the module's own skill says more (`apihub-ui-authoring` in `frontend/ui`, the `*-authoring` skills of the
libraries), it wins.

## Version

The React modules pin React 18 (see their `package.json`). Until they move to 19, React 19 APIs do not exist here:
no `use()`, `useActionState`, `useOptimistic`, `useFormStatus`, ref as a plain prop, or `<Context>` rendered as a
provider. Use `forwardRef` for refs and `<Context.Provider>`.

## Components

- Function components and hooks, typed as `FC<Props>` and declared with `const` and an arrow.
- In `ui`, every new component sets `displayName`, including components wrapped in `memo` or `forwardRef`. In
  the other modules, follow the file you are editing: `apispec-view` and `rest-playground` set it,
  `api-doc-viewer` does not.
- Keep state in the smallest component that owns it, and lift it only when a sibling needs it. Split a component
  before you reach for `memo`, `useMemo`, or `useCallback`; add memoization only for a measured re-render or an
  expensive computation, and keep the dependency list stable.
- Default values go into parameter destructuring, not `defaultProps`.
- Model variant props and state as discriminated unions rather than several optional flags.
- Render explicit loading, empty, and error states. Add an error boundary where a failing subtree must not take
  down the page.
- Order a component file: constants and types, the main component, child components, styled components, then
  helper functions.

## Rendering

- A branch that renders nothing uses `&&`: `{isOpen && <Dialog />}`, not `{isOpen ? <Dialog /> : null}`. Use a
  ternary only when both branches render something.
- Give list items a stable `key` from the data, never the array index of a list that can reorder.
- Do not create objects or functions inline in props when that re-renders a large subtree on every render; fix the
  structure first.

## Styling

Each module has one styling approach; use it and do not add another.

| Module | Styling |
|---|---|
| `ui`, `rest-playground` | MUI 5: apply `apihub-mui-coding` |
| `api-doc-viewer` | Tailwind CSS classes |
| `apispec-view` | Stoplight Mosaic components and their props |

## Test IDs

`data-testid` values are a contract with the screenshot tests and with `tests/ui-tests`: renaming or removing one
breaks a test in another module. Search the repository for the value before you change it. How a component takes
the attribute is module-specific (`TestableProps` in `ui`, see `apihub-ui-authoring`).

## Accessibility

- Semantic elements first; ARIA only where the element cannot express the role.
- Every interactive control works from the keyboard and has an accessible name.
- Move focus into a dialog or menu when it opens and back when it closes; keep the focus outline visible.
