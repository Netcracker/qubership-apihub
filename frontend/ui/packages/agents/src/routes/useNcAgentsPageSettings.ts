import { usePageSettingsState } from '@netcracker/qubership-apihub-ui-shared/hooks/storages/usePageSettingsState'

export function useNcAgentsPageSettings(): NcAgentsPageSettingsState {
  const { expandMainMenu, toggleExpandMainMenu } = usePageSettingsState()

  return {
    expandMainMenu,
    toggleExpandMainMenu,
  }
}

export type NcAgentsPageSettings = {
  expandMainMenu: boolean
}

export type NcAgentsPageSettingsCallbacks = {
  toggleExpandMainMenu: (value: boolean) => void
}

export type NcAgentsPageSettingsState = NcAgentsPageSettings & NcAgentsPageSettingsCallbacks
