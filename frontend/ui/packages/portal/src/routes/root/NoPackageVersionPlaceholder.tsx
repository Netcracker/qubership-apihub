import type { FC, PropsWithChildren } from 'react'
import { memo } from 'react'
import { useParams } from 'react-router-dom'
import { usePackageVersionContent } from './usePackageVersionContent'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { ErrorPage, NOT_FOUND_TITLE } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'

export type NoPackageVersionPlaceholderProps = PropsWithChildren<{
  packageObject: Package | null
}>

export const NoPackageVersionPlaceholder: FC<NoPackageVersionPlaceholderProps> = memo<NoPackageVersionPlaceholderProps>(({
  packageObject,
  children,
}) => {
  const { versionId } = useParams()
  const { versionContent, error, isInitialLoading } = usePackageVersionContent({
    packageKey: packageObject?.key,
    versionKey: versionId,
  })
  const isCreationVersion = versionId && versionId === SPECIAL_VERSION_KEY

  if (isInitialLoading) {
    return (
      <LoadingIndicator/>
    )
  }

  if (error) {
    return (
      <ErrorPage
        title={NOT_FOUND_TITLE}
        message={error.message}
        homePath="/portal"
      />
    )
  }

  if (isCreationVersion || versionContent) {
    return (
      <>{children}</>
    )
  }

  return null
})
