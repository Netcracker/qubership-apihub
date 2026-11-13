import { createBuildingServiceLogger, JavaApiTreeBuilder } from '../src'
import { javaApiDocument, javaApiElement, loadJavaApiSample } from './helpers/javaapi-fixtures'

describe('Java API class tree', () => {
  it('groups members in Javadoc order, separating enum constants and parsing erased signatures', () => {
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
    const className = 'org.qubership.integration.platform.catalog.model.deployment.update.DeploymentInfo'
    const enclosingRoot = new JavaApiTreeBuilder({ source, classKey: { className } }).build().root
    const nestedSection = enclosingRoot?.childrenNodes().find(section => section.key === 'nested-classes')

    expect(nestedSection?.childrenNodes().map(member => member.value())).toMatchObject([
      { name: 'DeploymentInfo.DeploymentInfoBuilder', className: `${className}$DeploymentInfoBuilder` },
    ])

    const nestedRoot = new JavaApiTreeBuilder({
      source,
      classKey: { className: `${className}$DeploymentInfoBuilder` },
    }).build().root

    expect(nestedRoot?.value()).toMatchObject({
      displayName: 'DeploymentInfo.DeploymentInfoBuilder',
      packageName: 'org.qubership.integration.platform.catalog.model.deployment.update',
      enclosingClassName: className,
    })
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
})
