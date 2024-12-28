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
import { memo } from 'react'
import { CardHeader } from '@mui/material'
import { Header } from './internal/Header'
import { useSpecRaw } from '../../useSpecRaw'
import { useSpecViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/useSpecViewer'
import type {
  SpecificationDialogDetail,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecificationDialog'
import { SpecificationPopup } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecificationDialog'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { ProxyServer } from '@netcracker/qubership-apihub-ui-shared/entities/services'
import { isGraphQlSpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'

export type CommonSpecificationPopupProps = {
  spec: Spec
  proxyServer?: ProxyServer
  value?: string
  header?: string
  isLoading?: boolean
  headerComponent?: ReactNode
  disableSpecViewToggler?: boolean
  open: boolean
  setOpen: (value: boolean) => void
  agentId?: string
  namespaceKey?: string
}

export const CommonSpecificationPopup: FC<CommonSpecificationPopupProps> = memo<CommonSpecificationPopupProps>(({
  spec,
  proxyServer,
  value,
  header,
  isLoading,
  headerComponent,
  disableSpecViewToggler = false,
  open,
  setOpen,
  agentId,
  namespaceKey,
}) => {
  const [defaultValue, isDefaultValueLoading] = useSpecRaw({
    serviceKey: spec.serviceKey,
    specKey: spec.key,
    enabled: !isGraphQlSpecType(spec.type),
  })

  const defaultProxyServer = {
    url: APIHUB_NC_BASE_PATH + spec?.proxyServerUrl,
    description: spec?.serviceKey,
  }

  const defaultHeaderComponent = <CardHeader
    sx={{ p: 0 }}
    title={spec?.name}
    subheader={<Header agentId={agentId} namespaceKey={namespaceKey} specKey={spec?.serviceKey}/>}
  />

  const { viewer, viewModes, viewMode, setViewMode } = useSpecViewer({
    spec: spec,
    proxyServer: proxyServer || defaultProxyServer,
    value: value || defaultValue,
    isLoading: isLoading || isDefaultValueLoading,
    header: header,
  })

  const specificationPopupDetail: SpecificationDialogDetail = {
    spec: spec,
    viewer: viewer,
    viewModes: viewModes,
    viewMode: viewMode,
    setViewMode: setViewMode,
    headerComponent: headerComponent || defaultHeaderComponent,
    disableSpecViewToggler: disableSpecViewToggler,
  }

  return (
    <SpecificationPopup
      open={open}
      setOpen={setOpen}
      detail={specificationPopupDetail}
    />
  )
})
