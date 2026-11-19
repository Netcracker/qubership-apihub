import {
  JavaApiChangeRow,
  JavaApiChangesClassListBuilder,
} from '../../src/building-service/javaapi/changes-class-list/builder'
import { JavaApiClassListBuilder } from '../../src/building-service/javaapi/class-list/builder'
import { javaApiDocument, javaApiElement } from '../helpers/javaapi-fixtures'

describe('JavaApiChangesClassListBuilder', () => {
  it('groups rows by binary class name, orders types, and counts changed members and severities', () => {
    const classes = new JavaApiChangesClassListBuilder({
      changes: [
        change('example.Order$OrderBuilder', { elementType: 'METHOD', member: 'void clear()' }),
        change('example.Order', { elementType: 'CONSTRUCTOR', member: 'Order(java.lang.String)', status: 'NEW' }, {
          changeType: 'added',
          severity: 'non-breaking',
        }),
        change('example.Order', { elementType: 'INTERFACE' }),
        change('example.Order', { elementType: 'FIELD', member: 'java.lang.String ID' }),
      ],
    }).build()

    expect(classes.map(({ displayName, packageName, typeKind, memberKindCounts, changeCounts, changeAction }) => ({
      displayName,
      packageName,
      typeKind,
      memberKindCounts,
      changeCounts,
      changeAction,
    }))).toEqual([
      {
        displayName: 'Order',
        packageName: 'example',
        typeKind: 'INTERFACE',
        memberKindCounts: { FIELD: 1, CONSTRUCTOR: 1, METHOD: 0 },
        changeCounts: { breaking: 2, 'non-breaking': 1, annotation: 0 },
        changeAction: 'changed',
      },
      {
        displayName: 'Order.OrderBuilder',
        packageName: 'example',
        typeKind: 'CLASS',
        memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 1 },
        changeCounts: { breaking: 1, 'non-breaking': 0, annotation: 0 },
        changeAction: 'changed',
      },
    ])
  })

  it.each(['NEW', 'REMOVED'] as const)('matches jdiff descriptions and type actions for %s', status => {
    const elements = [
      javaApiElement('example.Order', { status }),
      javaApiElement('example.Order', { status, elementType: 'CONSTRUCTOR', member: 'Order(java.lang.String)' }),
      javaApiElement('example.Order', { status, elementType: 'FIELD', member: 'java.lang.String ID' }),
      javaApiElement('example.Order', {
        status,
        elementType: 'METHOD',
        member: 'void setTagIds(java.util.List)',
        changeTypes: ['METHOD_REMOVED_IN_SUPERCLASS', 'METHOD_RETURN_TYPE_CHANGED'],
      }),
    ]
    const [expected] = new JavaApiClassListBuilder({ source: javaApiDocument(...elements) }).build()
    const [actual] = new JavaApiChangesClassListBuilder({
      changes: elements.map(element =>
        change(
          element.className,
          element,
          { severity: 'non-breaking', changeType: status === 'NEW' ? 'added' : 'removed' },
        )
      ),
    }).build()
    expect(actual.changes).toEqual(expected.changes)
    expect(actual.changeAction).toBe(expected.changeAction)
    expect(actual.changeCounts['non-breaking']).toBe(4)
  })

  it('keeps annotation changes even when the element status is unchanged', () => {
    const [item] = new JavaApiChangesClassListBuilder({
      changes: [change('example.Order', {
        elementType: 'METHOD',
        member: 'void clear()',
        status: 'UNCHANGED',
        changeTypes: ['ANNOTATION_DEPRECATED_ADDED'],
      }, { severity: 'annotation', changeType: 'deprecated' })],
    }).build()
    expect(item.changeCounts).toEqual({ breaking: 0, 'non-breaking': 0, annotation: 1 })
    expect(item.memberKindCounts.METHOD).toBe(1)
    expect(item.changeAction).toBeUndefined()
    expect(item.changes).toEqual([{ severity: 'annotation', description: '[Deprecated] method \'clear()\'' }])
  })
})

function change(
  classId: string,
  details: JavaApiChangeRow['details'],
  overrides: Partial<JavaApiChangeRow> = {},
): JavaApiChangeRow {
  return {
    changeId: `${classId}:${details.member ?? ''}`,
    classId,
    changeType: 'changed',
    severity: 'breaking',
    description: 'Raw backend text must not be displayed',
    details: { status: 'MODIFIED', ...details },
    ...overrides,
  }
}
