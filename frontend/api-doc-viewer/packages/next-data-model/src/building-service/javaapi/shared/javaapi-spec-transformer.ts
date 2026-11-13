import { BuildingServiceLogger } from '../../../loggers'
import {
  JavaApiChangeAction,
  JavaApiChangeActions,
  JavaApiChangeDescription,
  JavaApiClassListItem,
  JavaApiMemberCountKind,
} from '../../../model/javaapi/class-list/class-list-item'
import {
  JavaApiChangeSeverities,
  JavaApiChangeSeverity,
  JavaApiClassNodeValue,
  JavaApiCompatibility,
  JavaApiMemberKinds,
  JavaApiMemberNodeValue,
  JavaApiSection,
  JavaApiSections,
  JavaApiTypeKind,
  JavaApiTypeKinds,
} from '../../../model/javaapi/tree/node-value'
import { describeJavaApiElementChanges } from '../../../shared/javaapi/change-descriptions'
import { JAVA_API_LOG_PREFIX } from '../../../shared/javaapi/log-prefix'
import {
  toJavaDisplayName,
  toJavaEnclosingClassName,
  toJavaPackageName,
  toJavaSimpleTypeName,
} from '../../../shared/javaapi/type-names'
import { ClassKey } from '../../../shared/javaapi/types/class-key'
import { isObject } from '../../../utilities'

/* One element row of a jdiff document */
type JdiffElement = {
  className: string
  elementType: string
  member?: string
  status: string
  changeTypes: string[]
  details?: string
  binaryCompatible: boolean
  sourceCompatible: boolean
  breaking: boolean
  semver: string
}

/* A single class cut out of a jdiff document, members grouped by Javadoc section */
export type JavaApiClassOrientedSpec = {
  readonly classValue: JavaApiClassNodeValue
  readonly sections: ReadonlyMap<JavaApiSection, readonly JavaApiMemberNodeValue[]>
}

type JdiffContext = {
  readonly elementsByClass: ReadonlyMap<string, JdiffElement[]>
  readonly typeRows: ReadonlyMap<string, JdiffElement>
  readonly nestedByEnclosing: ReadonlyMap<string, ReadonlySet<string>>
}

const TYPE_KINDS: ReadonlySet<string> = new Set(Object.values(JavaApiTypeKinds))

export class JavaApiSpecTransformer {
  constructor(private readonly logger: BuildingServiceLogger) {
  }

  public transformSourceToClassOrientedSpec(source: unknown, classKey: ClassKey): JavaApiClassOrientedSpec | null {
    const context = this.createContext(source)
    if (!context) {
      return null
    }
    if (!context.elementsByClass.has(classKey.className)) {
      this.logger.warn(`${JAVA_API_LOG_PREFIX} Class ${classKey.className} is not in the source`)
      return null
    }
    return this.buildClassSpec(classKey.className, context)
  }

  // classes ordered by package and then by name, with their own raw rows
  public transformSourceToClassList(source: unknown): JavaApiClassListItem[] {
    const context = this.createContext(source)
    if (!context) {
      return []
    }
    return [...context.elementsByClass.entries()]
      .map(([className, elements]): JavaApiClassListItem => ({
        className,
        displayName: toJavaDisplayName(className),
        packageName: toJavaPackageName(className),
        typeKind: this.toTypeKind(context.typeRows.get(className)?.elementType),
        memberCount: elements.filter(element => !!element.member).length,
        memberKindCounts: countMemberKinds(elements),
        changeCounts: this.countChanges(elements),
        compatibility: this.toClassCompatibility(context.typeRows.get(className)),
        changeAction: this.toChangeAction(context.typeRows.get(className), elements),
        changes: this.describeChanges(className, context.typeRows.get(className), elements),
        elements,
      }))
      .sort((a, b) => a.packageName.localeCompare(b.packageName) || a.displayName.localeCompare(b.displayName))
  }

  private toChangeAction(
    typeRow: JdiffElement | undefined,
    elements: readonly JdiffElement[],
  ): JavaApiChangeAction | undefined {
    if (typeRow?.status === 'NEW') {
      return JavaApiChangeActions.ADDED
    }
    if (typeRow?.status === 'REMOVED') {
      return JavaApiChangeActions.REMOVED
    }
    return elements.some(element => element.status !== 'UNCHANGED') ? JavaApiChangeActions.CHANGED : undefined
  }

  private describeChanges(
    className: string,
    typeRow: JdiffElement | undefined,
    elements: readonly JdiffElement[],
  ): JavaApiChangeDescription[] {
    const ordered = typeRow ? [typeRow, ...elements.filter(element => element !== typeRow)] : elements
    return ordered.flatMap(element => {
      const severity = this.toSeverity(element)
      if (!severity) {
        return []
      }
      const [subject, kindWord] = describeSubject(className, element)
      return describeJavaApiElementChanges(element.status, element.changeTypes, subject, kindWord)
        .map(description => ({ severity, description }))
    })
  }

