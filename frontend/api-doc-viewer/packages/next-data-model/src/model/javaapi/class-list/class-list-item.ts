import { JavaApiChangeSeverity, JavaApiCompatibility, JavaApiTypeKind } from '../tree/node-value'

// what happened to the type as a whole: added or removed with all its members, or changed inside
export const JavaApiChangeActions = {
  ADDED: 'added',
  REMOVED: 'removed',
  CHANGED: 'changed',
} as const

export type JavaApiChangeAction = typeof JavaApiChangeActions[keyof typeof JavaApiChangeActions]

/* One human-readable change line, e.g. `[Removed] method 'getIds()'` */
export type JavaApiChangeDescription = {
  readonly severity: JavaApiChangeSeverity
  readonly description: string
}

export type JavaApiMemberCountKind = 'FIELD' | 'CONSTRUCTOR' | 'METHOD'

// one jdiff element row as it came from the source
export type JavaApiRawElement = Readonly<Record<string, unknown>>

/* One class of a jdiff document, as the host lists it next to the class viewer */
export type JavaApiClassListItem = {
  // binary name, e.g. `org.example.Outer$Inner`; the key for `JavaClassViewer`
  readonly className: string
  // name inside the package, e.g. `Outer.Inner`
  readonly displayName: string
  readonly packageName: string
  readonly typeKind: JavaApiTypeKind
  // fields, constructors, and methods of the class itself
  readonly memberCount: number
  // the same members split by kind
  readonly memberKindCounts: Readonly<Record<JavaApiMemberCountKind, number>>
  // changed rows of the class and its members by severity; all zero in an api-report
  readonly changeCounts: Readonly<Record<JavaApiChangeSeverity, number>>
  // the change of the class itself; undefined when the source has no row for the type
  readonly compatibility?: JavaApiCompatibility
  // undefined in an api-report, where nothing changed
  readonly changeAction?: JavaApiChangeAction
  // the changes of the type and its members, type first
  readonly changes: readonly JavaApiChangeDescription[]
  // the class's own jdiff rows, for a raw view
  readonly elements: readonly JavaApiRawElement[]
}
