import { JavaApiTreeNodeKind, JavaApiTreeNodeKinds } from '../types/node-kind'

/* Element kinds as reported by jdiff (`elementType`) */
export const JavaApiTypeKinds = {
  CLASS: 'CLASS',
  INTERFACE: 'INTERFACE',
  ENUM: 'ENUM',
  ANNOTATION: 'ANNOTATION',
} as const

export type JavaApiTypeKind = typeof JavaApiTypeKinds[keyof typeof JavaApiTypeKinds]

export const JavaApiMemberKinds = {
  NESTED_CLASS: 'NESTED_CLASS',
  ENUM_CONSTANT: 'ENUM_CONSTANT',
  FIELD: 'FIELD',
  CONSTRUCTOR: 'CONSTRUCTOR',
  METHOD: 'METHOD',
} as const

export type JavaApiMemberKind = typeof JavaApiMemberKinds[keyof typeof JavaApiMemberKinds]

/* Sections follow the Javadoc summary order */
export const JavaApiSections = {
  NESTED_CLASSES: 'nested-classes',
  ENUM_CONSTANTS: 'enum-constants',
  FIELDS: 'fields',
  CONSTRUCTORS: 'constructors',
  METHODS: 'methods',
} as const

export type JavaApiSection = typeof JavaApiSections[keyof typeof JavaApiSections]

export const JAVA_API_SECTION_ORDER: readonly JavaApiSection[] = [
  JavaApiSections.NESTED_CLASSES,
  JavaApiSections.ENUM_CONSTANTS,
  JavaApiSections.FIELDS,
  JavaApiSections.CONSTRUCTORS,
  JavaApiSections.METHODS,
]

export const JAVA_API_SECTION_TITLES: Record<JavaApiSection, string> = {
  [JavaApiSections.NESTED_CLASSES]: 'Nested classes',
  [JavaApiSections.ENUM_CONSTANTS]: 'Enum constants',
  [JavaApiSections.FIELDS]: 'Fields',
  [JavaApiSections.CONSTRUCTORS]: 'Constructors',
  [JavaApiSections.METHODS]: 'Methods',
}

export const JavaApiChangeSeverities = {
  BREAKING: 'breaking',
  NON_BREAKING: 'non-breaking',
} as const

export type JavaApiChangeSeverity = typeof JavaApiChangeSeverities[keyof typeof JavaApiChangeSeverities]

/* Compatibility flags jdiff stamps on every element; trivially "compatible" in an api-report */
export type JavaApiCompatibility = {
  readonly status: string
  readonly binaryCompatible: boolean
  readonly sourceCompatible: boolean
  readonly breaking: boolean
  readonly semver: string
  readonly changeTypes: readonly string[]
  readonly details?: string
  // undefined for an unchanged element
  readonly severity?: JavaApiChangeSeverity
}

export type JavaApiClassNodeValue = {
  // binary name, e.g. `org.example.Outer$Inner`
  readonly className: string
  readonly packageName: string
  // name inside the package, e.g. `Outer.Inner`
  readonly displayName: string
  readonly typeKind: JavaApiTypeKind
  readonly enclosingClassName?: string
  readonly compatibility?: JavaApiCompatibility
}

export type JavaApiSectionNodeValue = {
  readonly section: JavaApiSection
  readonly title: string
}

export type JavaApiMemberNodeValue = {
  readonly memberKind: JavaApiMemberKind
  // raw jdiff signature, e.g. `void set(java.lang.String)`
  readonly signature: string
  readonly name: string
  // return type of a method or type of a field
  readonly type?: string
  // undefined for fields, enum constants, and nested classes
  readonly parameterTypes?: readonly string[]
  // set for a nested class row
  readonly className?: string
  readonly typeKind?: JavaApiTypeKind
  readonly compatibility?: JavaApiCompatibility
}

type JavaApiNodeValueMap = {
  [JavaApiTreeNodeKinds.CLASS]: JavaApiClassNodeValue
  [JavaApiTreeNodeKinds.SECTION]: JavaApiSectionNodeValue
  [JavaApiTreeNodeKinds.MEMBER]: JavaApiMemberNodeValue
}

export type JavaApiTreeNodeValue<K extends JavaApiTreeNodeKind = JavaApiTreeNodeKind> = JavaApiNodeValueMap[K]
