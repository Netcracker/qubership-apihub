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
import { memo, useCallback } from 'react'
import { Box } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { SECURITY_REPORT_TYPE_AUTH_CHECK, useSecurityReports } from './useSecurityReports'
import type { Key } from '@apihub/entities/keys'
import { useParams } from 'react-router-dom'
import { useCheckSecurity } from './useCheckSecurity'
import { useDownloadSecurityReport } from './useDownloadSecurityReport'
import { SecurityReportsTable } from '@netcracker/qubership-apihub-ui-shared/components/SecurityReportsTable'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

// High Order Component //
export const AuthenticationReports: FC = memo(() => {
  const { agentId = '', namespaceKey: namespaceId = '' } = useParams()
  const workspaceId = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const startSecurityCheck = useCheckSecurity()
  const [downloadSecurityReport] = useDownloadSecurityReport()
  const [
    securityReports,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  ] = useSecurityReports({
    agentKey: agentId,
    namespaceKey: namespaceId,
    workspaceKey: workspaceId!,
    type: SECURITY_REPORT_TYPE_AUTH_CHECK,
  })

  const onDownloadSecurityReport = useCallback((processId: Key) => downloadSecurityReport({
    processKey: processId,
    type: SECURITY_REPORT_TYPE_AUTH_CHECK,
  }), [downloadSecurityReport])

  const onStartSecurityCheck = useCallback(() => {
    startSecurityCheck()
  }, [startSecurityCheck])

  const onFetchNextPage = useCallback(async (): Promise<number> => {
    const result = await fetchNextPage()
    return result.data?.pageParams?.length ?? 1
  }, [fetchNextPage])

  return (
    <Box py={2}>
      <LoadingButton
        variant="contained"
        disabled={isLoading}
        type="submit"
        loading={isLoading}
        onClick={onStartSecurityCheck}
        data-testid="RunReportButton"
      >
        Run Report
      </LoadingButton>
      <Box mt={2}>
        <SecurityReportsTable
          data={securityReports}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          fetchNextPage={onFetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          downloadSecurityReport={onDownloadSecurityReport}
        />
      </Box>
    </Box>
  )
})
