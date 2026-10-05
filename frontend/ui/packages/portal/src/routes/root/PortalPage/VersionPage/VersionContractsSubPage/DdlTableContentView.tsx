import { Box, Skeleton } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, useCallback, useEffect, useMemo } from 'react'
import { createPath, useParams } from 'react-router-dom'

import type { DiffMetaKeys } from '@portal/entities/diff-meta-keys'
import {
  useApiDiffResult,
  useHasComparisonInternalDocument,
  useIsApiDiffResultLoading,
  useSetApiDiffResult,
} from '@portal/routes/root/ApiDiffResultProvider'
import { useComparedDdlContractsPair } from '@portal/routes/root/PortalPage/VersionPage/ComparedDdlContractsContext'
import { useBreadcrumbsData } from '@portal/routes/root/PortalPage/VersionPage/ComparedPackagesBreadcrumbsProvider'
import { OperationsSwapper } from '@portal/routes/root/PortalPage/VersionPage/OperationContent/OperationsSwapper'
import type { OperationDisplayMode } from '@portal/routes/root/PortalPage/VersionPage/OperationContent/OperationView/OperationDisplayMode'
import { useOperationViewMode } from '@portal/routes/root/PortalPage/VersionPage/useOperationViewMode'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  CONTENT_PLACEHOLDER_AREA,
  Placeholder,
  PLACEHOLDER_MESSAGE_NO_INTERNAL_DOCUMENT,
  SEARCH_RAINY_DAY_PLACEHOLDER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { RawSpecDiffView } from '@netcracker/qubership-apihub-ui-shared/components/RawSpecDiffView'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import {
  DOC_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
  SIMPLE_SPEC_VIEW_MODE,
  type SpecViewMode,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { CONTRACT_TYPE_DDL } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import {
  DDL_ENTITY_KIND_TABLE,
  type DdlContractEntity,
  type DdlContractEntityDetails,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { DEFAULT_VIEW_MODE_MAP_BY_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import {
  DETAILED_SCHEMA_VIEW_MODE,
  SIMPLE_SCHEMA_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import {
  useIsDocOperationViewMode,
  useIsRawOperationViewMode,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationMode'
import { theme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import { SQL_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { DDL_DOCUMENT_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import { useNormalizedDdlContract } from '@portal/api-hooks/InternalDocuments/useNormalizedDdlContract'
import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import {
  DdlTableDiffsViewer,
  DdlTableViewer,
  type NavigationLinkBuilder,
} from '@netcracker/qubership-apihub-api-doc-viewer'
import { calculateDdlEntityId } from '@netcracker/qubership-apihub-api-processor'
import { usePackageKind } from '../../usePackageKind'
import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { useRefSearchParam } from '../../useRefSearchParam'
import { getDdlTableLink } from '../useNavigateToOperation'
import { DdlTableNavigationLink } from './DdlTableNavigationLink'

const DIFFS_META_KEYS: DiffMetaKeys = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

export type DdlTableContentViewProps = Readonly<{
  data: DdlContractEntityDetails | undefined
  viewMode: SpecViewMode
  noHeading?: boolean
  entityPackageKey?: Key
  entityVersionKey?: Key
}>

export const DdlTableContentView: FC<DdlTableContentViewProps> = memo<DdlTableContentViewProps>(({
  data,
  viewMode,
  noHeading = false,
  entityPackageKey,
  entityVersionKey,
}) => {
  const [resolvedPackageKey, resolvedVersionKey] = usePackageParamsWithRef(data?.packageRef?.key)

  const contentPackageKey = entityPackageKey ?? resolvedPackageKey
  const contentVersionKey = entityVersionKey ?? resolvedVersionKey

  const {
    data: normalizedSource,
    isLoading: isNormalizedSourceLoading,
    error: normalizedSourceError,
  } = useNormalizedDdlContract({
    ddlContract: data,
    packageId: contentPackageKey,
    versionId: contentVersionKey,
  })

  const rawContent = data?.data ?? ''

  const tableKey = useMemo(() => buildDdlTableKey(data), [data])
  const navigationLinkBuilder = useDdlTableNavigationLinkBuilder(data, entityPackageKey)

  const parseError = normalizedSourceError?.message ?? null
  const schemaDisplayMode = viewMode === SIMPLE_SPEC_VIEW_MODE
    ? SIMPLE_SCHEMA_VIEW_MODE
    : DETAILED_SCHEMA_VIEW_MODE
  const showSchemaView = viewMode === DOC_SPEC_VIEW_MODE || viewMode === SIMPLE_SPEC_VIEW_MODE

  if (viewMode !== RAW_SPEC_VIEW_MODE && isNormalizedSourceLoading) {
    return (
      <ContentContainer>
        <Skeleton variant="rectangular" height="100%" />
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      {showSchemaView && (
        parseError
          ? <ParseErrorMessage>{parseError}</ParseErrorMessage>
          : tableKey && (
            <DdlTableViewer
              source={normalizedSource}
              tableKey={tableKey}
              navigationLinkBuilder={navigationLinkBuilder}
              navigationLinkComponent={DdlTableNavigationLink}
              displayMode={schemaDisplayMode}
              noHeading={noHeading}
            />
          )
      )}

      {viewMode === RAW_SPEC_VIEW_MODE && (
        <RawSpecView
          value={rawContent}
          extension={SQL_FILE_EXTENSION}
          type={DDL_DOCUMENT_TYPE.DDL}
          // TODO: Needs a larger refactor to centralise Doc/Raw view spacing for all specification kinds.
          sx={{ ml: -4, mr: -2 }}
        />
      )}
    </ContentContainer>
  )
})

DdlTableContentView.displayName = 'DdlTableContentView'

export type DdlTableComparisonContentProps = Readonly<{
  displayMode: OperationDisplayMode
  noHeading?: boolean
  originRawContent?: string
  changedRawContent?: string
  isLoading?: boolean
  isEntityExist?: boolean
  paddingBottom?: string | number
  data?: DdlContractEntityDetails
}>

export const DdlTableComparisonContent: FC<DdlTableComparisonContentProps> = memo<DdlTableComparisonContentProps>(({
  data,
  displayMode,
  noHeading = false,
  originRawContent,
  changedRawContent,
  isLoading = false,
  isEntityExist = true,
  paddingBottom,
}) => {
  const breadcrumbsData = useBreadcrumbsData()
  const {
    previousDdlContract: originDdlContract,
    currentDdlContract: changedDdlContract,
  } = useComparedDdlContractsPair()

  const defaultViewMode = DEFAULT_VIEW_MODE_MAP_BY_API_TYPE[CONTRACT_TYPE_DDL](true)
  const { mode } = useOperationViewMode(defaultViewMode)
  const isDocViewMode = useIsDocOperationViewMode(mode)
  const isRawViewMode = useIsRawOperationViewMode(mode)
  const [filters] = useSeverityFiltersSearchParam()

  const apiDiffResult = useApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()
  const setApiDiffResult = useSetApiDiffResult()
  const hasComparisonInternalDocument = useHasComparisonInternalDocument()

  const tableEntity = changedDdlContract ?? originDdlContract ?? data

  const tableKey = useMemo(() => buildDdlTableKey(tableEntity), [tableEntity])
  const navigationLinkBuilder = useDdlTableNavigationLinkBuilder(tableEntity)

  const mergedDocument = apiDiffResult?.merged

  useEffect(() => {
    return () => {
      setApiDiffResult(undefined)
    }
  }, [setApiDiffResult])

  const noDataForDiffView = isDocViewMode && !mergedDocument
  const noDataForRawView = isRawViewMode && !originRawContent && !changedRawContent

  if (isLoading || (isApiDiffResultLoading && isDocViewMode)) {
    return (
      <ComparisonContentContainer paddingBottom={paddingBottom}>
        <LoadingIndicator />
      </ComparisonContentContainer>
    )
  }

  if (noDataForDiffView || noDataForRawView) {
    const message = !hasComparisonInternalDocument
      ? PLACEHOLDER_MESSAGE_NO_INTERNAL_DOCUMENT
      : 'Please select a table'
    return (
      <ComparisonContentContainer paddingBottom={paddingBottom}>
        <Placeholder
          invisible={false}
          area={CONTENT_PLACEHOLDER_AREA}
          message={message}
        />
      </ComparisonContentContainer>
    )
  }

  if (!isEntityExist) {
    return (
      <ComparisonContentContainer paddingBottom={paddingBottom}>
        <Placeholder
          invisible={false}
          variant={SEARCH_RAINY_DAY_PLACEHOLDER_VARIANT}
          area={CONTENT_PLACEHOLDER_AREA}
          message="No tables"
        />
      </ComparisonContentContainer>
    )
  }

  return (
    <ComparisonContentContainer paddingBottom={paddingBottom}>
      <ComparisonContentInner>
        <OperationsSwapper
          displayMode={displayMode}
          breadcrumbsData={breadcrumbsData}
          actions={undefined}
        />
        {isDocViewMode && !!mergedDocument && tableKey && (
          <DiffViewContainer data-testid="DdlEntityComparisonDiff">
            <DdlTableDiffsViewer
              mergedSource={mergedDocument}
              tableKey={tableKey}
              navigationLinkBuilder={navigationLinkBuilder}
              navigationLinkComponent={DdlTableNavigationLink}
              displayMode={DETAILED_SCHEMA_VIEW_MODE}
              noHeading={noHeading}
              diffMetaKeys={DIFFS_META_KEYS}
              diffTypes={filters}
              devMode
            />
          </DiffViewContainer>
        )}
        {isRawViewMode && (
          <RawDiffContainer data-testid="DdlEntityComparisonDiff">
            <RawSpecDiffView
              beforeValue={originRawContent ?? ''}
              afterValue={changedRawContent ?? ''}
              extension={SQL_FILE_EXTENSION}
              type={DDL_DOCUMENT_TYPE.DDL}
            />
          </RawDiffContainer>
        )}
      </ComparisonContentInner>
    </ComparisonContentContainer>
  )
})

DdlTableComparisonContent.displayName = 'DdlTableComparisonContent'

type DdlTableNavigationEntity = Pick<DdlContractEntity, 'packageRef'>

function buildDdlTableKey(
  entity: Pick<DdlContractEntityDetails, 'schemaName' | 'name'> | undefined,
): { schemaName: string; name: string } | undefined {
  if (!entity) {
    return undefined
  }
  return { schemaName: entity.schemaName, name: entity.name }
}

function useDdlTableNavigationLinkBuilder(
  tableEntity: DdlTableNavigationEntity | undefined,
  entityPackageKey?: Key,
): NavigationLinkBuilder {
  const { packageId, versionId } = useParams()
  const [refKey] = useRefSearchParam()
  const [packageKind] = usePackageKind()
  const isDashboard = packageKind === DASHBOARD_KIND

  // `_column` is not used in the callback for now but it is required by the NavigationLinkBuilder type
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return useCallback((schemaName: string, tableName: string, _column: string) => {
    if (!tableEntity || !packageId || !versionId) {
      return '#'
    }
    const ddlEntityId = calculateDdlEntityId(schemaName, DDL_ENTITY_KIND_TABLE, tableName)
    const ddlTableLink = getDdlTableLink({
      packageKey: packageId,
      versionKey: versionId,
      ddlEntityId: ddlEntityId,
      ref: isDashboard ? tableEntity.packageRef?.key ?? entityPackageKey ?? refKey : undefined,
    })
    return createPath(ddlTableLink)
  }, [entityPackageKey, isDashboard, packageId, refKey, tableEntity, versionId])
}

const ContentContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'auto',
  padding: theme.spacing(2),
})

type ComparisonContentContainerProps = {
  paddingBottom?: string | number
}

const ComparisonContentContainer = styled(Box)<ComparisonContentContainerProps>(({ paddingBottom }) => ({
  height: '100%',
  overflow: 'hidden',
  paddingBottom: paddingBottom ? paddingBottom : 0,
  position: 'relative',
}))

const ComparisonContentInner = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: 'inherit',
  overflow: 'hidden',
  paddingLeft: 24,
  paddingRight: 16,
})

const DiffViewContainer = styled(Box)({
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'auto',
})

const RawDiffContainer = styled(Box)({
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
})

const ParseErrorMessage = styled(Box)(({ theme }) => ({
  color: theme.palette.error.main,
  padding: theme.spacing(1.5),
  whiteSpace: 'pre-wrap',
}))
