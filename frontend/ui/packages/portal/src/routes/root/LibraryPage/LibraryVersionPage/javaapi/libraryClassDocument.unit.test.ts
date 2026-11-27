import type { JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'

import type {
  LibraryChangeDto,
  LibraryClassDetailsDto,
  LibraryClassDto,
  LibraryFieldDto,
  LibraryMethodDto,
} from '@portal/entities/libraries'

import {
  toDiffRows,
  toJavaApiDocument,
  toJdiffChangeRow,
  toJdiffMemberRow,
  toJdiffTypeRow,
  toReportRows,
  withMemberCounts,
} from './libraryClassDocument'

const ORDER: LibraryClassDto = {
  classId: 'example.Order',
  kind: 'class',
  qualifiedName: 'example.Order',
  deprecated: true,
  methodCount: 1,
  constructorCount: 2,
  fieldCount: 3,
}

const GET_NAME: LibraryMethodDto = {
  classId: ORDER.classId,
  methodId: 'getName()',
  name: 'getName',
  signature: 'java.lang.String getName()',
  deprecated: false,
}

const ORDER_CONSTRUCTOR: LibraryMethodDto = {
  ...GET_NAME,
  methodId: 'Order(java.lang.String)',
  name: 'Order',
  signature: 'Order(java.lang.String)',
}

const NAME_FIELD: LibraryFieldDto = { classId: ORDER.classId, signature: 'java.lang.String name' }

const CURRENT: LibraryClassDetailsDto = { ...ORDER, methods: [GET_NAME], constructors: [], fields: [] }

const RETURN_TYPE_CHANGE: LibraryChangeDto = {
  changeId: 'return-type',
  classId: ORDER.classId,
  methodId: GET_NAME.methodId,
  changeType: 'changed',
  severity: 'breaking',
  details: {
    elementType: 'METHOD',
    member: 'java.lang.Object getName()',
    status: 'MODIFIED',
    changeTypes: ['METHOD_RETURN_TYPE_CHANGED'],
  },
}

describe('library class document', () => {
  it('maps all three member counts from the DTO with the same class name', () => {
    const item: JavaApiClassListItem = {
      className: ORDER.classId,
      displayName: 'Order',
      packageName: 'example',
      typeKind: 'CLASS',
      memberCount: 0,
      memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 0 },
      changeCounts: { breaking: 0, 'non-breaking': 0, annotation: 0 },
      changes: [],
      elements: [],
    }
    const other: LibraryClassDto = { ...ORDER, classId: 'example.Other', methodCount: 10 }

    expect(withMemberCounts([item], [other, ORDER])).toEqual([{
      ...item,
      memberCount: 6,
      memberKindCounts: { FIELD: 3, CONSTRUCTOR: 2, METHOD: 1 },
    }])
  })

  it.each(
    [
      ['class', 'CLASS'],
      ['interface', 'INTERFACE'],
      ['enum', 'ENUM'],
      ['annotation', 'ANNOTATION'],
      ['record', 'CLASS'],
    ] as const,
  )('maps %s to an unchanged %s type without treating deprecation as a change', (kind, elementType) => {
    expect(toJdiffTypeRow({ ...ORDER, kind })).toEqual({
      className: ORDER.classId,
      elementType: elementType,
      status: 'UNCHANGED',
      changeTypes: [],
      breaking: false,
    })
  })

  it('takes fields, constructors, and methods from their own arrays of the class details', () => {
    const details: LibraryClassDetailsDto = {
      ...CURRENT,
      constructors: [ORDER_CONSTRUCTOR],
      fields: [NAME_FIELD],
    }

    expect(toReportRows([ORDER], [details])).toEqual([
      toJdiffTypeRow(ORDER),
      {
        className: ORDER.classId,
        elementType: 'FIELD',
        member: 'java.lang.String name',
        status: 'UNCHANGED',
        changeTypes: [],
        breaking: false,
      },
      toJdiffMemberRow(ORDER_CONSTRUCTOR, 'CONSTRUCTOR'),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
    ])
    expect(toJdiffMemberRow(ORDER_CONSTRUCTOR, 'CONSTRUCTOR')).toMatchObject({
      elementType: 'CONSTRUCTOR',
      member: 'Order(java.lang.String)',
    })
  })

  it('includes members and a single type row for a class present only in details', () => {
    const nested: LibraryClassDetailsDto = {
      ...CURRENT,
      classId: 'example.Order$Builder',
      qualifiedName: 'example.Order$Builder',
      methods: [{ ...GET_NAME, classId: 'example.Order$Builder' }],
    }

    expect(toReportRows([ORDER], [CURRENT, nested])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffTypeRow(nested),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
      toJdiffMemberRow(nested.methods[0], 'METHOD'),
    ])
  })

  it.each([GET_NAME.methodId, undefined])(
    'replaces a method after a return-type change using methodId %s',
    methodId => {
      expect(toDiffRows(CURRENT, [{ ...RETURN_TYPE_CHANGE, methodId }])).toEqual([
        toJdiffTypeRow(ORDER),
        toJdiffChangeRow(RETURN_TYPE_CHANGE),
      ])
    },
  )

  it('erases generic return types without losing parameter types when methodId is missing', () => {
    const method = {
      ...GET_NAME,
      methodId: 'convert(java.lang.Class<T>)',
      signature: '<T> T convert(java.lang.Class<T>)',
    }
    const change: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'METHOD', member: 'java.util.Map<K, V> convert(java.lang.Class<T>)' },
    }

    expect(toDiffRows({ ...CURRENT, methods: [method] }, [change])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffChangeRow(change),
    ])
  })

  it('replaces type and constructor rows in inventory order', () => {
    const constructorChange: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'CONSTRUCTOR', member: ORDER_CONSTRUCTOR.signature },
    }
    const typeChange: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'CLASS', changeTypes: ['CLASS_NOW_ABSTRACT'] },
    }

    expect(toDiffRows({ ...CURRENT, constructors: [ORDER_CONSTRUCTOR] }, [constructorChange, typeChange])).toEqual([
      toJdiffChangeRow(typeChange),
      toJdiffChangeRow(constructorChange),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
    ])
  })

  it('replaces a current field with its change row', () => {
    const fieldChange: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'FIELD', member: NAME_FIELD.signature, status: 'MODIFIED' },
    }

    expect(toDiffRows({ ...CURRENT, fields: [NAME_FIELD] }, [fieldChange])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffChangeRow(fieldChange),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
    ])
  })

  it('appends a removed method and a changed field after inventory rows in change order', () => {
    const removed: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: 'clear()',
      changeType: 'removed',
      details: { elementType: 'METHOD', member: 'void clear()', status: 'REMOVED' },
    }
    const field: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'FIELD', member: 'java.lang.String name' },
    }

    expect(toDiffRows(CURRENT, [removed, field])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
      toJdiffChangeRow(removed),
      toJdiffChangeRow(field),
    ])
  })

  it('builds a removed class from change rows alone', () => {
    const removed: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      changeType: 'removed',
      details: { elementType: 'CLASS', status: 'REMOVED' },
    }

    expect(toDiffRows(undefined, [removed])).toEqual([toJdiffChangeRow(removed)])
  })

  it('appends nested type rows with their status and explicit severity', () => {
    expect(toDiffRows(CURRENT, [], [
      { classId: 'example.Order$Added', kind: 'interface', status: 'added', severity: 'non-breaking' },
      { classId: 'example.Order$Removed', kind: 'enum', status: 'removed', severity: 'breaking' },
      { classId: 'example.Order$Changed', kind: 'annotation', status: 'changed', severity: 'annotation' },
    ])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
      {
        className: 'example.Order$Added',
        elementType: 'INTERFACE',
        status: 'NEW',
        changeTypes: [],
        breaking: false,
        severity: 'non-breaking',
      },
      {
        className: 'example.Order$Removed',
        elementType: 'ENUM',
        status: 'REMOVED',
        changeTypes: [],
        breaking: true,
        severity: 'breaking',
      },
      {
        className: 'example.Order$Changed',
        elementType: 'ANNOTATION',
        status: 'MODIFIED',
        changeTypes: [],
        breaking: false,
        severity: 'annotation',
      },
    ])
  })

  it('keeps an existing type row when nested changes contain the same class', () => {
    const change: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      classId: 'example.Order$Builder',
      methodId: undefined,
      details: { elementType: 'CLASS', status: 'MODIFIED', changeTypes: ['CLASS_NOW_ABSTRACT'] },
    }

    expect(toDiffRows(CURRENT, [change], [
      { classId: change.classId, kind: 'class', status: 'changed', severity: 'breaking' },
    ])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffMemberRow(GET_NAME, 'METHOD'),
      toJdiffChangeRow(change),
    ])
  })

  it.each(
    [
      ['breaking', true],
      ['non-breaking', false],
      ['annotation', false],
    ] as const,
  )('derives breaking from %s severity and preserves runtime compatibility details', (severity, breaking) => {
    const details = {
      elementType: 'CLASS',
      binaryCompatible: false,
      sourceCompatible: true,
      semver: 'MAJOR',
      details: 'Compatibility note',
      breaking: !breaking,
    }

    expect(toJdiffChangeRow({ ...RETURN_TYPE_CHANGE, severity, details })).toEqual({
      ...details,
      className: ORDER.classId,
      status: 'MODIFIED',
      changeTypes: [],
      breaking: breaking,
    })
  })

  // the api-doc-viewer builders are ESM-only in this Jest setup; the browser check covers that they read the document
  it('wraps rows in the single-artifact jdiff document the builders read', () => {
    const rows = toReportRows([ORDER], [])

    expect(toJavaApiDocument(rows)).toEqual({ artifacts: [{ changes: rows }] })
  })
})
