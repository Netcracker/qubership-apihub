export const JsoTreeNodeKinds = {
  PROPERTY: 'property',
} as const

export const JsoTreeNodeKindsList: JsoTreeNodeKind[] = Object.values(JsoTreeNodeKinds)

export type JsoTreeNodeKind = typeof JsoTreeNodeKinds[keyof typeof JsoTreeNodeKinds]
