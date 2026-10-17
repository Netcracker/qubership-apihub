import { useSystemInfo } from '../../features/system-info/api/useSystemInfo'
import { useAppApiProcessorVersion } from '../frontend-version/useVersionInfo'
import type { VersionProblemProcessorContext } from './versionProblemDetails'

export function useVersionProblemProcessorContext(): VersionProblemProcessorContext {
  const apiProcessorVersion = useAppApiProcessorVersion()
  const { migrationInProgress } = useSystemInfo()

  return {
    appApiProcessorVersion: apiProcessorVersion,
    migrationInProgress: migrationInProgress,
  }
}
