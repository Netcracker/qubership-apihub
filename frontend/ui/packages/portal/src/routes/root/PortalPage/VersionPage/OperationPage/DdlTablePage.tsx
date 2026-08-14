import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, IconButton, Skeleton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { Key } from '@apihub/entities/keys'
import { useBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { DdlTableViewModeToggler } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableViewModeToggler'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { DOC_SPEC_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { CONTRACT_TYPE_DDL, getRouteApiTypeTitle } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import {
  type DdlContractEntity,
  getDdlTableDisplayName,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useNavigation } from '../../../../NavigationProvider'
import { PackageBreadcrumbs } from '../../../PackageBreadcrumbs'
import { usePackage } from '../../../usePackage'
import { usePackageKind } from '../../usePackageKind'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useDdlTableDetails } from '../api/useDdlTableDetails'
import { useDdlTables } from '../api/useDdlTables'
import { useSpecViewMode } from '../DocumentPreviewPage/useSpecViewMode'
import { useAutoFetchInfinitePages } from '../useAutoFetchInfinitePages'
import { getDdlTableLink } from '../useNavigateToOperation'
import { DdlTableContentView } from '../VersionContractsSubPage/DdlTableContentView'
import { DdlTableSelector } from './DdlTableSelector'

export const DdlTablePage: FC = memo(() => {
  const { packageId, versionId, operationId: ddlEntityId } = useParams<{
    packageId: Key
    versionId: Key
    operationId: Key
  }>()
  const [refKey] = useRefSearchParam()
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND
  const [detailsPackageKey, detailsVersionKey] = usePackageParamsWithRef()

  const [packageObject] = usePackage({ showParents: true })

  const { data: tableDetails, isInitialLoading } = useDdlTableDetails({
    packageKey: detailsPackageKey,
    versionKey: detailsVersionKey,
    ddlEntityId: ddlEntityId,
  })

  const [allTables, isTablesLoading, fetchNextPage, isFetchingNextPage, hasNextPage] = useDdlTables({
    packageKey: packageId,
    versionKey: versionId,
    refPackageKey: refKey,
    limit: 100,
  })

  useAutoFetchInfinitePages({
    isLoading: isTablesLoading,
    isFetchingNextPage: isFetchingNextPage,
    hasNextPage: hasNextPage,
    fetchNextPage: fetchNextPage,
  })

  const isSiblingsLoading = isTablesLoading || isFetchingNextPage || !!hasNextPage

  const filteredSiblings = useMemo(
    () => allTables.filter(table => table.ddlEntityId !== ddlEntityId),
    [allTables, ddlEntityId],
  )

  const navigate = useNavigate()
  const { navigateToOperations } = useNavigation()
  const backwardLocation = useBackwardLocationContext()

  const [viewMode, setViewMode] = useSpecViewMode(DOC_SPEC_VIEW_MODE)

  const handleBackClick = useCallback(() => {
    if (backwardLocation.fromOperation) {
      navigate({ ...backwardLocation.fromOperation })
      return
    }
    navigateToOperations({
      packageKey: packageId!,
      versionKey: versionId!,
      apiType: CONTRACT_TYPE_DDL,
      search: {
        [REF_SEARCH_PARAM]: { value: refKey ?? '' },
      },
    })
  }, [backwardLocation, navigate, navigateToOperations, packageId, refKey, versionId])

  const prepareLinkFn = useCallback((table: DdlContractEntity) =>
    getDdlTableLink({
      packageKey: packageId!,
      versionKey: versionId!,
      ddlEntityId: table.ddlEntityId,
      ref: isDashboard ? table.packageRef?.key ?? refKey : undefined,
      mode: viewMode,
    }), [isDashboard, packageId, refKey, versionId, viewMode])

  const title = useMemo(() => {
    if (!tableDetails) {
      return ''
    }
    return `${getRouteApiTypeTitle(CONTRACT_TYPE_DDL)}: ${getDdlTableDisplayName(tableDetails)}`
  }, [tableDetails])

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
                    <DdlTableSelector
                      tables={filteredSiblings}
                      isLoading={isSiblingsLoading}
                      prepareLinkFn={prepareLinkFn}
                    />
                  </Box>
                }
              />
            </ToolbarHeaderRow>
          }
          action={<DdlTableViewModeToggler mode={viewMode} onChange={setViewMode} />}
        />
      }
      body={
        <BodyBox>
          {isInitialLoading
            ? <Skeleton variant="rectangular" height="100%" />
            : (
              <DdlTableContentView
                data={tableDetails}
                viewMode={viewMode}
                entityPackageKey={detailsPackageKey}
                entityVersionKey={detailsVersionKey}
              />
            )}
        </BodyBox>
      }
    />
  )
})

DdlTablePage.displayName = 'DdlTablePage'

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
