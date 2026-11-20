import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { Box } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { SECURITY_REPORT_TYPE_AUTH_CHECK, useSecurityReports } from './useSecurityReports'
import type { Key } from '@agents/entities/keys'
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
