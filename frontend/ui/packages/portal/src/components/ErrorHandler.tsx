import type { FC, PropsWithChildren, ReactElement } from 'react'
import { memo, useEffect } from 'react'
import { API_V1, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export const ErrorHandler: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  useEffect(() => {
    const errorHandler = async ({ error }: ErrorEvent): Promise<void> => await storeLogs(error)
    window.addEventListener('error', errorHandler)
    return () => window.removeEventListener('error', errorHandler)
  }, [])

  return children as ReactElement
})

async function storeLogs(
  error: Error,
): Promise<void> {
  const data = {
    name: error?.name,
    message: error?.message,
    stack: error?.stack,
    cause: error?.cause,
    url: document.location.href,
  }

  await requestVoid('/debug/logs', {
    method: 'PUT',
    body: JSON.stringify(data),
  }, {
    basePath: API_V1,
  })
}
