/* Re-declares two props that @types/react removed in 18.3, because @stoplight/mosaic's
 * published declarations still name them.
 *
 * mosaic's .d.ts do not reference their prop types symbolically - they contain a
 * *materialised* key list, generated when mosaic was built against @types/react 17:
 *
 *     Pick<IInputProps, "form" | ... | "onPointerEnterCapture" | "onPointerLeaveCapture" | ...>
 *
 * @types/react 18.3 dropped three of those keys:
 *
 *   - onPointerEnterCapture and onPointerLeaveCapture, from DOMAttributes - correctly,
 *     because React has never fired a capture phase for pointer enter/leave
 *   - placeholder, from HTMLAttributes - it survives on AllHTMLAttributes,
 *     InputHTMLAttributes and TextareaHTMLAttributes, which is where it belongs, but
 *     mosaic's Button-family key lists were generated when every element had it
 *
 * Pick over a key the source type no longer has yields that key as *required* and typed
 * `unknown`, so mosaic's Input, Button, Icon, Select and FieldButton elements become
 * "missing the following properties" - TS2739, and TS2741 for the single-key case.
 *
 * There is no upstream fix to wait for: mosaic 1.53.5, the latest, still declares
 * "@types/react": "^17.0.3" as a hard dependency and still ships these key lists.
 *
 * Restoring the two as optional makes the Pick resolve the way mosaic intended. It restores
 * a historical inaccuracy rather than inventing one - React 17's types carried these same
 * two props and they never fired there either.
 *
 * It lives here, in `elements`, rather than in elements-core and diff-elements-core where
 * the affected JSX is, because a module augmentation is global to the *program* and this is
 * the only program that is type-checked: `elements` is the one package with a `type-check`
 * script, and it pulls the siblings in through the root tsconfig's `paths`. Every webpack
 * build in this repository runs ts-loader with transpileOnly. A second copy would be needed
 * only if another package gains its own type-check.
 *
 * A near-identical file exists in rest-playground, which hits the same defect through the
 * same dependency. It omits the `placeholder` half: that repository uses none of the mosaic
 * components whose key lists carry it, so declaring it there would be dead. Remove both
 * when @stoplight/mosaic republishes against React 18.
 */
import 'react';

declare module 'react' {
  interface DOMAttributes<T> {
    onPointerEnterCapture?: PointerEventHandler<T> | undefined;
    onPointerLeaveCapture?: PointerEventHandler<T> | undefined;
  }

  interface HTMLAttributes<T> {
    placeholder?: string | undefined;
  }
}
