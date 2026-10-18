export const DdlApiTreeNodeKinds = {
  TABLE: 'table',
  COLUMNS: 'columns',
  COLUMN: 'column',
  INDEXES: 'indexes',
  INDEX: 'index',
} as const

export const DdlApiTreeNodeKindsList: DdlApiTreeNodeKind[] = Object.values(DdlApiTreeNodeKinds)

export type DdlApiTreeNodeKind = typeof DdlApiTreeNodeKinds[keyof typeof DdlApiTreeNodeKinds]
