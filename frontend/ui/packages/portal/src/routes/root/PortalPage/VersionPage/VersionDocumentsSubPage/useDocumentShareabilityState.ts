import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebounce } from 'react-use'

import type { ShareabilityStatus } from '@netcracker/qubership-apihub-api-processor'
import { useDocumentShareabilityRefetching } from '@netcracker/qubership-apihub-ui-portal/src/api-hooks/Shareability/useDocumentShareabilityRefetching'
import { useUpdateDocumentShareability } from '@netcracker/qubership-apihub-ui-portal/src/api-hooks/Shareability/useUpdateDocumentShareability'
import { DOCUMENT_SHAREABILITY_MANAGEMENT_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { usePackage } from '../../../usePackage'
import { useVersionWithRevision } from '../../../useVersionWithRevision'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'

type UseDocumentShareabilityStateResult = {
  hasPermission: boolean
  packageKey: string | undefined
  fullVersion: string
  isShareabilityStatusLoading: boolean
  handleChange: (value: ShareabilityStatus) => void
}

export function useDocumentShareabilityState(slug: string): UseDocumentShareabilityStateResult {
  const [packageKey, packageVersion] = usePackageParamsWithRef()
  const [targetPackage] = usePackage({
    packageKey: packageKey,
    showParents: false,
    hideError: true,
  })

  const hasPermission = useMemo(
    () => !!targetPackage?.permissions?.includes(DOCUMENT_SHAREABILITY_MANAGEMENT_PERMISSION),
    [targetPackage?.permissions],
  )
  const { fullVersion } = useVersionWithRevision(packageVersion, packageKey)

  const { isDocumentsListRefetching, isDocumentRefetching } = useDocumentShareabilityRefetching(
    packageKey,
    fullVersion,
    slug,
  )

  const { updateShareability, isPending: isShareabilityUpdating } = useUpdateDocumentShareability(
    packageKey!,
    fullVersion,
    slug,
  )

  const isShareabilityStatusUpdating = isShareabilityUpdating ||
    isDocumentsListRefetching ||
    isDocumentRefetching

  const [isShareabilityStatusLoading, setShareabilityStatusLoading] = useState(false)

  useDebounce(
    () => {
      setShareabilityStatusLoading(isShareabilityStatusUpdating)
    },
    DEFAULT_DEBOUNCE,
    [isShareabilityStatusUpdating],
  )

  useEffect(() => {
    if (!isShareabilityStatusUpdating) {
      setShareabilityStatusLoading(false)
    }
  }, [isShareabilityStatusUpdating])

  const handleChange = useCallback(
    (value: ShareabilityStatus) => updateShareability(value),
    [updateShareability],
  )

  return {
    hasPermission,
    packageKey,
    fullVersion,
    isShareabilityStatusLoading,
    handleChange,
  }
}
