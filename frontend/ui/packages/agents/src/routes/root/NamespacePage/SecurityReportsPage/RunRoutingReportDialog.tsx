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

import type { FC } from 'react'
import { memo, useCallback, useState } from 'react'
import { RUN_ROUTING_REPORT_DIALOG } from '../../../EventBusProvider'
import { useCheckRouting } from './useCheckRouting'
import { useParams } from 'react-router-dom'
import { useIdentityProviderUrl, useSetIdentityProviderUrl } from '../IdpUrlContextProvider'
import { useShowErrorNotification } from '../../BasePage/NotificationHandler'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'
import type { RunReportFormData } from '@netcracker/qubership-apihub-ui-shared/components/Forms/RunReportDialogForm'
import { RunReportDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/Forms/RunReportDialogForm'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

// High Order Component //
export const RunRoutingReportDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={RUN_ROUTING_REPORT_DIALOG}
      render={props => <RunRoutingReportDialogForm {...props}/>}
    />
  )
})

const RunRoutingReportDialogForm: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const { agentId = '', namespaceKey = '' } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  // idpUrl can be an empty string, so use condition with undefined to check not-loaded value
  const idpUrl = useIdentityProviderUrl()
  const setIdpUrl = useSetIdentityProviderUrl()
  const errorNotification = useShowErrorNotification()
  const [controlledException, setControlledException] = useState<string>()

  const onSuccessRunReport = useCallback(() => setOpen(false), [setOpen])
  const onErrorRunReport = useCallback((error: HttpError) => {
    if (CONTROLLED_EXCEPTION_CODES.includes(error.code)) {
      setControlledException(error.message)
    } else {
      setOpen(false)
      errorNotification({
        title: error.name,
        message: error.message,
      })
    }
  }, [errorNotification, setOpen])

  const [startCheckRouting, isCheckStarting] = useCheckRouting(onSuccessRunReport, onErrorRunReport)
  const onRunReport = useCallback((data: RunReportFormData): void => {
    startCheckRouting({
      agentId: agentId,
      namespaceId: namespaceKey,
      workspaceId: workspaceKey!,
      ...data,
    })
  }, [agentId, namespaceKey, startCheckRouting, workspaceKey])

  return (
    <RunReportDialogForm
      open={open}
      setOpen={setOpen}
      onRunReport={onRunReport}
      isRunning={isCheckStarting || idpUrl === undefined}
      defaultIdpUrl={idpUrl}
      onIdpChange={setIdpUrl}
      errorMessage={controlledException}
    />
  )
})

const CONTROLLED_EXCEPTION_CODES = ['3200', '3201', '3202']
