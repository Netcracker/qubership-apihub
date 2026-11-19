import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useDownloadSecurityReport } from './useDownloadSecurityReport'
import { SECURITY_REPORT_TYPE_GATEWAY_ROUTING, useSecurityReports } from './useSecurityReports'
import type { Key } from '@agents/entities/keys'
import { Box } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { RunRoutingReportDialog } from './RunRoutingReportDialog'
import { useEventBus } from '../../../EventBusProvider'
import { useDownloadRoutingReportSources } from './useDownloadRoutingReportSources'
import type { DownloadType, ReportDownloadOption } from '@netcracker/qubership-apihub-ui-shared/components/SecurityReportsTable'
import {
  DOWNLOAD_REPORT,
  DOWNLOAD_SOURCES,
  SecurityReportsTable,
} from '@netcracker/qubership-apihub-ui-shared/components/SecurityReportsTable'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

// High Order Component //
export const RoutingReports: FC = memo(() => {
  const { agentId = '', namespaceKey: namespaceId = '' } = useParams()
  const workspaceId = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { showRunRoutingReportDialog } = useEventBus()

  const [downloadReport] = useDownloadSecurityReport()
  const [downloadSources] = useDownloadRoutingReportSources()
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
    type: SECURITY_REPORT_TYPE_GATEWAY_ROUTING,
  })

  const onDownloadSecurityReport = useCallback((processId: Key, value?: DownloadType) => {
    if (value === DOWNLOAD_REPORT) {
      downloadReport({
        processKey: processId,
        type: SECURITY_REPORT_TYPE_GATEWAY_ROUTING,
      })
    }

    if (value === DOWNLOAD_SOURCES) {
      downloadSources({
        processKey: processId,
      })
    }
  }, [downloadReport, downloadSources])

  const openDialog = useCallback(() => {
    showRunRoutingReportDialog()
  }, [showRunRoutingReportDialog])

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
        onClick={openDialog}
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
          downloadOptions={downloadOptions}
        />
      </Box>

      <RunRoutingReportDialog/>
    </Box>
  )
})

const downloadOptions: ReportDownloadOption[] = [
  {
    value: DOWNLOAD_REPORT,
    text: 'Download report',
  }, {
    value: DOWNLOAD_SOURCES,
    text: 'Download sources',
  },
]
