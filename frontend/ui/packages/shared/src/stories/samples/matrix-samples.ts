export type HorizontalItem = {
  title: string
}

export type VerticalItem = {
  name: string
}

export type MatrixItem = {
  checked: boolean
  disabled: boolean
}

const HORIZONTAL = 6
const VERTICAL = 6

export const HORIZONTAL_ITEMS: HorizontalItem[] = Array.from({ length: HORIZONTAL }, (_, index) => ({
  title: `header-${index}`,
}))

export const VERTICAL_ITEMS: VerticalItem[] = Array.from({ length: VERTICAL }, (_, index) => ({
  name: `user-${index}`,
}))

export const MATRIX: MatrixItem[][] = Array.from({ length: VERTICAL }, () => (
  Array.from({ length: HORIZONTAL }, () => ({ checked: true, disabled: false }))
))
