// TODO(libraries-backend): The class endpoint supplies no modifiers. Enum constants come as fields of the enum's own
// type, which the JavaAPI model shows as enum constants. The UI has no record kind; records appear as classes.

import { JavaApiClassListBuilder, type JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

import type {
  LibraryChangeDto,
  LibraryClassDetailsDto,
  LibraryClassDto,
  LibraryFieldDto,
  LibraryJavaApiDocumentDto,
  LibraryMethodDto,
  LibraryNestedClassChangeDto,
} from '@portal/entities/libraries'

type JdiffRow = Readonly<{
  className: string
  elementType: string
  status: string
  member?: string
  changeTypes: readonly string[]
  details?: string
  breaking: boolean
  severity?: LibraryNestedClassChangeDto['severity']
  binaryCompatible?: boolean
  sourceCompatible?: boolean
  semver?: string
}>

const KIND_TO_JDIFF: Readonly<Record<LibraryClassDto['kind'], string>> = {
  class: 'CLASS',
  interface: 'INTERFACE',
  enum: 'ENUM',
  annotation: 'ANNOTATION',
  record: 'CLASS',
}

const NESTED_STATUS_TO_JDIFF: Readonly<Record<LibraryNestedClassChangeDto['status'], string>> = {
  added: 'NEW',
  removed: 'REMOVED',
  changed: 'MODIFIED',
}

export function toJdiffTypeRow(cls: Pick<LibraryClassDto, 'classId' | 'kind'>): JdiffRow {
  return {
    className: cls.classId,
    elementType: KIND_TO_JDIFF[cls.kind],
    status: 'UNCHANGED',
    changeTypes: [],
    breaking: false,
  }
}

export function toJdiffMemberRow(method: LibraryMethodDto, elementType: 'METHOD' | 'CONSTRUCTOR'): JdiffRow {
  return {
    className: method.classId,
    elementType: elementType,
    member: method.signature,
    status: 'UNCHANGED',
    changeTypes: [],
    breaking: false,
  }
}

// the signature is the jdiff field member, `<type> <name>`
export function toJdiffFieldRow(field: LibraryFieldDto): JdiffRow {
  return {
    className: field.classId,
    elementType: 'FIELD',
    member: field.signature,
    status: 'UNCHANGED',
    changeTypes: [],
    breaking: false,
  }
}

function toJdiffClassMemberRows(cls: LibraryClassDetailsDto): JdiffRow[] {
  return [
    ...cls.fields.map(toJdiffFieldRow),
    ...cls.constructors.map(constructor => toJdiffMemberRow(constructor, 'CONSTRUCTOR')),
    ...cls.methods.map(method => toJdiffMemberRow(method, 'METHOD')),
  ]
}

export function toReportRows(
  classes: readonly LibraryClassDto[],
  details: readonly LibraryClassDetailsDto[],
): JdiffRow[] {
  const rows = classes.map(toJdiffTypeRow)
  const classIds = new Set(classes.map(cls => cls.classId))
  details.forEach(cls => {
    if (!classIds.has(cls.classId)) {
      rows.push(toJdiffTypeRow(cls))
      classIds.add(cls.classId)
    }
  })
  return [...rows, ...details.flatMap(toJdiffClassMemberRows)]
}

export function toClassReportRows(
  classes: readonly LibraryClassDto[],
  details: LibraryClassDetailsDto | null,
): JdiffRow[] {
  const rows = toReportRows(classes, details ? [details] : [])
  const classIds = new Set(rows.map(row => row.className))
  details?.nestedClasses?.forEach(cls => {
    if (classIds.has(cls.classId)) return
    rows.push(toJdiffTypeRow(cls))
    classIds.add(cls.classId)
  })
  return rows
}

export function withMemberCounts(
  items: readonly JavaApiClassListItem[],
  classes: readonly LibraryClassDto[],
): JavaApiClassListItem[] {
  const classesById = new Map(classes.map(cls => [cls.classId, cls]))
  return items.map((item: JavaApiClassListItem) => {
    const cls = classesById.get(item.className)
    if (!cls) return item
    return {
      ...item,
      memberKindCounts: { FIELD: cls.fieldCount, CONSTRUCTOR: cls.constructorCount, METHOD: cls.methodCount },
      memberCount: cls.fieldCount + cls.constructorCount + cls.methodCount,
    }
  })
}

export function toLibraryClassListItems(classes: readonly LibraryClassDto[]): JavaApiClassListItem[] {
  const document = toJavaApiDocument(toReportRows(classes, []))
  const items = new JavaApiClassListBuilder({ source: document }).build()
  const order = new Map(classes.map((cls, index) => [cls.classId, index]))
  return withMemberCounts(items, classes).sort((a, b) => order.get(a.className)! - order.get(b.className)!)
}

export function toDiffRows(
  current: LibraryClassDetailsDto | undefined,
  changes: readonly LibraryChangeDto[],
  nestedChanges: readonly LibraryNestedClassChangeDto[] = [],
): JdiffRow[] {
  const rows = toReportRows(current ? [current] : [], current ? [current] : [])
  const indices = new Map(rows.map((row, index) => [toJdiffRowKey(row), index]))
  changes.forEach(change => {
    const row = toJdiffChangeRow(change)
    const key = toJdiffRowKey(row)
    const index = indices.get(key)
    if (index === undefined) {
      indices.set(key, rows.length)
      rows.push(row)
    } else {
      rows[index] = row
    }
  })
  // Without class details and without a class row, the change rows' kind is all the page knows about the class
  if (!current) {
    const change = changes.find(change => change.kind && Object.hasOwn(KIND_TO_JDIFF, change.kind))
    if (change) {
      const elementType = KIND_TO_JDIFF[change.kind as LibraryClassDto['kind']]
      const row: JdiffRow = {
        className: change.classId,
        elementType: elementType,
        status: 'UNCHANGED',
        changeTypes: [],
        breaking: false,
      }
      const key = toJdiffRowKey(row)
      if (!indices.has(key)) {
        indices.set(key, rows.length)
        rows.push(row)
      }
    }
  }
  nestedChanges.forEach(change => {
    const row: JdiffRow = {
      className: change.classId,
      elementType: KIND_TO_JDIFF[change.kind],
      status: NESTED_STATUS_TO_JDIFF[change.status],
      changeTypes: [],
      breaking: change.severity === 'breaking',
      severity: change.severity,
    }
    const key = toJdiffRowKey(row)
    if (indices.has(key)) return
    indices.set(key, rows.length)
    rows.push(row)
  })
  return rows
}

export function toJdiffChangeRow(row: LibraryChangeDto): JdiffRow {
  return {
    ...row.details,
    className: row.classId,
    status: row.details.status ?? 'MODIFIED',
    changeTypes: row.details.changeTypes ?? [],
    breaking: row.severity === 'breaking',
  }
}

export function toJavaApiDocument(rows: readonly JdiffRow[]): LibraryJavaApiDocumentDto {
  return { artifacts: [{ changes: rows }] }
}

// a method keeps its key when only its return type changes: the backend's methodId uses the same erasure
function toJdiffRowKey(row: JdiffRow): string {
  if (row.elementType === 'METHOD' || row.elementType === 'CONSTRUCTOR') {
    return `${row.className}\0${erasedMethodId(row.member ?? '')}`
  }
  if (row.elementType === 'FIELD') {
    return `${row.className}\0FIELD\0${row.member}`
  }
  return `${row.className}\0TYPE`
}

function erasedMethodId(member: string): string {
  const openParen = member.indexOf('(')
  if (openParen < 0) return member
  const head = member.slice(0, openParen)
  return head.slice(head.lastIndexOf(' ') + 1) + member.slice(openParen)
}
