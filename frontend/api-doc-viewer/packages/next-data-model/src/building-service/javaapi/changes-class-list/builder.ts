import type {
  JavaApiChangeDescription,
  JavaApiChangeRowType,
  JavaApiClassListItem,
} from '../../../model/javaapi/class-list/class-list-item'
import type { JavaApiChangeSeverity } from '../../../model/javaapi/tree/node-value'
import { describeJavaApiElementChanges } from '../../../shared/javaapi/change-descriptions'
import { isJavaApiTypeKind } from '../../../shared/javaapi/guards'
import { toJavaDisplayName, toJavaPackageName } from '../../../shared/javaapi/type-names'
import {
  compareClassListItems,
  countMemberKinds,
  createChangeCounts,
  describeJdiffSubject,
  isInheritedTypeChange,
  type JdiffElementFields,
  orderTypeRowFirst,
  toJavaApiChangeAction,
  toJavaApiTypeKind,
} from '../shared/jdiff-element-utils'

export type JavaApiChangeRow = {
  readonly changeId: string
  readonly classId: string
  readonly methodId?: string
  readonly changeType: JavaApiChangeRowType
  readonly severity: JavaApiChangeSeverity
  readonly description?: string
  readonly details: {
    readonly elementType: string
    readonly member?: string
    readonly changeTypes?: readonly string[]
    readonly status?: string
    readonly semver?: string
    readonly details?: string
  }
}

export type JavaApiChangesClassListBuilderParams = {
  readonly changes: readonly JavaApiChangeRow[]
}

export class JavaApiChangesClassListBuilder {
  private readonly changes: readonly JavaApiChangeRow[]

  constructor({ changes }: JavaApiChangesClassListBuilderParams) {
    this.changes = changes
  }

  public build(): JavaApiClassListItem[] {
    return [...this.groupRowsByClass()]
      .map(([className, rows]) => this.toClassListItem(className, rows))
      .filter(item => item !== undefined)
      .sort(compareClassListItems)
  }

  private groupRowsByClass(): Map<string, JavaApiChangeRow[]> {
    const byClass = new Map<string, JavaApiChangeRow[]>()
    this.changes.forEach(row => {
      const rows = byClass.get(row.classId)
      if (rows) rows.push(row)
      else byClass.set(row.classId, [row])
    })
    return byClass
  }

  private toClassListItem(className: string, rows: readonly JavaApiChangeRow[]): JavaApiClassListItem | undefined {
    const typeRow = rows.find(row => !row.details.member && isJavaApiTypeKind(row.details.elementType))
    const changedRows = orderTypeRowFirst(typeRow, rows).filter(row => !isInheritedTypeChange(toElementFields(row)))
    if (changedRows.length === 0) return undefined
    const elements = changedRows.map(toElementFields)
    const memberKindCounts = countMemberKinds(elements)
    const changeCounts = createChangeCounts()
    changedRows.forEach(row => {
      changeCounts[row.severity]++
    })
    return {
      className,
      displayName: toJavaDisplayName(className),
      packageName: toJavaPackageName(className),
      typeKind: toJavaApiTypeKind(typeRow?.details.elementType),
      memberCount: Object.values(memberKindCounts).reduce((total, count) => total + count, 0),
      memberKindCounts,
      changeCounts,
      changeAction: toJavaApiChangeAction(typeRow ? toElementFields(typeRow) : undefined, elements),
      changes: changedRows.flatMap(row => {
        const [subject, kindWord] = describeJdiffSubject(className, toElementFields(row))
        return describeJavaApiElementChanges(
          row.details.status ?? '',
          row.details.changeTypes ?? [],
          subject,
          kindWord,
          row.details.details,
        )
          .map<JavaApiChangeDescription>(description => ({
            severity: row.severity,
            description,
            typeChange: row === typeRow ? true : undefined,
          }))
      }),
      // The rows carry no raw jdiff elements; the class viewer reads them from the report or diff document
      elements: [],
    }
  }
}

function toElementFields(row: JavaApiChangeRow): JdiffElementFields {
  return {
    elementType: row.details.elementType,
    member: row.details.member,
    status: row.details.status,
    changeTypes: row.details.changeTypes,
    details: row.details.details,
  }
}
