import {
  type JavaApiChangeAction,
  JavaApiChangeActions,
  type JavaApiClassListItem,
  type JavaApiMemberCountKind,
} from '../../../model/javaapi/class-list/class-list-item'
import {
  JAVA_API_MEMBER_KIND_TITLES,
  JAVA_API_TYPE_KIND_TITLES,
  JavaApiChangeSeverities,
  type JavaApiChangeSeverity,
  JavaApiMemberKinds,
  type JavaApiTypeKind,
  JavaApiTypeKinds,
} from '../../../model/javaapi/tree/node-value'
import { JAPICMP_TYPE_CODE_WORD } from '../../../shared/javaapi/change-descriptions'
import { parseJavaExecutableSignature, parseJavaFieldSignature } from '../../../shared/javaapi/member-signatures'
import { toJavaDisplayName, toJavaSimpleTypeName } from '../../../shared/javaapi/type-names'
import { JdiffMemberElementTypes } from '../../../shared/javaapi/types/jdiff-member-element-type'
import { JdiffStatuses } from '../../../shared/javaapi/types/jdiff-status'

// the jdiff row fields the helpers read
export type JdiffElementFields = {
  readonly elementType: string
  readonly member?: string
  readonly status?: string
}

const TYPE_KINDS: ReadonlySet<string> = new Set(Object.values(JavaApiTypeKinds))
const MEMBER_COUNT_KINDS: ReadonlySet<string> = new Set<JavaApiMemberCountKind>(Object.values(JdiffMemberElementTypes))

export function isJavaApiTypeKind(value: string | undefined): value is JavaApiTypeKind {
  return value !== undefined && TYPE_KINDS.has(value)
}

export function isJavaApiMemberCountKind(value: string): value is JavaApiMemberCountKind {
  return MEMBER_COUNT_KINDS.has(value)
}

export function toJavaApiTypeKind(elementType: string | undefined): JavaApiTypeKind {
  return isJavaApiTypeKind(elementType) ? elementType : JavaApiTypeKinds.CLASS
}

export function countMemberKinds(elements: readonly JdiffElementFields[]): Record<JavaApiMemberCountKind, number> {
  const counts: Record<JavaApiMemberCountKind, number> = {
    [JdiffMemberElementTypes.FIELD]: 0,
    [JdiffMemberElementTypes.CONSTRUCTOR]: 0,
    [JdiffMemberElementTypes.METHOD]: 0,
  }
  elements.forEach(element => {
    if (element.member && isJavaApiMemberCountKind(element.elementType)) {
      counts[element.elementType]++
    }
  })
  return counts
}

export function createChangeCounts(): Record<JavaApiChangeSeverity, number> {
  return {
    [JavaApiChangeSeverities.BREAKING]: 0,
    [JavaApiChangeSeverities.NON_BREAKING]: 0,
    [JavaApiChangeSeverities.ANNOTATION]: 0,
  }
}

export function toJavaApiChangeAction(
  typeRow: JdiffElementFields | undefined,
  elements: readonly JdiffElementFields[],
): JavaApiChangeAction | undefined {
  if (typeRow?.status === JdiffStatuses.NEW) {
    return JavaApiChangeActions.ADDED
  }
  if (typeRow?.status === JdiffStatuses.REMOVED) {
    return JavaApiChangeActions.REMOVED
  }
  return elements.some(element => element.status !== JdiffStatuses.UNCHANGED)
    ? JavaApiChangeActions.CHANGED
    : undefined
}

// `method 'getIds(String)'` with simple type names, and the code word of its kind
export function describeJdiffSubject(className: string, element: JdiffElementFields): [string, string] {
  const member = element.member
  if (!member) {
    const kindTitle = isJavaApiTypeKind(element.elementType)
      ? JAVA_API_TYPE_KIND_TITLES[element.elementType].toLowerCase()
      : 'type'
    return [
      `${kindTitle} '${toJavaDisplayName(className)}'`,
      JAPICMP_TYPE_CODE_WORD,
    ]
  }
  if (element.elementType === JdiffMemberElementTypes.FIELD) {
    const fieldTitle = JAVA_API_MEMBER_KIND_TITLES[JavaApiMemberKinds.FIELD].toLowerCase()
    return [`${fieldTitle} '${parseJavaFieldSignature(member).name}'`, JdiffMemberElementTypes.FIELD]
  }
  const { name, parameterTypes } = parseJavaExecutableSignature(member)
  const kind = element.elementType === JdiffMemberElementTypes.CONSTRUCTOR
    ? JavaApiMemberKinds.CONSTRUCTOR
    : JavaApiMemberKinds.METHOD
  const kindTitle = JAVA_API_MEMBER_KIND_TITLES[kind].toLowerCase()
  const parameters = parameterTypes.map(toJavaSimpleTypeName).join(', ')
  return [`${kindTitle} '${toJavaSimpleTypeName(name)}(${parameters})'`, element.elementType]
}

export function orderTypeRowFirst<T>(typeRow: T | undefined, elements: readonly T[]): readonly T[] {
  return typeRow ? [typeRow, ...elements.filter(element => element !== typeRow)] : elements
}

export function compareClassListItems(a: JavaApiClassListItem, b: JavaApiClassListItem): number {
  return a.packageName.localeCompare(b.packageName) || a.displayName.localeCompare(b.displayName)
}
