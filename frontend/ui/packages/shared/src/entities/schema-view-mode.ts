export const SIMPLE_SCHEMA_VIEW_MODE = 'simple'
export const DETAILED_SCHEMA_VIEW_MODE = 'detailed'

export type SchemaViewMode =
  | typeof SIMPLE_SCHEMA_VIEW_MODE
  | typeof DETAILED_SCHEMA_VIEW_MODE

export const SCHEMA_VIEW_MODES: ReadonlyArray<SchemaViewMode> = [
  SIMPLE_SCHEMA_VIEW_MODE,
  DETAILED_SCHEMA_VIEW_MODE,
]
