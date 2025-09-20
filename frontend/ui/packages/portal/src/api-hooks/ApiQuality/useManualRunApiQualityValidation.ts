import type { Key } from '@apihub/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useMutation } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import { API_LINTER_API_V1 } from './constants'
import { useInvalidateValidationSummaryByPackageVersion } from './useValidationSummaryByPackageVersion'

type ManualRunApiQualityValidation = (options: ManualRunApiQualityValidationOptions) => void

type ManualRunApiQualityValidationOptions = {
  packageId: Key
  versionId: Key
}

export function useManualRunApiQualityValidation(): [ManualRunApiQualityValidation, IsLoading] {
  const invalidateValidationSummaryByPackageVersion = useInvalidateValidationSummaryByPackageVersion()

  const { mutate, isLoading } = useMutation<void, Error, ManualRunApiQualityValidationOptions>({
    mutationFn: ({ packageId, versionId }) => manualRunApiQualityValidation(packageId, versionId),
    onSuccess: async () => {
      await invalidateValidationSummaryByPackageVersion()
    },
  })

  return [mutate, isLoading]
}

function manualRunApiQualityValidation(packageId: Key, versionId: Key): Promise<void> {
  const packageKey = encodeURIComponent(packageId)
  const versionKey = encodeURIComponent(versionId)

  const pattern = '/packages/:packageId/versions/:versionId/validation'
  const endpoint = generatePath(pattern, { packageId: packageKey, versionId: versionKey })

  return requestVoid(
    endpoint,
    { method: 'POST' },
    { basePath: API_LINTER_API_V1 }, // TODO 15.07.25 // Remove stub
  )
}
