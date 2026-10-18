import { API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CONTRACT_TYPE_DDL, CONTRACT_TYPE_MCP } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'

import { buildVersionTabsApiTypesState } from './buildVersionTabsApiTypesState'
import { VERSION_TAB_IDS } from './version-tab-allowed-api-types'

const DEFAULT_INPUT = {
  publishedApiTypes: [API_TYPE_REST, CONTRACT_TYPE_MCP] as const,
  isLoading: false,
  previousVersion: 'previous-version' as const,
  linterEnabled: true,
  apiQualityTooltip: undefined,
}

describe('buildVersionTabsApiTypesState', () => {
  test('derives tab api types and defaults from published types', () => {
    const state = buildVersionTabsApiTypesState(DEFAULT_INPUT)

    expect(state.tabs[VERSION_TAB_IDS.contracts].allowedApiTypes).toEqual([API_TYPE_REST, CONTRACT_TYPE_MCP])
    expect(state.tabs[VERSION_TAB_IDS.contracts].defaultApiType).toBe(API_TYPE_REST)
    expect(state.tabs[VERSION_TAB_IDS.apiChanges].allowedApiTypes).toEqual([API_TYPE_REST])
  })

  test('does not disable tabs while loading', () => {
    const state = buildVersionTabsApiTypesState({
      ...DEFAULT_INPUT,
      publishedApiTypes: [],
      isLoading: true,
    })

    expect(state.tabs[VERSION_TAB_IDS.contracts].disabled).toBe(false)
    expect(state.tabs[VERSION_TAB_IDS.apiChanges].disabled).toBe(false)
  })

  test('disables tabs with empty allowed api types after loading', () => {
    const state = buildVersionTabsApiTypesState({
      ...DEFAULT_INPUT,
      publishedApiTypes: [CONTRACT_TYPE_MCP],
      isLoading: false,
    })

    expect(state.tabs[VERSION_TAB_IDS.contracts].disabled).toBe(false)
    expect(state.tabs[VERSION_TAB_IDS.apiChanges].disabled).toBe(true)
    expect(state.tabs[VERSION_TAB_IDS.deprecated].disabled).toBe(true)
  })

  test('disables apiChanges without previous version', () => {
    const state = buildVersionTabsApiTypesState({
      ...DEFAULT_INPUT,
      previousVersion: undefined,
    })

    expect(state.tabs[VERSION_TAB_IDS.apiChanges].disabled).toBe(true)
    expect(state.tabs[VERSION_TAB_IDS.apiChanges].tooltip)
      .toBe('No API changes since there is no previous version')
  })

  test('disables apiQuality when linter is off or validation tooltip is set', () => {
    expect(
      buildVersionTabsApiTypesState({ ...DEFAULT_INPUT, linterEnabled: false })
        .tabs[VERSION_TAB_IDS.apiQuality].disabled,
    ).toBe(true)
    expect(
      buildVersionTabsApiTypesState({
        ...DEFAULT_INPUT,
        apiQualityTooltip: 'API quality check is in progress',
      }).tabs[VERSION_TAB_IDS.apiQuality].disabled,
    ).toBe(true)
  })

  test('enables apiChanges and disables deprecated for DDL-only versions', () => {
    const state = buildVersionTabsApiTypesState({
      ...DEFAULT_INPUT,
      publishedApiTypes: [CONTRACT_TYPE_DDL],
    })

    expect(state.tabs[VERSION_TAB_IDS.apiChanges].disabled).toBe(false)
    expect(state.tabs[VERSION_TAB_IDS.apiChanges].defaultApiType).toBe(CONTRACT_TYPE_DDL)
    expect(state.tabs[VERSION_TAB_IDS.deprecated].disabled).toBe(true)
  })
})
