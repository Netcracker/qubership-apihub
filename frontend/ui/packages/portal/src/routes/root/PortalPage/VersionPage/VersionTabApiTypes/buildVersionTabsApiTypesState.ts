import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import {
  getDefaultApiTypeFromTabApiTypes,
  isTabApiTypesEmpty,
  type PublishedApiTypes,
  resolveTabApiTypes,
  type ResolveTabApiTypesContext,
  type TabAllowedApiType,
  VERSION_TAB_IDS,
  type VersionTabId,
} from './version-tab-allowed-api-types'

export type VersionTabApiTypesState = {
  allowedApiTypes: ReadonlyArray<TabAllowedApiType>
  defaultApiType: ApiType | ContractType | undefined
  disabled: boolean
  tooltip?: string
}

export type VersionTabsApiTypesState = {
  publishedApiTypes: PublishedApiTypes
  isLoading: IsLoading
  productionMode: boolean
  tabs: Record<VersionTabId, VersionTabApiTypesState>
}

export type BuildVersionTabsApiTypesStateInput = {
  publishedApiTypes: PublishedApiTypes
  isLoading: IsLoading
  productionMode: boolean
  previousVersion: Key | undefined
  linterEnabled: boolean
  apiQualityTooltip: string | undefined
}

const API_CHANGES_NO_PREVIOUS_VERSION_TOOLTIP = 'No API changes since there is no previous version'

export function buildVersionTabsApiTypesState(
  input: BuildVersionTabsApiTypesStateInput,
): VersionTabsApiTypesState {
  const resolveContext: ResolveTabApiTypesContext = { productionMode: input.productionMode }

  const contractsAllowedApiTypes = resolveTabApiTypes(
    VERSION_TAB_IDS.contracts,
    input.publishedApiTypes,
    resolveContext,
  )
  const apiChangesAllowedApiTypes = resolveTabApiTypes(
    VERSION_TAB_IDS.apiChanges,
    input.publishedApiTypes,
    resolveContext,
  )
  const deprecatedAllowedApiTypes = resolveTabApiTypes(
    VERSION_TAB_IDS.deprecated,
    input.publishedApiTypes,
    resolveContext,
  )
  const apiQualityAllowedApiTypes = resolveTabApiTypes(
    VERSION_TAB_IDS.apiQuality,
    input.publishedApiTypes,
    resolveContext,
  )

  const hasNoPreviousVersion = input.previousVersion === undefined
  const apiQualityDisabledByLinter = !input.linterEnabled
  const hasApiQualityTooltip = input.apiQualityTooltip !== undefined

  return {
    publishedApiTypes: input.publishedApiTypes,
    isLoading: input.isLoading,
    productionMode: input.productionMode,
    tabs: {
      [VERSION_TAB_IDS.contracts]: toVersionTabApiTypesState(
        contractsAllowedApiTypes,
        isTabDisabledByEmptyApiTypes(contractsAllowedApiTypes, input.isLoading),
      ),
      [VERSION_TAB_IDS.apiChanges]: toVersionTabApiTypesState(
        apiChangesAllowedApiTypes,
        isTabDisabledByEmptyApiTypes(apiChangesAllowedApiTypes, input.isLoading) || hasNoPreviousVersion,
        hasNoPreviousVersion ? API_CHANGES_NO_PREVIOUS_VERSION_TOOLTIP : undefined,
      ),
      [VERSION_TAB_IDS.deprecated]: toVersionTabApiTypesState(
        deprecatedAllowedApiTypes,
        isTabDisabledByEmptyApiTypes(deprecatedAllowedApiTypes, input.isLoading),
      ),
      [VERSION_TAB_IDS.apiQuality]: toVersionTabApiTypesState(
        apiQualityAllowedApiTypes,
        isTabDisabledByEmptyApiTypes(apiQualityAllowedApiTypes, input.isLoading) ||
          apiQualityDisabledByLinter ||
          hasApiQualityTooltip,
        input.apiQualityTooltip,
      ),
    },
  }
}

function toVersionTabApiTypesState(
  allowedApiTypes: ReadonlyArray<TabAllowedApiType>,
  disabled: boolean,
  tooltip?: string,
): VersionTabApiTypesState {
  return {
    allowedApiTypes: allowedApiTypes,
    defaultApiType: getDefaultApiTypeFromTabApiTypes(allowedApiTypes),
    disabled: disabled,
    tooltip: tooltip,
  }
}

function isTabDisabledByEmptyApiTypes(
  allowedApiTypes: PublishedApiTypes,
  isLoading: IsLoading,
): boolean {
  if (isLoading) {
    return false
  }
  return isTabApiTypesEmpty(allowedApiTypes)
}
