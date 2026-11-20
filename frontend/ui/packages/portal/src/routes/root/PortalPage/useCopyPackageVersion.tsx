import { useMutation } from '@tanstack/react-query'
import type { Key } from '@portal/entities/keys'
import { portalRequestJson } from '@portal/utils/requests'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { generatePath } from 'react-router-dom'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

export function useCopyPackageVersion(): [CopyPackageVersion, Key | undefined, IsLoading, IsSuccess] {
  const {
    mutate,
    data,
    isLoading,
    isSuccess,
  } = useMutation<CopyPackageVersionResponse, Error, CopyPackageVersionProps>({
    mutationFn: ({ packageKey, versionKey, value }) => copyPackageVersion(packageKey, versionKey, value),
  })

  return [mutate, data?.publishId, isLoading, isSuccess]
}

async function copyPackageVersion(
  packageKey: Key,
  versionKey: Key,
  value: Options,
): Promise<CopyPackageVersionResponse> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const pathPattern = '/packages/:packageId/versions/:versionId/copy'
  return await portalRequestJson<CopyPackageVersionResponse>(generatePath(pathPattern, { packageId, versionId }), {
    method: 'POST',
    body: JSON.stringify({
      targetPackageId: value.packageKey,
      targetVersion: value.version,
      targetPreviousVersion: value.previousVersion,
      targetStatus: value.status,
      targetVersionLabels: value.labels,
    }),
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  })
}

type CopyPackageVersion = (values: CopyPackageVersionProps) => void

type CopyPackageVersionResponse = {
  publishId: Key
}
type CopyPackageVersionProps = {
  packageKey: Key
  versionKey: Key
  value: Options
}

type Options = {
  packageKey: string
  version: string
  status: string
  previousVersion: string
  labels: string[]
}
