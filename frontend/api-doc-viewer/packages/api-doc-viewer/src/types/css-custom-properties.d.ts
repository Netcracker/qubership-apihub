import 'react'

declare module 'react' {
  /** CSS custom properties (`--name`) in `style`, e.g. spacing values passed from layout data. */
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined
  }
}
