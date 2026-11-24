import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { ErrorPage, NOT_FOUND_TITLE } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'

export type NoPackagePlaceholderProps = PropsWithChildren<{
  packageObject: Package | null
  isLoading: boolean
}>

export const NoPackagePlaceholder: FC<NoPackagePlaceholderProps> = memo<NoPackagePlaceholderProps>(({
  packageObject,
  isLoading,
  children,
}) => {

  if (isLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  if (!packageObject) {
    return (
      <ErrorPage title={NOT_FOUND_TITLE} homePath="/portal"/>
    )
  }

  return (
    <>{children}</>
  )
})
