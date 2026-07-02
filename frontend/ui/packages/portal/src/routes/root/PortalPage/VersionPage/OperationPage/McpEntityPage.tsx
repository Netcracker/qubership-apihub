import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Skeleton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAutoFetchInfinitePages } from '../useAutoFetchInfinitePages'

import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { JsonRawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/JsonRawSpecView'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { CONTRACT_TYPE_MCP } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import {
  getMcpEntityDisplayName,
  MCP_COLLECTION_EMPTY_MESSAGES,
  MCP_COLLECTION_INIT,
  MCP_COLLECTION_LABELS,
  type McpEntity,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

import type { Key } from '@apihub/entities/keys'
import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useNavigation } from '../../../../NavigationProvider'
import { PackageBreadcrumbs } from '../../../PackageBreadcrumbs'
import { usePackage } from '../../../usePackage'
import { useMcpEntities } from '../api/useMcpEntities'
import { useMcpEntityDetails } from '../api/useMcpEntityDetails'
import { MCP_ENDPOINT_SEARCH_PARAM, useMcpEndpointSearchParam } from '../useMcpEndpointSearchParam'
import { MCP_ENTITY_SEARCH_PARAM, useMcpEntitySearchParam } from '../useMcpEntitySearchParam'
import { getMcpEntityLink } from '../useNavigateToOperation'
import { McpEntitySelector } from './McpEntitySelector'

export const McpEntityPage: FC = memo(() => {
  const { packageId, versionId, operationId: mcpEntityId } = useParams<{
    packageId: Key
    versionId: Key
    operationId: Key
  }>()

  const [mcpEndpoint] = useMcpEndpointSearchParam()
  const [mcpEntityParam] = useMcpEntitySearchParam()
  const mcpCollection = mcpEntityParam ?? MCP_COLLECTION_INIT

  const [packageObject] = usePackage({ showParents: true })

  const { data: entityDetails, isInitialLoading } = useMcpEntityDetails({
    packageKey: packageId,
    versionKey: versionId,
    collection: mcpCollection,
    mcpEntityId: mcpEntityId,
  })

  const [siblingEntities, isSiblingsLoading, fetchNextPage, isFetchingNextPage, hasNextPage] = useMcpEntities({
    packageKey: packageId,
    versionKey: versionId,
    collection: mcpCollection,
    mcpEndpoint: mcpEndpoint ?? entityDetails?.mcpEndpoint,
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
        [MCP_ENTITY_SEARCH_PARAM]: { value: mcpCollection },
      },
    })
  }, [
    backwardLocation,
    entityDetails?.mcpEndpoint,
    mcpCollection,
    mcpEndpoint,
    navigate,
    navigateToOperations,
    packageId,
    versionId,
  ])

  const prepareLinkFn = useCallback((entity: McpEntity) =>
    getMcpEntityLink({
      packageKey: packageId!,
      versionKey: versionId!,
      mcpEntityId: entity.mcpEntityId,
      mcpEndpoint: mcpEndpoint ?? entity.mcpEndpoint,
      mcpEntity: mcpCollection,
    }), [mcpCollection, mcpEndpoint, packageId, versionId])

  const title = useMemo(() => {
    if (!entityDetails) {
      return ''
    }
    return getMcpEntityDisplayName(entityDetails)
  }, [entityDetails])

  const sectionTitle = MCP_COLLECTION_LABELS[mcpCollection]
  const emptyMessage = MCP_COLLECTION_EMPTY_MESSAGES[mcpCollection]

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
            : <JsonRawSpecView data={entityDetails?.data} />}
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
