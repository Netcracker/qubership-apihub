import type {
  LibraryChangeDto,
  LibraryClassDetailsDto,
  LibraryClassDto,
  LibraryMethodDto,
} from '@portal/entities/libraries'

import {
  toDiffRows,
  toJavaApiDocument,
  toJdiffChangeRow,
  toJdiffMemberRow,
  toJdiffTypeRow,
  toReportRows,
} from './libraryClassDocument'

const ORDER: LibraryClassDto = {
  classId: 'example.Order',
  kind: 'class',
  qualifiedName: 'example.Order',
  deprecated: true,
}

const GET_NAME: LibraryMethodDto = {
  classId: ORDER.classId,
  methodId: 'getName()',
  name: 'getName',
  signature: 'java.lang.String getName()',
  deprecated: false,
}

const CURRENT: LibraryClassDetailsDto = { ...ORDER, methods: [GET_NAME] }

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

  it.each([
    ['Order(java.lang.String)', 'CONSTRUCTOR'],
    ['java.lang.String getName()', 'METHOD'],
    ['java.util.Map<K, V> asMap()', 'METHOD'],
    ['<T> T convert(java.lang.Class<T>)', 'METHOD'],
  ])('detects %s as an unchanged %s member', (signature, elementType) => {
    expect(toJdiffMemberRow({ ...GET_NAME, signature })).toEqual({
      className: ORDER.classId,
      elementType: elementType,
      member: signature,
      status: 'UNCHANGED',
      changeTypes: [],
      breaking: false,
    })
  })

  it('includes members and a single type row for a class present only in details', () => {
    const nested: LibraryClassDetailsDto = {
      ...ORDER,
      classId: 'example.Order$Builder',
      qualifiedName: 'example.Order$Builder',
      methods: [{ ...GET_NAME, classId: 'example.Order$Builder' }],
    }

    expect(toReportRows([ORDER], [CURRENT, nested])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffTypeRow(nested),
      toJdiffMemberRow(GET_NAME),
      toJdiffMemberRow(nested.methods[0]),
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

    expect(toDiffRows({ ...ORDER, methods: [method] }, [change])).toEqual([
      toJdiffTypeRow(ORDER),
      toJdiffChangeRow(change),
    ])
  })

  it('replaces type and constructor rows in inventory order', () => {
    const constructor: LibraryMethodDto = {
      ...GET_NAME,
      methodId: 'Order(java.lang.String)',
      name: 'Order',
      signature: 'Order(java.lang.String)',
    }
    const constructorChange: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'CONSTRUCTOR', member: constructor.signature },
    }
    const typeChange: LibraryChangeDto = {
      ...RETURN_TYPE_CHANGE,
      methodId: undefined,
      details: { elementType: 'CLASS', changeTypes: ['CLASS_NOW_ABSTRACT'] },
    }

    expect(toDiffRows({ ...ORDER, methods: [constructor, GET_NAME] }, [constructorChange, typeChange])).toEqual([
      toJdiffChangeRow(typeChange),
      toJdiffChangeRow(constructorChange),
      toJdiffMemberRow(GET_NAME),
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
      toJdiffMemberRow(GET_NAME),
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
