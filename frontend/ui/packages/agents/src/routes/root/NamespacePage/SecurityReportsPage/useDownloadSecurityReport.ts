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

import { useMutation } from '@tanstack/react-query'
import fileDownload from 'js-file-download'
import type { Key } from '@apihub/entities/keys'
import type { SecurityReportType } from './useSecurityReports'
import { SECURITY_REPORT_TYPE_AUTH_CHECK, SECURITY_REPORT_TYPE_GATEWAY_ROUTING } from './useSecurityReports'
import { generatePath } from 'react-router-dom'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V2, API_V3, requestBlob } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import {
  useGetAgentPrefix,
  useGetNcServicePrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export function useDownloadSecurityReport(): [DownloadSecurityReportFunction, IsLoading] {
  const agentPrefix = useGetAgentPrefix()
  const ncServicePrefix = useGetNcServicePrefix()
  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({
      processKey,
      type,
    }) => downloadSecurityReport(processKey!, type, type === SECURITY_REPORT_TYPE_AUTH_CHECK ? agentPrefix : ncServicePrefix),
  })
  return [mutate, isLoading]
}

export const downloadSecurityReport = async (
  processKey: Key,
  type: SecurityReportType,
  prefix: string,
): Promise<void> => {
  const processId = encodeURIComponent(processKey)

  const [reportPath, apiPath] = reportTypeToPath[type]
  const pathPattern = '/security/:reportPath/:processId/report'
  const response = await requestBlob(
    generatePath(pathPattern, { reportPath, processId }),
    {
      method: 'GET',
    }, {
      basePath: `${prefix}/${apiPath}`,
    },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]
    .slice(1, -1)

  fileDownload(await response.blob(), getFilename())
}

export type DownloadSecurityReportFunction = (options: Options) => void

type Options = {
  processKey: Key
  type: SecurityReportType
}

const reportTypeToPath: Record<SecurityReportType, [string, string]> = {
  [SECURITY_REPORT_TYPE_AUTH_CHECK]: ['authCheck', API_V2],
  [SECURITY_REPORT_TYPE_GATEWAY_ROUTING]: ['gatewayRouting', API_V3],
}
