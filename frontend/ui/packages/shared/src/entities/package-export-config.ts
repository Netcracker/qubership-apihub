import type { Key } from './keys'
import type { PackageKind } from './packages'
import { groupBy, isNotEmpty, sortByProperty } from '../utils/arrays'

export type PackageExportConfigDto = {
  allowedOasExtensions: ReadonlyArray<OasExtensionDto>
}

export type UpdatePackageExportConfigDto = {
  allowedOasExtensions: ReadonlyArray<string>
}

export type OasExtensionDto = Readonly<{
  oasExtension: string
  packageId: string
  packageName: string
  packageKind: PackageKind
}>

export const OAS_EXTENSION_PREFIX = 'x-' as const
export const OAS_EXTENSION_KIND_INHERITED = 'inherited' as const
export const OAS_EXTENSION_KIND_MIXED = 'mixed' as const
export const OAS_EXTENSION_KIND_DIRECT = 'direct' as const

export type OasExtensionKinds =
  typeof OAS_EXTENSION_KIND_INHERITED |
  typeof OAS_EXTENSION_KIND_MIXED |
  typeof OAS_EXTENSION_KIND_DIRECT

export type OasExtension = {
  key: Key
  name: string
  kind: OasExtensionKinds
  inheritances?: InheritanceSources
}

export type OasExtensions = ReadonlyArray<OasExtension>

export type InheritanceSource = {
  packageName: string
  packageKind: PackageKind
}

export type InheritanceSources = ReadonlyArray<InheritanceSource>

/**
 * Converts a PackageExportConfigDto to an array of OasExtensions
 * @param config The export config DTO to convert
 * @param packageId The current package ID
 * @returns Array of OAS extensions with inheritance information
 */
export const toOasExtensions = (config: PackageExportConfigDto, packageId: Key): OasExtensions => {
  // Step 1: Categorize extensions by source
  const { direct, inherited } = categorizeExtensionsBySource(config.allowedOasExtensions, packageId)

  // Step 2: Combine inherited extensions
  const processedInherited = combineInheritedExtensions(inherited)

  // Step 3: Merge the two sets, handling mixed cases
  const mergedExtensions = mergeCategorizedExtensions(processedInherited, direct)

  // Step 4: Sort by groups for display
  return sortExtensionsByGroup(mergedExtensions)
}

/**
 * Extracts just the extension names from an array of OasExtensions
 * @param extensions The extensions to get names from
 * @returns Array of OAS extension name strings
 */
export const toOasExtensionNames = (extensions: OasExtensions): string[] => {
  return extensions.map(extension => extension.name)
}

/**
 * Separates OAS extensions into inherited and non-inherited groups
 * @param extensions The extensions to separate
 * @returns Object containing arrays of inherited and non-inherited extensions
 */
export const separateExtensionsByInheritance = (extensions: OasExtensions): {
  inheritedExtensions: OasExtensions
  nonInheritedExtensions: OasExtensions
} => {
  const inheritedExtensions = extensions.filter(extension => extension.kind === OAS_EXTENSION_KIND_INHERITED)
  const nonInheritedExtensions = extensions.filter(extension => extension.kind !== OAS_EXTENSION_KIND_INHERITED)

  return {
    inheritedExtensions,
    nonInheritedExtensions,
  }
}

/**
 * Maps a DTO extension to an OasExtension with correct inheritance data
 */
const toOasExtension = (extensionDto: OasExtensionDto, packageId: Key): OasExtension => {
  const isInherited = extensionDto.packageId !== packageId

  if (!isInherited) {
    return {
      key: `${extensionDto.packageId}-${extensionDto.oasExtension}`,
      name: extensionDto.oasExtension,
      kind: OAS_EXTENSION_KIND_DIRECT,
    }
  }

  return {
    key: `${extensionDto.packageId}-${extensionDto.oasExtension}`,
    name: extensionDto.oasExtension,
    kind: OAS_EXTENSION_KIND_INHERITED,
    inheritances: [{
      packageName: extensionDto.packageName,
      packageKind: extensionDto.packageKind,
    }],
  }
}

/**
 * Categorizes extensions into direct and inherited arrays
 */
const categorizeExtensionsBySource = (
  extensionDtos: ReadonlyArray<OasExtensionDto>,
  packageId: Key,
): {
  direct: OasExtensions
  inherited: OasExtensions
} => {
  return extensionDtos.reduce((result, extension) => {
    const mappedExtension = toOasExtension(extension, packageId)
    const categoryKey = mappedExtension.kind === OAS_EXTENSION_KIND_INHERITED ? OAS_EXTENSION_KIND_INHERITED : OAS_EXTENSION_KIND_DIRECT

    return {
      ...result,
      [categoryKey]: [...result[categoryKey], mappedExtension],
    }
  }, { direct: [] as OasExtension[], inherited: [] as OasExtension[] })
}

const oasExtensionNameProperty = 'name'

/**
 * Combines inherited OAS extensions with the same name, merging their inheritances
 */
const combineInheritedExtensions = (
  inheritedExtensions: OasExtensions,
): OasExtensions => {
  const grouped = groupBy(inheritedExtensions, oasExtensionNameProperty)

  return Object.values(grouped).map(extensions => {
    if (extensions.length === 1) return extensions[0]

    const [baseExtension] = extensions
    const inheritanceSources = collectInheritanceSources(extensions)

    return {
      key: baseExtension.key,
      name: baseExtension.name,
      kind: OAS_EXTENSION_KIND_INHERITED,
      inheritances: inheritanceSources,
    }
  })
}

/**
 * Collects all inheritance sources from multiple extensions
 */
const collectInheritanceSources = (extensions: OasExtensions): InheritanceSources => {
  return extensions.flatMap(extension =>
    (hasInheritances(extension) ? extension.inheritances : []),
  )
}

const hasInheritances = (extension: OasExtension): extension is OasExtension & {
  inheritances: InheritanceSources
} => {
  return isNotEmpty(extension.inheritances)
}

/**
 * Merges inherited and direct OAS extensions, handling the mixed case
 */
const mergeCategorizedExtensions = (
  inherited: OasExtensions,
  direct: OasExtensions,
): OasExtensions => {
  const initialMap = new Map(
    inherited.map(extension => [extension.name, extension]),
  )

  direct.forEach(directExtension => {
    const existingExtension = initialMap.get(directExtension.name)
    initialMap.set(
      directExtension.name,
      existingExtension
        ? createMixedExtension(existingExtension)
        : directExtension,
    )
  })

  return Array.from(initialMap.values())
}

const createMixedExtension = (extension: OasExtension): OasExtension => {
  return {
    key: extension.key,
    name: extension.name,
    kind: OAS_EXTENSION_KIND_MIXED,
    ...(hasInheritances(extension) ? { inheritances: extension.inheritances } : {}),
  }
}

/**
 * Sorts OAS extensions by inheritance group and then by name within each group
 */
const sortExtensionsByGroup = (extensions: OasExtensions): OasExtensions => {
  const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(extensions)

  return [
    ...sortByProperty(inheritedExtensions, oasExtensionNameProperty),
    ...sortByProperty(nonInheritedExtensions, oasExtensionNameProperty),
  ]
}
