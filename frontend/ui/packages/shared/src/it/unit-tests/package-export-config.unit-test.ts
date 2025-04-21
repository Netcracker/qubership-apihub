import {
  OAS_EXTENSION_KIND_DIRECT,
  OAS_EXTENSION_KIND_INHERITED,
  OAS_EXTENSION_KIND_MIXED,
  type OasExtension,
  type PackageExportConfigDto,
  separateExtensionsByInheritance,
  toOasExtensionNames,
  toOasExtensions,
} from '../../entities/package-export-config'
import { GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '../../entities/packages'

describe('toOasExtensions', () => {
  // Test direct extensions
  test('should properly handle direct extensions', () => {
    // Arrange
    const packageId = 'test.package'
    const config: PackageExportConfigDto = {
      allowedOasExtensions: [
        {
          oasExtension: 'x-extension-1',
          packageId: 'test.package',
          packageName: 'Test Package',
          packageKind: PACKAGE_KIND,
        },
        {
          oasExtension: 'x-extension-2',
          packageId: 'test.package',
          packageName: 'Test Package',
          packageKind: PACKAGE_KIND,
        },
      ],
    }

    // Act
    const result = toOasExtensions(config, packageId)

    // Assert
    expect(result).toHaveLength(2)
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'test.package-x-extension-1',
        name: 'x-extension-1',
        kind: 'direct',
      }),
      expect.objectContaining({
        key: 'test.package-x-extension-2',
        name: 'x-extension-2',
        kind: 'direct',
      }),
    ]))
  })

  // Test inherited extensions
  test('should properly handle inherited extensions', () => {
    // Arrange
    const packageId = 'aaa.bbb.ccc' // Current package (package inside group)
    const config: PackageExportConfigDto = {
      allowedOasExtensions: [
        {
          oasExtension: 'x-parent-extension',
          packageId: 'aaa.bbb', // Parent package (group inside workspace)
          packageName: 'Group',
          packageKind: GROUP_KIND,
        },
        {
          oasExtension: 'x-grandparent-extension',
          packageId: 'aaa', // Grandparent package (workspace)
          packageName: 'Workspace',
          packageKind: WORKSPACE_KIND,
        },
      ],
    }

    // Act
    const result = toOasExtensions(config, packageId)

    // Assert
    expect(result).toHaveLength(2)

    // Check both extensions are marked as inherited
    const extensions = result.map(ext => ({
      name: ext.name,
      kind: ext.kind,
      inheritances: ext.inheritances,
    }))

    expect(extensions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'x-parent-extension',
        kind: 'inherited',
        inheritances: expect.arrayContaining([
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ]),
      }),
      expect.objectContaining({
        name: 'x-grandparent-extension',
        kind: 'inherited',
        inheritances: expect.arrayContaining([
          {
            packageName: 'Workspace',
            packageKind: WORKSPACE_KIND,
          },
        ]),
      }),
    ]))
  })

  // Test mixed extensions (both direct and inherited with the same name)
  test('should mark extensions as mixed when they exist in both direct and inherited form', () => {
    // Arrange
    const packageId = 'aaa.bbb.ccc' // Current package (package inside group)
    const config: PackageExportConfigDto = {
      allowedOasExtensions: [
        {
          oasExtension: 'x-mixed-extension',
          packageId: 'aaa.bbb', // Parent package (group inside workspace)
          packageName: 'Group',
          packageKind: GROUP_KIND,
        },
        {
          oasExtension: 'x-mixed-extension',
          packageId: 'aaa.bbb.ccc', // Current package
          packageName: 'Current Package',
          packageKind: PACKAGE_KIND,
        },
      ],
    }

    // Act
    const result = toOasExtensions(config, packageId)

    // Assert
    expect(result).toHaveLength(1)

    const [mixedExtension] = result
    expect(mixedExtension.name).toBe('x-mixed-extension')
    expect(mixedExtension.kind).toBe('mixed')
    expect(mixedExtension.inheritances).toEqual([
      {
        packageName: 'Group',
        packageKind: GROUP_KIND,
      },
    ])
  })

  // Test combining multiple inheritances
  test('should combine multiple inheritances for the same extension', () => {
    // Arrange
    const packageId = 'aaa.bbb.ccc' // Current package (package inside group)
    const config: PackageExportConfigDto = {
      allowedOasExtensions: [
        {
          oasExtension: 'x-inherited-extension',
          packageId: 'aaa.bbb', // Parent package (group inside workspace)
          packageName: 'Group',
          packageKind: GROUP_KIND,
        },
        {
          oasExtension: 'x-inherited-extension',
          packageId: 'aaa', // Grandparent package (workspace)
          packageName: 'Workspace',
          packageKind: WORKSPACE_KIND,
        },
      ],
    }

    // Act
    const result = toOasExtensions(config, packageId)

    // Assert
    expect(result).toHaveLength(1)

    const [inheritedExtension] = result
    expect(inheritedExtension.name).toBe('x-inherited-extension')
    expect(inheritedExtension.kind).toBe(OAS_EXTENSION_KIND_INHERITED)
    expect(inheritedExtension.inheritances).toHaveLength(2)
    expect(inheritedExtension.inheritances).toEqual(expect.arrayContaining([
      {
        packageName: 'Group',
        packageKind: GROUP_KIND,
      },
      {
        packageName: 'Workspace',
        packageKind: WORKSPACE_KIND,
      },
    ]))
  })

  // Test sorting
  test('should sort extensions with inherited first, then by name', () => {
    // Arrange
    const packageId = 'aaa.bbb.ccc' // Current package (package inside group)
    const config: PackageExportConfigDto = {
      allowedOasExtensions: [
        {
          oasExtension: 'x-z-direct-extension',
          packageId: 'aaa.bbb.ccc', // Current package
          packageName: 'Current Package',
          packageKind: PACKAGE_KIND,
        },
        {
          oasExtension: 'x-b-inherited-extension',
          packageId: 'aaa.bbb', // Parent package (group inside workspace)
          packageName: 'Group',
          packageKind: GROUP_KIND,
        },
        {
          oasExtension: 'x-a-direct-extension',
          packageId: 'aaa.bbb.ccc', // Current package
          packageName: 'Current Package',
          packageKind: PACKAGE_KIND,
        },
        {
          oasExtension: 'x-c-inherited-extension',
          packageId: 'aaa', // Grandparent package (workspace)
          packageName: 'Workspace',
          packageKind: WORKSPACE_KIND,
        },
      ],
    }

    // Act
    const result = toOasExtensions(config, packageId)

    // Assert
    expect(result).toHaveLength(4)

    // First should be inherited, sorted by name
    expect(result[0].name).toBe('x-b-inherited-extension')
    expect(result[0].kind).toBe(OAS_EXTENSION_KIND_INHERITED)

    expect(result[1].name).toBe('x-c-inherited-extension')
    expect(result[1].kind).toBe(OAS_EXTENSION_KIND_INHERITED)

    // Then direct, sorted by name
    expect(result[2].name).toBe('x-a-direct-extension')
    expect(result[2].kind).toBe(OAS_EXTENSION_KIND_DIRECT)

    expect(result[3].name).toBe('x-z-direct-extension')
    expect(result[3].kind).toBe(OAS_EXTENSION_KIND_DIRECT)
  })
})