  private toClassCompatibility(typeRow: JdiffElement | undefined): JavaApiCompatibility | undefined {
    return typeRow ? this.toCompatibility(typeRow) : undefined
  }

  private countChanges(elements: readonly JdiffElement[]): Record<JavaApiChangeSeverity, number> {
    const counts: Record<JavaApiChangeSeverity, number> = {
      [JavaApiChangeSeverities.BREAKING]: 0,
      [JavaApiChangeSeverities.NON_BREAKING]: 0,
    }
    elements.forEach(element => {
      const severity = this.toSeverity(element)
      severity && counts[severity]++
    })
    return counts
  }

  private createContext(source: unknown): JdiffContext | null {
    const elements = this.collectElements(source)
    if (elements.length === 0) {
      this.logger.warn(`${JAVA_API_LOG_PREFIX} The source has no jdiff elements`)
      return null
    }
    const elementsByClass = new Map<string, JdiffElement[]>()
    const typeRows = new Map<string, JdiffElement>()
    const nestedByEnclosing = new Map<string, Set<string>>()
    elements.forEach(element => {
      const { className } = element
      const classElements = elementsByClass.get(className)
      if (classElements) classElements.push(element)
      else elementsByClass.set(className, [element])
      TYPE_KINDS.has(element.elementType) && typeRows.set(className, element)
      const enclosingClassName = toJavaEnclosingClassName(className)
      if (enclosingClassName) {
        nestedByEnclosing.set(
          enclosingClassName,
          (nestedByEnclosing.get(enclosingClassName) ?? new Set()).add(className),
        )
      }
    })
    return { elementsByClass, typeRows, nestedByEnclosing }
  }

  private buildClassSpec(className: string, context: JdiffContext): JavaApiClassOrientedSpec {
    const { elementsByClass, typeRows, nestedByEnclosing } = context
    const typeRow = typeRows.get(className)
    const typeKind = this.toTypeKind(typeRow?.elementType)
    const classValue: JavaApiClassNodeValue = {
      className,
      packageName: toJavaPackageName(className),
      displayName: toJavaDisplayName(className),
      typeKind,
      enclosingClassName: toJavaEnclosingClassName(className),
      compatibility: typeRow ? this.toCompatibility(typeRow) : undefined,
    }

    const sections = new Map<JavaApiSection, JavaApiMemberNodeValue[]>()
    const add = (section: JavaApiSection, member: JavaApiMemberNodeValue): void => {
      const members = sections.get(section)
      if (members) members.push(member)
      else sections.set(section, [member])
    }

    nestedByEnclosing.get(className)?.forEach(nestedClassName => {
      const nestedTypeRow = typeRows.get(nestedClassName)
      add(JavaApiSections.NESTED_CLASSES, {
        memberKind: JavaApiMemberKinds.NESTED_CLASS,
        signature: nestedClassName,
        name: toJavaDisplayName(nestedClassName),
        className: nestedClassName,
        typeKind: this.toTypeKind(nestedTypeRow?.elementType),
        compatibility: nestedTypeRow ? this.toCompatibility(nestedTypeRow) : undefined,
      })
    })

    elementsByClass.get(className)?.forEach(element => {
      if (!element.member) {
        return
      }
      if (element.elementType === 'FIELD') {
        const field = this.parseField(element)
        // an enum's constants are its fields of its own type
        const isEnumConstant = typeKind === JavaApiTypeKinds.ENUM && field.type === className
        add(
          isEnumConstant ? JavaApiSections.ENUM_CONSTANTS : JavaApiSections.FIELDS,
          isEnumConstant ? { ...field, memberKind: JavaApiMemberKinds.ENUM_CONSTANT, type: undefined } : field,
        )
      } else if (element.elementType === 'CONSTRUCTOR') {
        add(JavaApiSections.CONSTRUCTORS, this.parseExecutable(element, false))
      } else if (element.elementType === 'METHOD') {
        add(JavaApiSections.METHODS, this.parseExecutable(element, true))
      }
    })

    sections.forEach(members => members.sort(compareMembers))

    return { classValue, sections }
  }

  private collectElements(source: unknown): JdiffElement[] {
    if (!isObject(source) || !Array.isArray(source.artifacts)) {
      return []
    }
    return source.artifacts.flatMap((artifact: unknown) =>
      isObject(artifact) && Array.isArray(artifact.changes)
        ? artifact.changes.filter(isJdiffElement).map(normalizeJdiffElement)
        : []
    )
  }

  private toTypeKind(elementType: string | undefined): JavaApiTypeKind {
    return isJavaApiTypeKind(elementType) ? elementType : JavaApiTypeKinds.CLASS
  }

  private toCompatibility(element: JdiffElement): JavaApiCompatibility {
    return {
      status: element.status,
      binaryCompatible: element.binaryCompatible,
      sourceCompatible: element.sourceCompatible,
      breaking: element.breaking,
      semver: element.semver,
      changeTypes: element.changeTypes,
      details: element.details,
      severity: this.toSeverity(element),
    }
  }

