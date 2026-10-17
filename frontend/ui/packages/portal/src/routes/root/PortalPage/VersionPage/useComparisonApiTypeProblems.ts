import { useMemo } from 'react'

import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { ContractType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  type ApiTypeProblemDetails,
  resolveVersionApiTypeProblemsMap,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/apiTypeProblemDetails'

import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import { usePackageVersionContent } from '@portal/routes/root/usePackageVersionContent'

type UseComparisonApiTypeProblemsParams = {
  originPackageKey?: PackageKey
  originVersionKey?: VersionKey
  changedPackageKey?: PackageKey
  changedVersionKey?: VersionKey
  allowedApiTypes?: ReadonlyArray<ApiType | ContractType>
  enabled?: boolean
}

export function useComparisonApiTypeProblems(
  params: UseComparisonApiTypeProblemsParams,
): Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>> {
  const {
    originPackageKey,
    originVersionKey,
    changedPackageKey,
    changedVersionKey,
    allowedApiTypes = [],
    enabled = true,
  } = params

  const { versionContent: originContent } = usePackageVersionContent({
    packageKey: originPackageKey,
    versionKey: originVersionKey,
    includeSummary: true,
    enabled: enabled && Boolean(originPackageKey) && Boolean(originVersionKey),
  })

  const { versionContent: changedContent } = usePackageVersionContent({
    packageKey: changedPackageKey,
    versionKey: changedVersionKey,
    includeSummary: true,
    enabled: enabled && Boolean(changedPackageKey) && Boolean(changedVersionKey),
  })

  return useMemo(() => {
    if (!originVersionKey || !changedVersionKey) {
      return {}
    }

    const originProblems = resolveVersionApiTypeProblemsMap({
      allowedApiTypes: allowedApiTypes,
      operationTypes: originContent?.operationTypes,
      contractsSummary: originContent?.contractsSummary,
      versionKey: getSplittedVersionKey(originVersionKey, originContent?.latestRevision).versionKey,
    })

    const changedProblems = resolveVersionApiTypeProblemsMap({
      allowedApiTypes: allowedApiTypes,
      operationTypes: changedContent?.operationTypes,
      contractsSummary: changedContent?.contractsSummary,
      versionKey: getSplittedVersionKey(changedVersionKey, changedContent?.latestRevision).versionKey,
    })

    const merged: Partial<Record<ApiType | ContractType, ApiTypeProblemDetails>> = {}

    for (const type of allowedApiTypes) {
      const originProblem = originProblems[type]
      const changedProblem = changedProblems[type]

      if (changedProblem?.hasProblems) {
        merged[type] = changedProblem
      } else if (originProblem?.hasProblems) {
        merged[type] = originProblem
      }
    }

    return merged
  }, [allowedApiTypes, changedContent, changedVersionKey, originContent, originVersionKey])
}
