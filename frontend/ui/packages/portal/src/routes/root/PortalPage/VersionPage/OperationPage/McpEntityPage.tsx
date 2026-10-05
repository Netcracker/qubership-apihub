import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Skeleton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Key } from '@portal/entities/keys'
import { useBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { JsonRawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/JsonRawSpecView'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { CONTRACT_TYPE_MCP } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import {
  getMcpContractEntityToolbarTitle,
  MCP_COLLECTION_EMPTY_MESSAGES,
  MCP_COLLECTION_LABELS,
  MCP_COLLECTION_TOOLS,
  type McpContractEntity,
  parseMcpListCollectionParam,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useNavigation } from '../../../../NavigationProvider'
import { PackageBreadcrumbs } from '../../../PackageBreadcrumbs'
import { usePackage } from '../../../usePackage'
import { usePackageKind } from '../../usePackageKind'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useMcpEntities } from '../api/useMcpEntities'
import { useMcpEntityDetails } from '../api/useMcpEntityDetails'
import { useAutoFetchInfinitePages } from '../useAutoFetchInfinitePages'
import { MCP_COLLECTION_SEARCH_PARAM, useMcpCollectionSearchParam } from '../useMcpCollectionSearchParam'
import { MCP_ENDPOINT_SEARCH_PARAM, useMcpEndpointSearchParam } from '../useMcpEndpointSearchParam'
import { getMcpEntityLink } from '../useNavigateToOperation'
import { McpEntitySelector } from './McpEntitySelector'

export const McpEntityPage: FC = memo(() => {
  const { packageId, versionId, operationId: mcpEntityId } = useParams<{
    packageId: Key
    versionId: Key
    operationId: Key
  }>()

  const [mcpEndpoint] = useMcpEndpointSearchParam()
  const [mcpCollectionParam] = useMcpCollectionSearchParam()
  const [refKey] = useRefSearchParam()
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND
  const [detailsPackageKey, detailsVersionKey] = usePackageParamsWithRef()
  const mcpListCollection = parseMcpListCollectionParam(mcpCollectionParam) ?? MCP_COLLECTION_TOOLS

  const [packageObject] = usePackage({ showParents: true })

  const { data: entityDetails, isInitialLoading } = useMcpEntityDetails({
    packageKey: detailsPackageKey,
    versionKey: detailsVersionKey,
    collection: mcpListCollection,
    mcpEntityId: mcpEntityId,
  })

  const [siblingEntities, isSiblingsLoading, fetchNextPage, isFetchingNextPage, hasNextPage] = useMcpEntities({
    packageKey: packageId,
    versionKey: versionId,
    collection: mcpListCollection,
    mcpEndpoint: mcpEndpoint ?? entityDetails?.mcpEndpoint,
    refPackageKey: refKey,
    limit: 100,
  })

  useAutoFetchInfinitePages({
    isLoading: isSiblingsLoading,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
  })

  const isSiblingSelectorLoading = isSiblingsLoading || isFetchingNextPage || !!hasNextPage

  const filteredSiblings = useMemo(
    () => siblingEntities.filter(entity => entity.mcpEntityId !== mcpEntityId),
    [mcpEntityId, siblingEntities],
  )

  const navigate = useNavigate()
  const { navigateToOperations } = useNavigation()
  const backwardLocation = useBackwardLocationContext()

  const handleBackClick = useCallback(() => {
    if (backwardLocation.fromOperation) {
      navigate({ ...backwardLocation.fromOperation })
      return
    }
    navigateToOperations({
      packageKey: packageId!,
      versionKey: versionId!,
      apiType: CONTRACT_TYPE_MCP,
      search: {
        [MCP_ENDPOINT_SEARCH_PARAM]: { value: mcpEndpoint ?? entityDetails?.mcpEndpoint ?? '' },
        [MCP_COLLECTION_SEARCH_PARAM]: { value: mcpListCollection },
        [REF_SEARCH_PARAM]: { value: refKey ?? '' },
      },
    })
  }, [
    backwardLocation,
    entityDetails?.mcpEndpoint,
    mcpListCollection,
    mcpEndpoint,
    navigate,
    navigateToOperations,
    packageId,
    refKey,
    versionId,
  ])

  const prepareLinkFn = useCallback((entity: McpContractEntity) =>
    getMcpEntityLink({
      packageKey: packageId!,
      versionKey: versionId!,
      mcpEntityId: entity.mcpEntityId,
      mcpEndpoint: mcpEndpoint ?? entity.mcpEndpoint,
      mcpCollection: mcpListCollection,
      ref: isDashboard ? entity.packageRef?.key ?? refKey : undefined,
    }), [isDashboard, mcpListCollection, mcpEndpoint, packageId, refKey, versionId])

  const title = useMemo(() => {
    if (!entityDetails) {
      return ''
    }
    return getMcpContractEntityToolbarTitle(entityDetails)
  }, [entityDetails])

  const sectionTitle = MCP_COLLECTION_LABELS[mcpListCollection]
  const emptyMessage = MCP_COLLECTION_EMPTY_MESSAGES[mcpListCollection]

  return (
    <PageLayout
      toolbar={
        <Toolbar
          breadcrumbs={
            <PackageBreadcrumbs
              packageObject={packageObject}
              versionKey={versionId}
              showPackagePath={true}
            />
          }
          header={
            <ToolbarHeaderRow>
              <IconButton color="primary" onClick={handleBackClick} data-testid="BackButton">
                <ArrowBackIcon />
              </IconButton>
              <ToolbarTitle
                value={
                  <Box display="flex" component="span" alignItems="center">
                    {isInitialLoading
                      ? <Skeleton variant="text" width="150px" />
                      : (
                        <Typography component="span" variant="h5" data-testid="ToolbarTitle">
                          {title}
                        </Typography>
                      )}
                    <McpEntitySelector
                      entities={filteredSiblings}
                      isLoading={isSiblingSelectorLoading}
                      sectionTitle={sectionTitle}
                      emptyMessage={emptyMessage}
                      prepareLinkFn={prepareLinkFn}
                    />
                  </Box>
                }
              />
            </ToolbarHeaderRow>
          }
        />
      }
      body={
        <BodyBox>
          {isInitialLoading
            ? <Skeleton variant="rectangular" height="100%" />
            : (
              <JsonRawSpecView
                data={entityDetails?.data}
                // TODO: Needs a larger refactor to centralise Doc/Raw view spacing for all specification kinds.
                sx={{ ml: -2, mr: 0, py: 2, pl: 2 }}
              />
            )}
        </BodyBox>
      }
    />
  )
})

McpEntityPage.displayName = 'McpEntityPage'

const ToolbarHeaderRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const BodyBox = styled(Box)({
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
})