  // Severity uses jdiff's own `breaking` verdict.
  private toSeverity(element: JdiffElement): JavaApiChangeSeverity | undefined {
    if (element.status === 'UNCHANGED' || isInheritedTypeChange(element)) {
      return undefined
    }
    if (element.breaking) {
      return JavaApiChangeSeverities.BREAKING
    }
    return JavaApiChangeSeverities.NON_BREAKING
  }

  // `java.lang.String NAME`
  private parseField(element: JdiffElement): JavaApiMemberNodeValue {
    const member = element.member!
    const separator = member.lastIndexOf(' ')
    return {
      memberKind: JavaApiMemberKinds.FIELD,
      signature: member,
      name: member.slice(separator + 1),
      type: member.slice(0, separator),
      compatibility: this.toCompatibility(element),
    }
  }

  // `void name(java.lang.String, int)` or `Name(java.lang.String)`
  private parseExecutable(element: JdiffElement, hasReturnType: boolean): JavaApiMemberNodeValue {
    const member = element.member!
    const openParen = member.indexOf('(')
    const head = member.slice(0, openParen).trim()
    const parameterList = member.slice(openParen + 1, member.lastIndexOf(')')).trim()
    const parameterTypes = parameterList ? parameterList.split(',').map(parameter => parameter.trim()) : []
    const separator = head.lastIndexOf(' ')
    return {
      memberKind: hasReturnType ? JavaApiMemberKinds.METHOD : JavaApiMemberKinds.CONSTRUCTOR,
      signature: member,
      name: hasReturnType ? head.slice(separator + 1) : head,
      type: hasReturnType ? head.slice(0, separator) : undefined,
      parameterTypes,
      compatibility: this.toCompatibility(element),
    }
  }
}

const MEMBER_COUNT_KINDS: ReadonlySet<string> = new Set<JavaApiMemberCountKind>(['FIELD', 'CONSTRUCTOR', 'METHOD'])

function isJavaApiTypeKind(value: string | undefined): value is JavaApiTypeKind {
  return value !== undefined && TYPE_KINDS.has(value)
}

function isJavaApiMemberCountKind(value: string): value is JavaApiMemberCountKind {
  return MEMBER_COUNT_KINDS.has(value)
}

function countMemberKinds(elements: readonly JdiffElement[]): Record<JavaApiMemberCountKind, number> {
  const counts: Record<JavaApiMemberCountKind, number> = { FIELD: 0, CONSTRUCTOR: 0, METHOD: 0 }
  elements.forEach(element => {
    if (isJavaApiMemberCountKind(element.elementType)) {
      counts[element.elementType]++
    }
  })
  return counts
}

const TYPE_KIND_SUBJECTS: Readonly<Record<string, string>> = {
  CLASS: 'class',
  INTERFACE: 'interface',
  ENUM: 'enum',
  ANNOTATION: 'annotation type',
}

// `method 'getIds(String)'` with simple type names, and the code word of its kind
function describeSubject(className: string, element: JdiffElement): [string, string] {
  const member = element.member
  if (!member) {
    return [
      `${TYPE_KIND_SUBJECTS[element.elementType] ?? 'type'} '${toJavaDisplayName(className)}'`,
      element.elementType,
    ]
  }
  if (element.elementType === 'FIELD') {
    return [`field '${member.slice(member.lastIndexOf(' ') + 1)}'`, 'FIELD']
  }
  const openParen = member.indexOf('(')
  const head = member.slice(0, openParen).trim()
  const name = toJavaSimpleTypeName(head.slice(head.lastIndexOf(' ') + 1))
  const parameterList = member.slice(openParen + 1, member.lastIndexOf(')')).trim()
  const parameters = parameterList
    ? parameterList.split(',').map(type => toJavaSimpleTypeName(type.trim())).join(', ')
    : ''
  const kind = element.elementType === 'CONSTRUCTOR' ? 'constructor' : 'method'
  return [`${kind} '${name}(${parameters})'`, element.elementType]
}

// jdiff marks a type MODIFIED whenever one of its members changes; such a row says nothing about the
// type itself, so it is neither highlighted nor counted, and only the member rows carry the change
function isInheritedTypeChange(element: JdiffElement): boolean {
  return !element.member
    && element.status === 'MODIFIED'
    && element.changeTypes.length === 0
    && !element.details
}

function isJdiffElement(value: unknown): value is JdiffElement {
  return isObject(value)
    && typeof value.className === 'string'
    && typeof value.elementType === 'string'
    && typeof value.status === 'string'
}

// a row without a change code list has no change codes, rather than breaking every reader of `changeTypes`
function normalizeJdiffElement(element: JdiffElement): JdiffElement {
  return Array.isArray(element.changeTypes) ? element : { ...element, changeTypes: [] }
}

function compareMembers(a: JavaApiMemberNodeValue, b: JavaApiMemberNodeValue): number {
  return a.name.localeCompare(b.name)
    || (a.parameterTypes ?? []).join().localeCompare((b.parameterTypes ?? []).join())
}
