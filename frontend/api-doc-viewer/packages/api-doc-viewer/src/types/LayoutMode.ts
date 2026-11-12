export const DOCUMENT_LAYOUT_MODE = 'document'
export const SIDE_BY_SIDE_DIFFS_LAYOUT_MODE = 'side-by-side-diffs'
export const INLINE_DIFFS_LAYOUT_MODE = 'inline-diffs'
export type LayoutMode =
  | typeof DOCUMENT_LAYOUT_MODE
  | typeof INLINE_DIFFS_LAYOUT_MODE
  | typeof SIDE_BY_SIDE_DIFFS_LAYOUT_MODE
