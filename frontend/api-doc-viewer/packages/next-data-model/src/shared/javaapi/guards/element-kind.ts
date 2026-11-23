import type { JavaApiMemberCountKind } from '../../../model/javaapi/class-list/class-list-item'
import { type JavaApiTypeKind, JavaApiTypeKinds } from '../../../model/javaapi/tree/node-value'
import { JdiffMemberElementTypes } from '../types/jdiff-member-element-type'

const TYPE_KINDS: ReadonlySet<string> = new Set(Object.values(JavaApiTypeKinds))
const MEMBER_COUNT_KINDS: ReadonlySet<string> = new Set<JavaApiMemberCountKind>(Object.values(JdiffMemberElementTypes))

export function isJavaApiTypeKind(value: string | undefined): value is JavaApiTypeKind {
  return value !== undefined && TYPE_KINDS.has(value)
}

export function isJavaApiMemberCountKind(value: string): value is JavaApiMemberCountKind {
  return MEMBER_COUNT_KINDS.has(value)
}
