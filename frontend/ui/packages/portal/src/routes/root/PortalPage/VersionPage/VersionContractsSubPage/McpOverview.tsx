import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { isPlainObject } from 'lodash-es'
import { type FC, memo } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { McpOverviewDetails } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpOverviewDetails'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { DocumentTitleWithVersion } from '@netcracker/qubership-apihub-ui-shared/components/Titles/DocumentTitleWithVersion'
import {
  MCP_COLLECTION_INIT,
  MCP_EMPTY_SCOPE_MESSAGE,
  type McpContractEntity,
  type McpContractEntityDetails,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { Key, PackageKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { toOptionalString } from '@netcracker/qubership-apihub-ui-shared/utils/strings'

import { usePackageKind } from '../../usePackageKind'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useMcpEntities } from '../api/useMcpEntities'
import { useMcpEntityDetails } from '../api/useMcpEntityDetails'

type McpOverviewProps = Readonly<{
  packageKey: Key
  versionKey: Key
  mcpEndpoint?: string
  refPackageKey?: PackageKey
  isEmptyMcpScope: boolean
}>

export const McpOverview: FC<McpOverviewProps> = memo<McpOverviewProps>(({
  packageKey,
  versionKey,
  mcpEndpoint,
  refPackageKey,
  isEmptyMcpScope,
}) => {
  const [kind] = usePackageKind()
  const canLoadOverview = !isEmptyMcpScope && !!mcpEndpoint

  const [initEntities] = useMcpEntities({
    packageKey: packageKey,
    versionKey: versionKey,
    collection: MCP_COLLECTION_INIT,
    mcpEndpoint: mcpEndpoint,
    refPackageKey: refPackageKey,
    enabled: canLoadOverview,
  })

  // keepPreviousData may still expose the previous package/endpoint init row - never details-fetch it.
  const [initEntity] = initEntities
  const scopedInitEntity = isInitEntityForScope(initEntity, mcpEndpoint, refPackageKey)
    ? initEntity
    : undefined

  const [detailsPackageKey, detailsVersionKey] = usePackageParamsWithRef(
    kind === DASHBOARD_KIND ? scopedInitEntity?.packageRef?.key ?? refPackageKey : '',
  )

  const { data: entityDetails, isPreviousData } = useMcpEntityDetails({
    packageKey: detailsPackageKey,
    versionKey: detailsVersionKey,
    collection: MCP_COLLECTION_INIT,
    mcpEntityId: scopedInitEntity?.mcpEntityId,
    enabled: canLoadOverview && !!scopedInitEntity?.mcpEntityId,
  })

  // keepPreviousData anti-flicker only for the current query key; never render cross-scope cache.
  const overviewData = isOverviewDetailsForScope(
    entityDetails,
    isPreviousData,
    scopedInitEntity,
    detailsPackageKey,
    mcpEndpoint,
  )
    ? entityDetails?.data
    : undefined

  if (isEmptyMcpScope) {
    return (
      <Placeholder
        invisible={false}
        area={CONTENT_PLACEHOLDER_AREA}
        message={MCP_EMPTY_SCOPE_MESSAGE}
        data-testid="NoItemsPlaceholder"
      />
    )
  }

  if (overviewData === undefined) {
    return <LoadingIndicator />
  }

  const serverInfo = extractMcpServerInfo(overviewData)
  const displayTitle = serverInfo.name ?? mcpEndpoint ?? 'MCP Server'

  return (
    <OverviewRoot>
      <BodyCard
        header={
          <DocumentTitleWithVersion
            title={displayTitle}
            version={serverInfo.version}
          />
        }
        body={
          <OverviewBody>
            <McpOverviewDetails data={overviewData} data-testid="McpOverview" />
          </OverviewBody>
        }
        overrideBodySx={{
          overflowY: 'auto',
        }}
      />
    </OverviewRoot>
  )
})

McpOverview.displayName = 'McpOverview'

type McpServerInfo = Readonly<{
  name?: string
  version?: string
}>

function isInitEntityForScope(
  entity: McpContractEntity | undefined,
  mcpEndpoint: string | undefined,
  refPackageKey: PackageKey | undefined,
): boolean {
  if (!entity || !mcpEndpoint || entity.mcpEndpoint !== mcpEndpoint) {
    return false
  }
  if (refPackageKey && entity.packageRef?.key && entity.packageRef.key !== refPackageKey) {
    return false
  }
  return true
}

function isOverviewDetailsForScope(
  details: McpContractEntityDetails | undefined,
  isPreviousData: boolean,
  scopedInitEntity: McpContractEntity | undefined,
  detailsPackageKey: Key | undefined,
  mcpEndpoint: string | undefined,
): boolean {
  if (isPreviousData || !details || !scopedInitEntity || !detailsPackageKey || !mcpEndpoint) {
    return false
  }
  if (details.mcpEntityId !== scopedInitEntity.mcpEntityId) {
    return false
  }
  if (details.mcpEndpoint !== mcpEndpoint || details.mcpEndpoint !== scopedInitEntity.mcpEndpoint) {
    return false
  }
  if (details.packageRef?.key !== undefined && details.packageRef.key !== detailsPackageKey) {
    return false
  }
  return true
}

function extractMcpServerInfo(data: Record<string, unknown>): McpServerInfo {
  const {serverInfo} = data
  if (!isPlainObject(serverInfo)) {
    return {}
  }
  const { name, version } = serverInfo as Record<string, unknown>
  return {
    name: toOptionalString(name),
    version: toOptionalString(version),
  }
}

const OverviewRoot = styled(Box)(({ theme }) => ({
  height: '100%',
  paddingBottom: theme.spacing(3),
}))

const OverviewBody = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}))
