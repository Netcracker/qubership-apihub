import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSetPathParam } from '../useSetPathParam'
import {
  useFullMainVersion,
  useIsLatestRevision,
  useSetFullMainVersion,
  useSetIsLatestRevision,
} from '../../FullMainVersionProvider'
import {
  useAsyncInvalidateAllByVersion,
  useAsyncInvalidatePackageVersionContentByVersion,
} from '../../../usePackageVersionContent'
import { useActualVersion } from './useActualVersion'
import { VERSION_ID } from '../../../../../routes'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import {
  ConfirmationDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'

export const OutdatedRevisionNotification: FC = memo(() => {
  const [open, setOpen] = useState(false)
  const { packageId: packageKey } = useParams()
  const setPathParam = useSetPathParam()

  const fullVersionKey = useFullMainVersion()
  const setFullMainVersion = useSetFullMainVersion()
  const isLatestRevision = useIsLatestRevision()
  const setIsLatestRevision = useSetIsLatestRevision()
  const { versionKey, revisionKey: mainRevisionKey } = getSplittedVersionKey(fullVersionKey)
  const updatedVersion = useActualVersion(packageKey, versionKey)
  const { versionKey: updatedVersionKey, revisionKey: updatedRevisionKey } = getSplittedVersionKey(updatedVersion)

  const invalidateAllByVersion = useAsyncInvalidateAllByVersion()
  const invalidatePackageVersionContentByVersion = useAsyncInvalidatePackageVersionContentByVersion()

  useEffect(() => {
    mainRevisionKey &&
    updatedVersionKey === versionKey &&
    updatedRevisionKey > mainRevisionKey &&
    isLatestRevision &&
    setOpen(true)
  }, [isLatestRevision, mainRevisionKey, updatedRevisionKey, updatedVersionKey, versionKey])

  // navigation to the new latest revision
  const onConfirm = useCallback(async () => {
    setTimeout(() => setOpen(false), TIMEOUT)
    if (updatedVersion) {
      await invalidateAllByVersion(updatedVersionKey)
      setFullMainVersion(updatedVersion)
      setIsLatestRevision(true)
    }
  }, [invalidateAllByVersion, setFullMainVersion, setIsLatestRevision, updatedVersion, updatedVersionKey])

  // navigation to the current revision from context
  const onCancel = useCallback(async () => {
    setTimeout(() => setOpen(false), TIMEOUT)
    if (fullVersionKey) {
      await invalidatePackageVersionContentByVersion(fullVersionKey)
      setPathParam(fullVersionKey, VERSION_ID)
      setFullMainVersion(fullVersionKey)
      setIsLatestRevision(false)
    }
  }, [fullVersionKey, invalidatePackageVersionContentByVersion, setFullMainVersion, setIsLatestRevision, setPathParam])

  return (
    <ConfirmationDialog
      open={open}
      title="You are viewing the old revision"
      message="New version revision was published. Do you want to open the latest revision?"
      confirmButtonName="Yes, open"
      confirmButtonColor="primary"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
})

const TIMEOUT = 50
