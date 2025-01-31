export const JSON_FILE_FORMAT = 'json'
export const YAML_FILE_FORMAT = 'yaml'
export const PROTOBUF_FILE_FORMAT = 'proto'
export const MD_FILE_FORMAT = 'md'
export const GRAPHQL_FILE_FORMAT = {
  YAML: 'yaml',
  JSON: 'json',
  GRAPHQL: 'graphql',
  GQL: 'gql',
}
export const UNKNOWN_FILE_FORMAT = 'unknown'

export type FileFormat =
  | typeof JSON_FILE_FORMAT
  | typeof YAML_FILE_FORMAT
  | typeof PROTOBUF_FILE_FORMAT
  | typeof MD_FILE_FORMAT
  | typeof GRAPHQL_FILE_FORMAT
  | typeof UNKNOWN_FILE_FORMAT
