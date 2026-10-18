/** Annotation fields copied from the raw schema fragment into node meta. */
export type JsonSchemaNodeMetaProps = Partial<{
  readonly deprecated: boolean
  readonly readOnly: boolean
  readonly writeOnly: boolean
  readonly externalDocs: unknown
}>

/** Runtime node meta assembled by the tree builder. */
export type JsonSchemaTreeNodeMeta = Partial<{
  readonly required: boolean
  readonly deprecated: boolean
  readonly readOnly: boolean
  readonly writeOnly: boolean
  readonly externalDocs: unknown
  readonly brokenRef: string
  readonly _fragment: unknown
  readonly isCycle: boolean
}>
