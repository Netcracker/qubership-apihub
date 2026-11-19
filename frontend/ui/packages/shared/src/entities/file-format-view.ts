export const JSON_FILE_VIEW_MODE = 'JSON'
export const YAML_FILE_VIEW_MODE = 'YAML'

export type FileViewMode =
  | typeof JSON_FILE_VIEW_MODE
  | typeof YAML_FILE_VIEW_MODE

export const FILE_FORMAT_VIEW: ReadonlyArray<FileViewMode> = [
  JSON_FILE_VIEW_MODE,
  YAML_FILE_VIEW_MODE,
]
