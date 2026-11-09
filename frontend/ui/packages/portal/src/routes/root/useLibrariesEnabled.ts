import { useLibrariesBackendEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

// The local Library mock of `dev:backend`, switched on in the ignored `.env.local` (see docs/dev/local-development.md)
const LOCAL_LIBRARIES_ENABLED = import.meta.env.DEV && import.meta.env.VITE_LOCAL_LIBRARIES === 'true'

/**
 * Libraries are served by a separate service that is not deployed everywhere. Without it every Library request
 * fails, and the Portal replaces the page with the error page, so the Library UI shows only when the backend
 * registers the `libraries-backend` extension, or in local development with the mock.
 */
export function useLibrariesEnabled(): boolean {
  const isBackendEnabled = useLibrariesBackendEnabled()
  return isBackendEnabled || LOCAL_LIBRARIES_ENABLED
}
