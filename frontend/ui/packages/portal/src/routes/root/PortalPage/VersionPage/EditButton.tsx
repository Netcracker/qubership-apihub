/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../../NavigationProvider'
import { useFullMainVersion, useIsLatestRevision } from '../FullMainVersionProvider'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { OutlinedIconButton } from '@netcracker/qubership-apihub-ui-shared/components/OutlinedIconButton'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'
import { DISABLED_BUTTON_COLOR, ENABLED_BUTTON_COLOR } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'

export type OperationsFilterByDocumentProps = {
  disabled: boolean
  hint: ReactNode
  isDashboard: boolean
}

export const EditButton: FC<OperationsFilterByDocumentProps> = memo<OperationsFilterByDocumentProps>(({
  disabled,
  hint,
  isDashboard,
}) => {
  const { navigateToVersion } = useNavigation()
  const { packageId } = useParams()

  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const fullMainVersion = useFullMainVersion()
  const isLatestRevision = useIsLatestRevision()
  const version = getSplittedVersionKey(fullMainVersion, isLatestRevision).versionKey

  const handleEditVersionClick = useCallback(
    () => {
      setBackwardLocation({ ...backwardLocation, fromPackage: location })
      navigateToVersion({ packageKey: packageId!, versionKey: isDashboard ? version : fullMainVersion!, edit: true })
    },
    [setBackwardLocation, backwardLocation, location, navigateToVersion, packageId, isDashboard, version, fullMainVersion],
  )

  const disabledValue = useMemo(() => (isDashboard ? disabled || !isLatestRevision : disabled), [disabled, isDashboard, isLatestRevision])
  const hintValue = useMemo(() => (isDashboard ? hint || NOT_LATEST_REVISION : hint), [hint, isDashboard])
  const disableHintValue = useMemo(() => (isDashboard ? !disabled && isLatestRevision : !disabled), [disabled, isDashboard, isLatestRevision])

  return (
    <OutlinedIconButton
      onClick={handleEditVersionClick}
      startIcon={<EditIcon color={disabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}/>}
      data-testid="EditButton"
      disabled={disabledValue}
      disableHint={disableHintValue}
      hint={hintValue}
      tooltipMaxWidth="500px"
    />
  )
})

export const NOT_LATEST_REVISION = 'Version editing is only available for the latest revision.'
