import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import type { ServiceKey, VersionKey } from '@agents/entities/keys'
import type { BaselineVersion, Service } from '@agents/entities/services'

type BaselineVersionFlags = Readonly<{
  hasErrors: boolean
  changelogHasErrors: boolean
  apiProcessorVersion?: string
}>

export type BaselineOptions = Readonly<{
  versionKeys: ReadonlyArray<VersionKey>
  flagsByVersionKey: ReadonlyMap<VersionKey, BaselineVersionFlags>
}>

/**
 * Lists the baseline versions of all services, in the order they first appear, and combines the flags of each
 * version: the error flags, and its api-processor version when it differs from `appApiProcessorVersion`. The flags
 * come from the baseline packages of the selected services, because the snapshot uses the version as the previous
 * version of each selected service. When `selectedServiceKeys` is `undefined`, they come from every service with
 * specs, the only services a snapshot can include. When `appApiProcessorVersion` is `undefined`, no api-processor
 * version is compared.
 */
export function toBaselineOptions(
  services: ReadonlyArray<Service>,
  selectedServiceKeys: ReadonlyArray<ServiceKey> | undefined,
  appApiProcessorVersion: string | undefined,
): BaselineOptions {
  const selected = selectedServiceKeys && new Set(selectedServiceKeys)
  const versionKeys = new Set<VersionKey>()
  const flagsByVersionKey = new Map<VersionKey, BaselineVersionFlags>()

  for (const { key, specs, baseline } of services) {
    const countsFlags = selected ? selected.has(key) : isNotEmpty(specs)
    for (const version of baseline?.versions ?? []) {
      versionKeys.add(version.versionKey)
      if (countsFlags) {
        mergeVersionFlags(flagsByVersionKey, version, appApiProcessorVersion)
      }
    }
  }

  return {
    versionKeys: [...versionKeys],
    flagsByVersionKey: flagsByVersionKey,
  }
}

function mergeVersionFlags(
  flagsByVersionKey: Map<VersionKey, BaselineVersionFlags>,
  { versionKey, hasErrors, changelogHasErrors, apiProcessorVersion }: BaselineVersion,
  appApiProcessorVersion: string | undefined,
): void {
  const mismatchedApiProcessorVersion = getMismatchedApiProcessorVersion(apiProcessorVersion, appApiProcessorVersion)
  if (!hasErrors && !changelogHasErrors && !mismatchedApiProcessorVersion) {
    return
  }
  const merged = flagsByVersionKey.get(versionKey)
  flagsByVersionKey.set(versionKey, {
    hasErrors: hasErrors || (merged?.hasErrors ?? false),
    changelogHasErrors: changelogHasErrors || (merged?.changelogHasErrors ?? false),
    apiProcessorVersion: merged?.apiProcessorVersion ?? mismatchedApiProcessorVersion,
  })
}

function getMismatchedApiProcessorVersion(
  apiProcessorVersion: string | undefined,
  appApiProcessorVersion: string | undefined,
): string | undefined {
  if (!apiProcessorVersion || !appApiProcessorVersion || apiProcessorVersion === appApiProcessorVersion) {
    return undefined
  }
  return apiProcessorVersion
}
