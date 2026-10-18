import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { groupBy, isNotEmpty, sortByProperty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ExportConfig, OasExtension } from '../../useExportConfig'

export type OasSettingsExtension = {
  key: Key
  name: string
  kind: OasSettingsExtensionKinds
  inheritances?: InheritanceSources
}

export type OasSettingsExtensions = ReadonlyArray<OasSettingsExtension>

export const OAS_EXTENSION_PREFIX = 'x-' as const
export const OAS_EXTENSION_KIND_INHERITED = 'inherited' as const
export const OAS_EXTENSION_KIND_MIXED = 'mixed' as const
export const OAS_EXTENSION_KIND_DIRECT = 'direct' as const

export type OasSettingsExtensionKinds =
  typeof OAS_EXTENSION_KIND_INHERITED |
  typeof OAS_EXTENSION_KIND_MIXED |
  typeof OAS_EXTENSION_KIND_DIRECT

export type InheritanceSource = {
  packageName: string
  packageKind: PackageKind
}

export type InheritanceSources = ReadonlyArray<InheritanceSource>

/**
 * Converts a PackageExportConfigDto to an array of OasExtensions
 * @param config The export config DTO to convert
 * @param packageKey The current package ID
 * @returns Array of OAS extensions with inheritance information
 */
export const toOasSettingsExtensions = (config: ExportConfig, packageKey: Key): OasSettingsExtensions => {
  // Step 1: Categorize extensions by source
  const { direct, inherited } = categorizeExtensionsBySource(config.allowedOasExtensions, packageKey)

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
export const toOasExtensionNames = (extensions: OasSettingsExtensions): string[] => {
  return extensions.map(extension => extension.name)
}

/**
 * Separates OAS extensions into inherited and non-inherited groups
 * @param extensions The extensions to separate
 * @returns Object containing arrays of inherited and non-inherited extensions
 */
export const separateExtensionsByInheritance = (extensions: OasSettingsExtensions): {
  inheritedExtensions: OasSettingsExtensions
  nonInheritedExtensions: OasSettingsExtensions
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
const toOasExtension = (oasExtension: OasExtension, packageId: Key): OasSettingsExtension => {
  const isInherited = oasExtension.packageKey !== packageId

  if (!isInherited) {
    return {
      key: `${oasExtension.packageKey}-${oasExtension.oasExtension}`,
      name: oasExtension.oasExtension,
      kind: OAS_EXTENSION_KIND_DIRECT,
    }
  }

  return {
    key: `${oasExtension.packageKey}-${oasExtension.oasExtension}`,
    name: oasExtension.oasExtension,
    kind: OAS_EXTENSION_KIND_INHERITED,
    inheritances: [{
      packageName: oasExtension.packageName,
      packageKind: oasExtension.packageKind,
    }],
  }
}

/**
 * Categorizes extensions into direct and inherited arrays
 */
const categorizeExtensionsBySource = (
  oasExtensions: ReadonlyArray<OasExtension>,
  packageId: Key,
): {
  direct: OasSettingsExtensions
  inherited: OasSettingsExtensions
} => {
  return oasExtensions.reduce((result, extension) => {
    const mappedExtension = toOasExtension(extension, packageId)
    const categoryKey = mappedExtension.kind === OAS_EXTENSION_KIND_INHERITED ? OAS_EXTENSION_KIND_INHERITED : OAS_EXTENSION_KIND_DIRECT

    return {
      ...result,
      [categoryKey]: [...result[categoryKey], mappedExtension],
    }
  }, { direct: [] as OasSettingsExtension[], inherited: [] as OasSettingsExtension[] })
}

const oasExtensionNameProperty = 'name'

/**
 * Combines inherited OAS extensions with the same name, merging their inheritances
 */
const combineInheritedExtensions = (
  inheritedExtensions: OasSettingsExtensions,
): OasSettingsExtensions => {
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
const collectInheritanceSources = (extensions: OasSettingsExtensions): InheritanceSources => {
  return extensions.flatMap(extension =>
    (hasInheritances(extension) ? extension.inheritances : []),
  )
}

const hasInheritances = (extension: OasSettingsExtension): extension is OasSettingsExtension & {
  inheritances: InheritanceSources
} => {
  return isNotEmpty(extension.inheritances)
}

/**
 * Merges inherited and direct OAS extensions, handling the mixed case
 */
const mergeCategorizedExtensions = (
  inherited: OasSettingsExtensions,
  direct: OasSettingsExtensions,
): OasSettingsExtensions => {
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

const createMixedExtension = (extension: OasSettingsExtension): OasSettingsExtension => {
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
const sortExtensionsByGroup = (extensions: OasSettingsExtensions): OasSettingsExtensions => {
  const { inheritedExtensions, nonInheritedExtensions } = separateExtensionsByInheritance(extensions)

  return [
    ...sortByProperty(inheritedExtensions, oasExtensionNameProperty),
    ...sortByProperty(nonInheritedExtensions, oasExtensionNameProperty),
  ]
}
