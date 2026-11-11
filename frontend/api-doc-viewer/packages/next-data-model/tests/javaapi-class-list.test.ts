import { createBuildingServiceLogger, JavaApiClassListBuilder } from '../src'
import { javaApiDocument, javaApiElement, loadJavaApiSample } from './helpers/javaapi-fixtures'

describe('Java API class list', () => {
  it('orders types by package then display name and preserves nested class names and kinds', () => {
    const classes = new JavaApiClassListBuilder({
      source: javaApiDocument(
        javaApiElement('z.Alpha'),
        javaApiElement('a.Zulu', { elementType: 'ENUM' }),
        javaApiElement('a.Outer$Inner', { elementType: 'INTERFACE' }),
        javaApiElement('a.Annotation', { elementType: 'ANNOTATION' }),
      ),
    }).build()

    expect(classes.map(({ className, displayName, packageName, typeKind }) => ({
      className,
      displayName,
      packageName,
      typeKind,
    }))).toEqual([
      { className: 'a.Annotation', displayName: 'Annotation', packageName: 'a', typeKind: 'ANNOTATION' },
      { className: 'a.Outer$Inner', displayName: 'Outer.Inner', packageName: 'a', typeKind: 'INTERFACE' },
      { className: 'a.Zulu', displayName: 'Zulu', packageName: 'a', typeKind: 'ENUM' },
      { className: 'z.Alpha', displayName: 'Alpha', packageName: 'z', typeKind: 'CLASS' },
    ])
  })

  it('counts the report members by kind without reporting changes', () => {
    const classes = new JavaApiClassListBuilder({ source: loadJavaApiSample('api-report') }).build()

    expect(classes).toHaveLength(5)
    expect(classes.find(item => item.displayName === 'ConsulClient')).toMatchObject({
      memberCount: 14,
      memberKindCounts: { FIELD: 7, CONSTRUCTOR: 1, METHOD: 6 },
    })
    expect(classes.find(item => item.displayName === 'EntityType')).toMatchObject({
      typeKind: 'ENUM',
      memberCount: 30,
      memberKindCounts: { FIELD: 27, CONSTRUCTOR: 0, METHOD: 3 },
    })
    expect(classes.find(item => item.displayName === 'ElementRepository')).toMatchObject({
      typeKind: 'INTERFACE',
      memberCount: 24,
      memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 24 },
    })
    expect(classes.find(item => item.displayName === 'DeploymentInfo')).toMatchObject({
      memberCount: 21,
      memberKindCounts: { FIELD: 0, CONSTRUCTOR: 2, METHOD: 19 },
    })
    expect(classes.find(item => item.displayName === 'DeploymentInfo.DeploymentInfoBuilder')).toMatchObject({
      memberCount: 11,
      memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 11 },
    })
    expect(classes.every(item =>
      item.changeAction === undefined && item.changes.length === 0
      && Object.values(item.changeCounts).every(count => count === 0)
    )).toBe(true)
  })

  it('counts changed rows rather than change-type labels in the diff sample', () => {
    const classes = new JavaApiClassListBuilder({ source: loadJavaApiSample('api-diff') }).build()

    expect(classes.map(({ displayName, typeKind, memberKindCounts, changeCounts, changeAction }) => ({
      displayName,
      typeKind,
      memberKindCounts,
      changeCounts,
      changeAction,
    }))).toEqual([
      {
        displayName: 'DeploymentInfo',
        typeKind: 'CLASS',
        memberKindCounts: { FIELD: 0, CONSTRUCTOR: 2, METHOD: 2 },
        changeCounts: { breaking: 3, 'non-breaking': 1 },
        changeAction: 'changed',
      },
      {
        displayName: 'DeploymentInfo.DeploymentInfoBuilder',
        typeKind: 'CLASS',
        memberKindCounts: { FIELD: 0, CONSTRUCTOR: 0, METHOD: 1 },
        changeCounts: { breaking: 1, 'non-breaking': 0 },
        changeAction: 'changed',
      },
    ])

    expect(classes.find(item => item.displayName === 'DeploymentInfo')?.changes).toEqual([
      {
        severity: 'breaking',
        description:
          '[Removed] constructor \'DeploymentInfo(String, String, String, String, String, String, Long, Boolean, Boolean, List)\'',
      },
      {
        severity: 'non-breaking',
        description:
          '[Added] constructor \'DeploymentInfo(String, String, String, String, String, String, Long, Boolean, Boolean)\'',
      },
      { severity: 'breaking', description: '[Removed] method \'getDependencyChainIds()\'' },
      { severity: 'breaking', description: '[Removed] method \'setDependencyChainIds(List)\'' },
    ])
  })

  it.each(
    [
      [true, false, false, 'breaking'],
      // source-incompatible only: jdiff's verdict is breaking
      [true, true, false, 'breaking'],
      [false, true, true, 'non-breaking'],
    ] as const,
  )('maps breaking=%s, binary=%s, source=%s to %s', (breaking, binaryCompatible, sourceCompatible, severity) => {
    const [item] = new JavaApiClassListBuilder({
      source: javaApiDocument(javaApiElement('example.Type', {
        status: 'MODIFIED',
        changeTypes: ['CLASS_NOW_FINAL'],
        binaryCompatible,
        sourceCompatible,
        breaking,
      })),
    }).build()

    expect(item.compatibility?.severity).toBe(severity)
    expect(item.changeCounts).toEqual({ breaking: 0, 'non-breaking': 0, [severity]: 1 })
    expect(item.changes).toEqual([expect.objectContaining({ severity })])
  })

  it('describes change codes and deprecation in order', () => {
    const [item] = new JavaApiClassListBuilder({
      source: javaApiDocument(javaApiElement('example.Type', {
        elementType: 'METHOD',
        member: 'java.lang.String getValue()',
        status: 'MODIFIED',
        changeTypes: ['METHOD_RETURN_TYPE_CHANGED', 'ANNOTATION_DEPRECATED_ADDED'],
        binaryCompatible: false,
        breaking: true,
      })),
    }).build()

    expect(item.changes).toEqual([
      { severity: 'breaking', description: '[Changed] return type of method \'getValue()\'' },
      { severity: 'breaking', description: '[Deprecated] method \'getValue()\'' },
    ])
  })

  it('ignores unchanged rows and inherited type changes but counts type details', () => {
    const classes = new JavaApiClassListBuilder({
      source: javaApiDocument(
        javaApiElement('example.Unchanged', { binaryCompatible: false, sourceCompatible: false, breaking: true }),
        javaApiElement('example.Inherited', {
          status: 'MODIFIED',
          binaryCompatible: false,
          sourceCompatible: false,
          breaking: true,
        }),
        javaApiElement('example.Details', { status: 'MODIFIED', details: 'Superclass changed' }),
      ),
    }).build()

    for (const name of ['Unchanged', 'Inherited']) {
      const item = classes.find(item => item.displayName === name)
      expect(item).toMatchObject({ changeCounts: { breaking: 0, 'non-breaking': 0 }, changes: [] })
      expect(item?.compatibility?.severity).toBeUndefined()
    }
    expect(classes.find(item => item.displayName === 'Details')?.changeCounts)
      .toEqual({ breaking: 0, 'non-breaking': 1 })
  })

  it.each([
    ['NEW', 'added'],
    ['REMOVED', 'removed'],
    ['MODIFIED', 'changed'],
    ['UNCHANGED', undefined],
  ])('maps type status %s to action %s', (status, action) => {
    const [item] = new JavaApiClassListBuilder({
      source: javaApiDocument(javaApiElement('example.Type', { status })),
    }).build()

    expect(item.changeAction).toBe(action)
  })

  it('marks a class changed when only a member changes', () => {
    const [item] = new JavaApiClassListBuilder({
      source: javaApiDocument(
        javaApiElement('example.Type'),
        javaApiElement('example.Type', { elementType: 'METHOD', member: 'void added()', status: 'NEW' }),
      ),
    }).build()

    expect(item.changeAction).toBe('changed')
  })

  it('reads a row without changeTypes as a row with no change codes', () => {
    const { changeTypes: _, ...row } = javaApiElement('example.Type', { status: 'NEW' })
    const [item] = new JavaApiClassListBuilder({ source: javaApiDocument(row) }).build()

    expect(item.changes).toEqual([{ severity: 'non-breaking', description: '[Added] class \'Type\'' }])
    expect(item.compatibility?.changeTypes).toEqual([])
  })

  it.each([
    ['missing artifacts', {}],
    ['rows without className', javaApiDocument({ elementType: 'CLASS', status: 'UNCHANGED' })],
  ])('returns no classes and warns for %s', (_name, source) => {
    const logger = { ...createBuildingServiceLogger(), warn: jest.fn() }

    expect(new JavaApiClassListBuilder({ source, logger }).build()).toEqual([])
    expect(logger.warn).toHaveBeenCalledWith(expect.any(String))
  })
})
