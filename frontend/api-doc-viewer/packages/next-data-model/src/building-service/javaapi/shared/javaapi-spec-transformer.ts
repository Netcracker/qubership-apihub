import type { BuildingServiceLogger } from '../../../loggers'
import type {
  JavaApiChangeDescription,
  JavaApiClassListItem,
} from '../../../model/javaapi/class-list/class-list-item'
import {
  JavaApiChangeSeverities,
  type JavaApiChangeSeverity,
  type JavaApiClassNodeValue,
  type JavaApiCompatibility,
  JavaApiMemberKinds,
  type JavaApiMemberNodeValue,
  type JavaApiSection,
  JavaApiSections,
  JavaApiTypeKinds,
} from '../../../model/javaapi/tree/node-value'
import { describeJavaApiElementChanges } from '../../../shared/javaapi/change-descriptions'
import { parseJavaExecutableSignature, parseJavaFieldSignature } from '../../../shared/javaapi/member-signatures'
import {
  toJavaDisplayName,
  toJavaEnclosingClassName,
  toJavaPackageName,
} from '../../../shared/javaapi/type-names'
import type { ClassKey } from '../../../shared/javaapi/types/class-key'
import { JdiffMemberElementTypes } from '../../../shared/javaapi/types/jdiff-member-element-type'
import { JdiffStatuses } from '../../../shared/javaapi/types/jdiff-status'
import { isArray, isObject, isString } from '../../../utilities'
import {
  compareClassListItems,
  countMemberKinds,
  createChangeCounts,
  describeJdiffSubject,
  isJavaApiTypeKind,
  orderTypeRowFirst,
  toJavaApiChangeAction,
  toJavaApiTypeKind,
} from './jdiff-element-helpers'

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

export const JAVA_API_LOG_PREFIX = '[Java API]'

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
        typeKind: toJavaApiTypeKind(context.typeRows.get(className)?.elementType),
        memberCount: elements.filter(element => !!element.member).length,
        memberKindCounts: countMemberKinds(elements),
        changeCounts: this.countChanges(elements),
        compatibility: this.toClassCompatibility(context.typeRows.get(className)),
        changeAction: toJavaApiChangeAction(context.typeRows.get(className), elements),
        changes: this.describeChanges(className, context.typeRows.get(className), elements),
        elements,
      }))
      .sort(compareClassListItems)
  }

  private describeChanges(
    className: string,
    typeRow: JdiffElement | undefined,
    elements: readonly JdiffElement[],
  ): JavaApiChangeDescription[] {
    const ordered = orderTypeRowFirst(typeRow, elements)
    return ordered.flatMap(element => {
      const severity = this.toSeverity(element)
      if (!severity) {
        return []
      }
      const [subject, kindWord] = describeJdiffSubject(className, element)
      return describeJavaApiElementChanges(element.status, element.changeTypes, subject, kindWord)
        .map(description => ({ severity, description }))
    })
  }

  private toClassCompatibility(typeRow: JdiffElement | undefined): JavaApiCompatibility | undefined {
    return typeRow ? this.toCompatibility(typeRow) : undefined
  }

  // Count jdiff rows by severity so the counters agree with the highlighted rows.
  private countChanges(elements: readonly JdiffElement[]): Record<JavaApiChangeSeverity, number> {
    const counts = createChangeCounts()
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
      isJavaApiTypeKind(element.elementType) && typeRows.set(className, element)
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
    const typeKind = toJavaApiTypeKind(typeRow?.elementType)
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
        typeKind: toJavaApiTypeKind(nestedTypeRow?.elementType),
        compatibility: nestedTypeRow ? this.toCompatibility(nestedTypeRow) : undefined,
      })
    })

    elementsByClass.get(className)?.forEach(element => {
      if (!element.member) {
        return
      }
      switch (element.elementType) {
        case JdiffMemberElementTypes.FIELD: {
          const field = this.parseField(element)
          // an enum's constants are its fields of its own type
          const isEnumConstant = typeKind === JavaApiTypeKinds.ENUM && field.type === className
          add(
            isEnumConstant ? JavaApiSections.ENUM_CONSTANTS : JavaApiSections.FIELDS,
            isEnumConstant ? { ...field, memberKind: JavaApiMemberKinds.ENUM_CONSTANT, type: undefined } : field,
          )
          break
        }
        case JdiffMemberElementTypes.CONSTRUCTOR:
          add(JavaApiSections.CONSTRUCTORS, this.parseExecutable(element))
          break
        case JdiffMemberElementTypes.METHOD:
          add(JavaApiSections.METHODS, this.parseExecutable(element))
          break
      }
    })

    sections.forEach(members => members.sort(compareMembers))

    return { classValue, sections }
  }

  private collectElements(source: unknown): JdiffElement[] {
    if (!isObject(source) || !isArray(source.artifacts)) {
      return []
    }
    return source.artifacts.flatMap((artifact: unknown) =>
      isObject(artifact) && isArray(artifact.changes)
        ? artifact.changes.filter(isJdiffElement).map(normalizeJdiffElement)
        : []
    )
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
    if (element.status === JdiffStatuses.UNCHANGED || isInheritedTypeChange(element)) {
      return undefined
    }
    if (element.breaking) {
      return JavaApiChangeSeverities.BREAKING
    }
    return JavaApiChangeSeverities.NON_BREAKING
  }

  private parseField(element: JdiffElement): JavaApiMemberNodeValue {
    const member = element.member!
    const { name, type } = parseJavaFieldSignature(member)
    return {
      memberKind: JavaApiMemberKinds.FIELD,
      signature: member,
      name,
      type,
      compatibility: this.toCompatibility(element),
    }
  }

  private parseExecutable(element: JdiffElement): JavaApiMemberNodeValue {
    const member = element.member!
    const { returnType, name, parameterTypes } = parseJavaExecutableSignature(member)
    const isConstructor = element.elementType === JdiffMemberElementTypes.CONSTRUCTOR
    return {
      memberKind: isConstructor ? JavaApiMemberKinds.CONSTRUCTOR : JavaApiMemberKinds.METHOD,
      signature: member,
      name,
      type: returnType,
      parameterTypes,
      compatibility: this.toCompatibility(element),
    }
  }
}

// jdiff marks a type MODIFIED whenever one of its members changes; such a row says nothing about the
// type itself, so it is neither highlighted nor counted, and only the member rows carry the change
function isInheritedTypeChange(element: JdiffElement): boolean {
  return !element.member
    && element.status === JdiffStatuses.MODIFIED
    && element.changeTypes.length === 0
    && !element.details
}

function isJdiffElement(value: unknown): value is JdiffElement {
  return isObject(value)
    && isString(value.className)
    && isString(value.elementType)
    && isString(value.status)
}

// a row without a change code list has no change codes, rather than breaking every reader of `changeTypes`
function normalizeJdiffElement(element: JdiffElement): JdiffElement {
  return isArray(element.changeTypes) ? element : { ...element, changeTypes: [] }
}

function compareMembers(a: JavaApiMemberNodeValue, b: JavaApiMemberNodeValue): number {
  return a.name.localeCompare(b.name)
    || (a.parameterTypes ?? []).join().localeCompare((b.parameterTypes ?? []).join())
}
