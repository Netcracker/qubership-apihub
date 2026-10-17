import { useApiProcessorVersion } from '../package-version-content/usePackageVersionContent'
import { useVersionProblemProcessorContext } from './useVersionProblemProcessorContext'
import {
  resolveVersionProblemDetails,
  type UseVersionProblemDetailsParams,
  type VersionProblemDetails,
} from './versionProblemDetails'

export function useVersionProblemDetails(
  params: UseVersionProblemDetailsParams,
): VersionProblemDetails {
  const { apiProcessorVersion: providedApiProcessorVersion, packageKey, versionKey } = params
  const processorContext = useVersionProblemProcessorContext()
  const fetchedApiProcessorVersion = useApiProcessorVersion({
    packageKey: providedApiProcessorVersion === undefined ? packageKey : undefined,
    versionKey: providedApiProcessorVersion === undefined ? versionKey : undefined,
  })

  return resolveVersionProblemDetails({
    ...params,
    ...processorContext,
    apiProcessorVersion: providedApiProcessorVersion ?? fetchedApiProcessorVersion,
  })
}