describe('toOasExtensionNames', () => {
  test('should return array of names for valid extensions', () => {
    // Arrange
    const extensions: OasExtension[] = [
      {
        key: 'key1',
        name: 'x-extension-1',
        kind: OAS_EXTENSION_KIND_DIRECT,
      },
      {
        key: 'key2',
        name: 'x-extension-2',
        kind: OAS_EXTENSION_KIND_INHERITED,
        inheritances: [
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ],
      },
      {
        key: 'key3',
        name: 'x-extension-3',
        kind: OAS_EXTENSION_KIND_MIXED,
        inheritances: [
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ],
      },
    ]

    // Act
    const names = toOasExtensionNames(extensions)

    // Assert
    expect(names).toEqual(['x-extension-1', 'x-extension-2', 'x-extension-3'])
  })

  test('should return empty array for empty extensions', () => {
    // Arrange
    const extensions: OasExtension[] = []

    // Act
    const names = toOasExtensionNames(extensions)

    // Assert
    expect(names).toEqual([])
  })
})

describe('separateExtensionsByInheritance', () => {
  test('should separate extensions by inheritance kind', () => {
    // Arrange
    const extensions: OasExtension[] = [
      {
        key: 'key1',
        name: 'x-direct-extension',
        kind: OAS_EXTENSION_KIND_DIRECT,
      },
      {
        key: 'key2',
        name: 'x-inherited-extension',
        kind: OAS_EXTENSION_KIND_INHERITED,
        inheritances: [
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ],
      },
      {
        key: 'key3',
        name: 'x-mixed-extension',
        kind: OAS_EXTENSION_KIND_MIXED,
        inheritances: [
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ],
      },
    ]

    // Act
    const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(extensions)

    // Assert
    expect(inheritedExtensions).toHaveLength(1)
    expect(nonInheritedExtensions).toHaveLength(2)

    expect(inheritedExtensions[0].name).toBe('x-inherited-extension')
    expect(inheritedExtensions[0].kind).toBe(OAS_EXTENSION_KIND_INHERITED)

    expect(nonInheritedExtensions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'x-direct-extension',
        kind: OAS_EXTENSION_KIND_DIRECT,
      }),
      expect.objectContaining({
        name: 'x-mixed-extension',
        kind: OAS_EXTENSION_KIND_MIXED,
      }),
    ]))
  })

  test('should handle empty extensions array', () => {
    // Arrange
    const extensions: OasExtension[] = []

    // Act
    const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(extensions)

    // Assert
    expect(inheritedExtensions).toHaveLength(0)
    expect(nonInheritedExtensions).toHaveLength(0)
  })

  test('should handle array with only inherited extensions', () => {
    // Arrange
    const extensions: OasExtension[] = [
      {
        key: 'key1',
        name: 'x-inherited-extension-1',
        kind: OAS_EXTENSION_KIND_INHERITED,
        inheritances: [
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ],
      },
      {
        key: 'key2',
        name: 'x-inherited-extension-2',
        kind: OAS_EXTENSION_KIND_INHERITED,
        inheritances: [
          {
            packageName: 'Workspace',
            packageKind: WORKSPACE_KIND,
          },
        ],
      },
    ]

    // Act
    const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(extensions)

    // Assert
    expect(inheritedExtensions).toHaveLength(2)
    expect(nonInheritedExtensions).toHaveLength(0)

    expect(inheritedExtensions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'x-inherited-extension-1',
        kind: OAS_EXTENSION_KIND_INHERITED,
      }),
      expect.objectContaining({
        name: 'x-inherited-extension-2',
        kind: OAS_EXTENSION_KIND_INHERITED,
      }),
    ]))
  })

  test('should handle array with only non-inherited extensions', () => {
    // Arrange
    const extensions: OasExtension[] = [
      {
        key: 'key1',
        name: 'x-direct-extension',
        kind: OAS_EXTENSION_KIND_DIRECT,
      },
      {
        key: 'key2',
        name: 'x-mixed-extension',
        kind: OAS_EXTENSION_KIND_MIXED,
        inheritances: [
          {
            packageName: 'Group',
            packageKind: GROUP_KIND,
          },
        ],
      },
    ]

    // Act
    const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(extensions)

    // Assert
    expect(inheritedExtensions).toHaveLength(0)
    expect(nonInheritedExtensions).toHaveLength(2)

    expect(nonInheritedExtensions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'x-direct-extension',
        kind: OAS_EXTENSION_KIND_DIRECT,
      }),
      expect.objectContaining({
        name: 'x-mixed-extension',
        kind: OAS_EXTENSION_KIND_MIXED,
      }),
    ]))
  })
})
