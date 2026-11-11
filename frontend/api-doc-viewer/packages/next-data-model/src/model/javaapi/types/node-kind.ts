export const JavaApiTreeNodeKinds = {
  CLASS: 'class',
  SECTION: 'section',
  MEMBER: 'member',
} as const

export const JavaApiTreeNodeKindsList: JavaApiTreeNodeKind[] = Object.values(JavaApiTreeNodeKinds)

export type JavaApiTreeNodeKind = typeof JavaApiTreeNodeKinds[keyof typeof JavaApiTreeNodeKinds]
