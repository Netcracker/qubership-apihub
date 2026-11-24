import type { ExtendedPageSettingsState } from '@netcracker/qubership-apihub-ui-shared/hooks/storages/usePageSettingsState'
import { usePageSettingsState } from '@netcracker/qubership-apihub-ui-shared/hooks/storages/usePageSettingsState'

export function usePortalPageSettings(): ExtendedPageSettingsState {
  return usePageSettingsState()
}
