import { useNormalizedDdlContract } from '@apihub/api-hooks/InternalDocuments/useNormalizedDdlContract'
import { Box, Skeleton } from '@mui/material'
import { styled } from '@mui/material/styles'
import { DdlTableViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import {
  DOC_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
  SIMPLE_SPEC_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { calculateDdlEntityId } from '@netcracker/qubership-apihub-api-processor'
import type { DdlContractEntityDetails } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { DDL_ENTITY_KIND_TABLE } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import {
  DETAILED_SCHEMA_VIEW_MODE,
  SIMPLE_SCHEMA_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/entities/schema-view-mode'
import { theme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import { SQL_FILE_EXTENSION } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import { DDL_DOCUMENT_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { type FC, memo, useCallback, useMemo } from 'react'

import { usePackageParamsWithRef } from '../../usePackageParamsWithRef'
import { getDdlTableLink } from '../useNavigateToOperation'
import { DdlTableNavigationLink } from './DdlTableNavigationLink'

export type DdlTableContentViewProps = {
  data: DdlContractEntityDetails | undefined
  viewMode: SpecViewMode
  noHeading?: boolean
}

export const DdlTableContentView: FC<DdlTableContentViewProps> = memo<DdlTableContentViewProps>((props) => {
  const { data, viewMode, noHeading = false } = props

  const [packageKey, versionKey] = usePackageParamsWithRef()

  const {
    data: normalizedSource,
    isLoading: isNormalizedSourceLoading,
    error: normalizedSourceError,
  } = useNormalizedDdlContract({
    ddlContract: data,
    packageId: packageKey,
    versionId: versionKey,
  })

  const rawContent = data?.data ?? ''

  const tableKey = useMemo(() => {
    if (!data) {
      return undefined
    }
    return { schemaName: data.schemaName, name: data.name }
  }, [data])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigationLinkBuilder = useCallback((schemaName: string, tableName: string, _column: string) => {
    if (!data || !packageKey || !versionKey) {
      return '#'
    }
    const ddlEntityId = calculateDdlEntityId(schemaName, DDL_ENTITY_KIND_TABLE, tableName)
    const link = getDdlTableLink({
      packageKey: packageKey,
      versionKey: versionKey,
      ddlEntityId: ddlEntityId,
    })
    return `${link.pathname}${link.search ?? ''}`
  }, [data, packageKey, versionKey])

  const parseError = normalizedSourceError?.message ?? null

  if (viewMode !== RAW_SPEC_VIEW_MODE && isNormalizedSourceLoading) {
    return (
      <ContentContainer>
        <Skeleton variant="rectangular" height="100%" />
      </ContentContainer>
    )
  }

  return (
    <ContentContainer>
      {viewMode === DOC_SPEC_VIEW_MODE && (
        parseError
          ? <ParseErrorMessage>{parseError}</ParseErrorMessage>
          : (
            <DdlTableViewer
              source={normalizedSource}
              tableKey={tableKey}
              navigationLinkBuilder={navigationLinkBuilder}
              navigationLinkComponent={DdlTableNavigationLink}
              displayMode={DETAILED_SCHEMA_VIEW_MODE}
              noHeading={noHeading}
            />
          )
      )}

      {viewMode === SIMPLE_SPEC_VIEW_MODE && (
        parseError
          ? <ParseErrorMessage>{parseError}</ParseErrorMessage>
          : (
            <DdlTableViewer
              source={normalizedSource}
              tableKey={tableKey}
              navigationLinkBuilder={navigationLinkBuilder}
              navigationLinkComponent={DdlTableNavigationLink}
              displayMode={SIMPLE_SCHEMA_VIEW_MODE}
              noHeading={noHeading}
            />
          )
      )}

      {viewMode === RAW_SPEC_VIEW_MODE && (
        <RawSpecView
          value={rawContent}
          extension={SQL_FILE_EXTENSION}
          type={DDL_DOCUMENT_TYPE.DDL}
        />
      )}
    </ContentContainer>
  )
})

DdlTableContentView.displayName = 'DdlTableContentView'

const ContentContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  padding: theme.spacing(2),
})

const ParseErrorMessage = styled(Box)(({ theme }) => ({
  color: theme.palette.error.main,
  padding: theme.spacing(1.5),
  whiteSpace: 'pre-wrap',
}))
