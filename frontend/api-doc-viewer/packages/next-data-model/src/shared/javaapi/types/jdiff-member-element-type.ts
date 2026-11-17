// `elementType` of a jdiff member row; type rows carry the JavaApiTypeKinds values
export const JdiffMemberElementTypes = {
  FIELD: 'FIELD',
  CONSTRUCTOR: 'CONSTRUCTOR',
  METHOD: 'METHOD',
} as const

export type JdiffMemberElementType = typeof JdiffMemberElementTypes[keyof typeof JdiffMemberElementTypes]
