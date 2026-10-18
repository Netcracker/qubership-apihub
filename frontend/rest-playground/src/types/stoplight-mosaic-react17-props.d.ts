/* Re-declares two props that @types/react removed in 18.3, because @stoplight/mosaic's
 * published declarations still name them.
 *
 * mosaic's .d.ts do not reference IInputProps and friends symbolically - they contain a
 * *materialised* key list, generated when mosaic was built against @types/react 17:
 *
 *     Pick<IInputProps, "form" | ... | "onPointerEnterCapture" | "onPointerLeaveCapture" | ...>
 *
 * @types/react 18.3 dropped onPointerEnterCapture and onPointerLeaveCapture from
 * DOMAttributes - correctly, because React has never fired a capture phase for pointer
 * enter/leave. But Pick over a key the source type no longer has yields that key as
 * *required* and typed `unknown`, so every mosaic Input, Button, Icon, Select and
 * FieldButton element becomes "missing the following properties:
 * onPointerEnterCapture, onPointerLeaveCapture" - TS2739, seven sites here.
 *
 * There is no upstream fix to wait for: mosaic 1.53.5, the latest, still declares
 * "@types/react": "^17.0.3" as a hard dependency and still ships these key lists.
 *
 * Restoring the two props as optional makes the Pick resolve the way mosaic intended. It
 * restores a historical inaccuracy rather than inventing one - React 17's types carried
 * these same two props and they never fired there either - and it is confined to this
 * package. The alternative was casting mosaic's components at each use site, which spreads
 * the defect through the source instead of containing it in one file.
 *
 * Remove when @stoplight/mosaic republishes its declarations against React 18.
 */
import 'react'

declare module 'react' {
  interface DOMAttributes<T> {
    onPointerEnterCapture?: PointerEventHandler<T> | undefined
    onPointerLeaveCapture?: PointerEventHandler<T> | undefined
  }
}
