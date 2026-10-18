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
import { memo } from 'react'
import type { AgentSpecificationDialogDetail } from '../../../../EventBusProvider'
import { SHOW_SPECIFICATION_DIALOG } from '../../../../EventBusProvider'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { isGraphQlSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { GraphQlSpecificationPopup } from './GraphQlSpecificationPopup'
import { CommonSpecificationPopup } from './CommonSpecificationPopup'

export const AgentSpecificationDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_SPECIFICATION_DIALOG}
      render={props => <AgentSpecificationPopup {...props}/>}
    />
  )
})
const AgentSpecificationPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { spec, agentId, namespaceKey, service } = detail as AgentSpecificationDialogDetail

  if (isGraphQlSpecType(spec.type)) {
    return <GraphQlSpecificationPopup
      clickedSpec={spec}
      service={service!}
      open={open}
      setOpen={setOpen}
      agentId={agentId}
      namespaceKey={namespaceKey}
    />
  }

  return <CommonSpecificationPopup
    spec={spec}
    open={open}
    setOpen={setOpen}
    agentId={agentId}
    namespaceKey={namespaceKey}
  />
})
