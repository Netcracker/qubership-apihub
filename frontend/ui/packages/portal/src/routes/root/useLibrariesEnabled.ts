import { useLibrariesBackendEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

/**
 * Libraries are served by a separate service that is not deployed everywhere. Without it every Library request
 * fails, and the Portal replaces the page with the error page, so the Library UI shows only when the backend
 * registers the `libraries-backend` extension.
 */
export function useLibrariesEnabled(): boolean {
  return useLibrariesBackendEnabled()
}
