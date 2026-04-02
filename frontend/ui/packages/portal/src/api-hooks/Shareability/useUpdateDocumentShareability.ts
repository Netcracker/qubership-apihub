import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { generatePath } from 'react-router-dom'

import type { ShareabilityStatus } from '@netcracker/qubership-apihub-api-processor'
import { portalRequestVoid } from '@netcracker/qubership-apihub-ui-portal/src/utils/requests'
import { DOCUMENT_QUERY_KEY } from '../../routes/root/PortalPage/VersionPage/useDocument'
import { DOCUMENTS_QUERY_KEY } from '../../routes/root/PortalPage/VersionPage/useDocuments'

type UseUpdateDocumentShareabilityResult = {
  updateShareability: (status: ShareabilityStatus) => void
  isPending: boolean
}

export function useUpdateDocumentShareability(
  packageId: string,
  version: string,
  slug: string,
): UseUpdateDocumentShareabilityResult {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation<void, Error, ShareabilityStatus>({
    mutationFn: (status) => patchShareability(packageId, version, slug, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [DOCUMENTS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [DOCUMENT_QUERY_KEY, packageId] })
    },
  })

  const updateShareability = useCallback((status: ShareabilityStatus) => mutate(status), [mutate])

  return {
    updateShareability,
    isPending,
  }
}

async function patchShareability(
  packageId: string,
  version: string,
  slug: string,
  status: ShareabilityStatus,
): Promise<void> {
  const packageKey = encodeURIComponent(packageId)
  const versionKey = encodeURIComponent(version)
  const docSlug = encodeURIComponent(slug)

  await portalRequestVoid(
    generatePath('/packages/:packageKey/versions/:versionKey/documents/:docSlug/shareability', {
      packageKey,
      versionKey,
      docSlug,
    }),
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  )
}
