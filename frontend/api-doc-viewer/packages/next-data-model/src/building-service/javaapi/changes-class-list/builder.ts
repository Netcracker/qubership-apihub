import type {
  JavaApiChangeRowType,
  JavaApiClassListItem,
} from '../../../model/javaapi/class-list/class-list-item'
import type { JavaApiChangeSeverity } from '../../../model/javaapi/tree/node-value'
import { describeJavaApiElementChanges } from '../../../shared/javaapi/change-descriptions'
import { toJavaDisplayName, toJavaPackageName } from '../../../shared/javaapi/type-names'
import {
  compareClassListItems,
  countMemberKinds,
  createChangeCounts,
  describeJdiffSubject,
  isJavaApiTypeKind,
  type JdiffElementFields,
  orderTypeRowFirst,
  toJavaApiChangeAction,
  toJavaApiTypeKind,
} from '../shared/jdiff-element-helpers'

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

  private toClassListItem(className: string, rows: readonly JavaApiChangeRow[]): JavaApiClassListItem {
    const elements = rows.map(toElementFields)
    const typeRow = rows.find(row => !row.details.member && isJavaApiTypeKind(row.details.elementType))
    const memberKindCounts = countMemberKinds(elements)
    const changeCounts = createChangeCounts()
    rows.forEach(row => {
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
      changes: orderTypeRowFirst(typeRow, rows).flatMap(row => {
        const [subject, kindWord] = describeJdiffSubject(className, toElementFields(row))
        return describeJavaApiElementChanges(
          row.details.status ?? '',
          row.details.changeTypes ?? [],
          subject,
          kindWord,
        )
          .map(description => ({ severity: row.severity, description }))
      }),
      // The rows carry no raw jdiff elements; the class viewer reads them from the report or diff document
      elements: [],
    }
  }
}

function toElementFields(row: JavaApiChangeRow): JdiffElementFields {
  return { elementType: row.details.elementType, member: row.details.member, status: row.details.status }
}
