import { JavaApiTreeBuilder } from '../../src/building-service/javaapi/tree/builder'
import { createBuildingServiceLogger } from '../../src/loggers'
import { DIFF_HIGHLIGHTING_MODES_DDL_TITLE_ROW } from '../../src/model/abstract/tree-with-diffs/tree-node.interface'
import { JavaApiRowDiffs } from '../../src/model/javaapi/tree/row-diffs'
import { javaApiDocument, javaApiElement, loadJavaApiSample } from '../helpers/javaapi-fixtures'

// members follow Javadoc section order, with enum constants separate from ordinary fields
describe('JavaApiTreeBuilder', () => {
  it('groups members in Javadoc order with nested class kinds and separate enum constants', () => {
    const className = 'example.Mode'
    const root = new JavaApiTreeBuilder({
      classKey: { className },
      source: javaApiDocument(
        javaApiElement(className, { elementType: 'ENUM' }),
        javaApiElement(className, {
          elementType: 'METHOD',
          member: 'example.Mode$Entry[] entries(java.lang.String[], int)',
        }),
        javaApiElement(className, { elementType: 'FIELD', member: 'int count' }),
        javaApiElement(className, { elementType: 'CONSTRUCTOR', member: 'Mode(java.lang.String, int[])' }),
        javaApiElement(className, { elementType: 'METHOD', member: 'void clear()' }),
        javaApiElement(className, { elementType: 'FIELD', member: 'example.Mode ACTIVE' }),
        javaApiElement(`${className}$Entry`, { elementType: 'INTERFACE' }),
      ),
    }).build().root

    expect(root?.value()).toMatchObject({
      className,
      displayName: 'Mode',
      packageName: 'example',
      typeKind: 'ENUM',
    })
    const sections = root?.childrenNodes() ?? []
    expect(sections.map(node => node.value())).toEqual([
      { section: 'nested-classes', title: 'Nested classes' },
      { section: 'enum-constants', title: 'Enum constants' },
      { section: 'fields', title: 'Fields' },
      { section: 'constructors', title: 'Constructors' },
      { section: 'methods', title: 'Methods' },
    ])
    expect(sections.map(section => section.childrenNodes().map(member => member.value()))).toMatchObject([
      [{ memberKind: 'NESTED_CLASS', name: 'Mode.Entry', className: 'example.Mode$Entry', typeKind: 'INTERFACE' }],
      [{ memberKind: 'ENUM_CONSTANT', name: 'ACTIVE', type: undefined }],
      [{ memberKind: 'FIELD', name: 'count', type: 'int' }],
      [{ memberKind: 'CONSTRUCTOR', name: 'Mode', type: undefined, parameterTypes: ['java.lang.String', 'int[]'] }],
      [
        { memberKind: 'METHOD', name: 'clear', type: 'void', parameterTypes: [] },
        {
          memberKind: 'METHOD',
          name: 'entries',
          type: 'example.Mode$Entry[]',
          parameterTypes: ['java.lang.String[]', 'int'],
        },
      ],
    ])
  })

  it('lists report nested classes under their enclosing class and identifies a nested root', () => {
    const source = loadJavaApiSample('api-report')
    const className = 'com.example.catalog.model.Order'
    const enclosingRoot = new JavaApiTreeBuilder({ source, classKey: { className } }).build().root
    const nestedSection = enclosingRoot?.childrenNodes().find(section => section.key === 'nested-classes')

    expect(nestedSection?.childrenNodes().map(member => member.value())).toMatchObject([
      { name: 'Order.OrderBuilder', className: `${className}$OrderBuilder` },
    ])

    const nestedRoot = new JavaApiTreeBuilder({
      source,
      classKey: { className: `${className}$OrderBuilder` },
    }).build().root

    expect(nestedRoot?.value()).toMatchObject({
      displayName: 'Order.OrderBuilder',
      packageName: 'com.example.catalog.model',
      enclosingClassName: className,
    })
    expect(nestedRoot).not.toBeNull()
    if (nestedRoot) expect(JavaApiRowDiffs.takeRowDiff(nestedRoot)).toBeUndefined()
  })

  it('keeps a field of the owning class type in the fields section', () => {
    const className = 'example.Registry'
    const root = new JavaApiTreeBuilder({
      classKey: { className },
      source: javaApiDocument(
        javaApiElement(className),
        javaApiElement(className, { elementType: 'FIELD', member: 'example.Registry INSTANCE' }),
      ),
    }).build().root

    const sections = root?.childrenNodes() ?? []
    expect(sections.map(section => section.key)).toEqual(['fields'])
    expect(sections[0].childrenNodes().map(member => member.value())).toMatchObject([
      { memberKind: 'FIELD', name: 'INSTANCE', type: className },
    ])
  })

  it('orders overloads with the same name by parameter types', () => {
    const className = 'example.Registry'
    const root = new JavaApiTreeBuilder({
      classKey: { className },
      source: javaApiDocument(
        javaApiElement(className),
        javaApiElement(className, { elementType: 'METHOD', member: 'void put(java.lang.String)' }),
        javaApiElement(className, { elementType: 'METHOD', member: 'void put(int)' }),
      ),
    }).build().root

    const methods = root?.childrenNodes().find(section => section.key === 'methods')
    expect(methods?.childrenNodes().map(member => member.value().signature)).toEqual([
      'void put(int)',
      'void put(java.lang.String)',
    ])
  })

  it('returns no root and warns when the class key is unknown', () => {
    const logger = { ...createBuildingServiceLogger(), warn: jest.fn() }
    const tree = new JavaApiTreeBuilder({
      source: javaApiDocument(javaApiElement('example.Known')),
      classKey: { className: 'example.Unknown' },
      logger,
    }).build()

    expect(tree.root).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('example.Unknown'))
  })

  it.each(
    [
      ['NEW', [], false, 'add', 'green', 'non-breaking'],
      ['REMOVED', [], true, 'remove', 'red', 'breaking'],
      ['MODIFIED', ['ANNOTATION_DEPRECATED_ADDED'], false, 'replace', 'yellow', 'annotation'],
      ['UNCHANGED', ['ANNOTATION_DEPRECATED_ADDED'], false, 'replace', 'yellow', 'annotation'],
      ['UNCHANGED', ['CLASS_NOW_ABSTRACT'], false, 'replace', 'yellow', 'non-breaking'],
      ['UNCHANGED', [], false, undefined, undefined, undefined],
      // A type modified only through its members has no row diff.
      ['MODIFIED', [], true, undefined, undefined, undefined],
    ] as const,
  )('derives the row diff for %s with codes %s', (status, changeTypes, breaking, action, color, severity) => {
    const className = 'example.Type'
    const node = new JavaApiTreeBuilder({
      classKey: { className },
      source: javaApiDocument(javaApiElement(className, { status, changeTypes: [...changeTypes], breaking })),
    }).build().root

    expect(node).not.toBeNull()
    if (!node) throw new Error('Expected a Java class node')
    const rowDiff = JavaApiRowDiffs.takeRowDiff(node)
    if (!action) {
      expect(rowDiff).toBeUndefined()
      return
    }
    const styles = { isContentVisible: true, isHeaderVisible: true, backgroundColor: color }
    expect(rowDiff).toEqual({
      diff: {
        data: { action, type: severity },
        styles: { before: styles, after: styles },
        flags: { before: { increaseLevel: false }, after: { increaseLevel: false } },
        highlightingMode: DIFF_HIGHLIGHTING_MODES_DDL_TITLE_ROW,
      },
      diffType: severity,
    })
  })
})
