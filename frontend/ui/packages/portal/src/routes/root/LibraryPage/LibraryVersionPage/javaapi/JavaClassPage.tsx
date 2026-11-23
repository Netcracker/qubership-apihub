import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Alert, Box, IconButton, Link, Skeleton, styled, Typography } from '@mui/material'
import { type FC, useMemo } from 'react'
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { JavaClassViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import '@netcracker/qubership-apihub-api-doc-viewer/dist/style.css'
import { ErrorPage } from '@netcracker/qubership-apihub-ui-shared/components/ErrorPage'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { JsonRawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/JsonRawSpecView'
import {
  DOC_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'

import { useBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { useSpecViewMode } from '@portal/routes/root/PortalPage/VersionPage/DocumentPreviewPage/useSpecViewMode'
import { API_CHANGES_PAGE, CONTRACTS_PAGE } from '../../../../../routes'
import { useLibrary } from '../../../useLibrary'
import { LibraryBreadcrumbs } from '../../LibraryBreadcrumbs'
import { useLibraryVersion } from '../../useLibraryVersions'
import { getLibraryVersionPath } from '../libraryVersion'
import { useLibraryJavaApiDiff, useLibraryJavaApiReport } from '../useLibraryJavaApi'
import {
  getPreviousLibraryVersion,
  JAVA_DOCUMENT_SEARCH_PARAM,
  type JavaApiDocumentKind,
  setPreviousLibraryVersion,
} from './javaApi'
import { JavaClassNavigationLink } from './JavaClassNavigationLink'
import { JavaClassViewModeToggler } from './JavaClassViewModeToggler'
import { useJavaClassNavigationLinkBuilder } from './useJavaClassNavigationLinkBuilder'

export const JavaClassPage: FC = () => {
  const { libraryId = '', versionId = '', className = '' } = useParams()
  const [query] = useSearchParams()
  const kind: JavaApiDocumentKind = query.get(JAVA_DOCUMENT_SEARCH_PARAM) === 'diff' ? 'diff' : 'report'
  const { previousLibraryId, previousVersion } = getPreviousLibraryVersion(query)
  const { library, isLoading: isLibraryLoading, error: libraryError } = useLibrary(libraryId)
  const { version, isLoading: isVersionLoading, error: versionError } = useLibraryVersion(libraryId, versionId)
  const report = useLibraryJavaApiReport(kind === 'report' ? libraryId : undefined, versionId)
  const diff = useLibraryJavaApiDiff(kind === 'diff' ? libraryId : undefined, versionId, {
    previousLibraryId,
    previousVersion,
  })
  const { data, isLoading, error } = kind === 'diff' ? diff : report
  const javaClass = data?.classes.find(item => item.className === className)
  const classKey = useMemo(() => ({ className }), [className])
  const rawData = useMemo(
    () => javaClass && { className: javaClass.className, elements: javaClass.elements },
    [javaClass],
  )
  const [viewMode, setViewMode] = useSpecViewMode(DOC_SPEC_VIEW_MODE)
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()
  const handleBackClick = (): void => {
    const origin = backwardLocation.fromOperation
    const versionPath = getLibraryVersionPath(libraryId, versionId, '')
    const tabPath = getLibraryVersionPath(libraryId, versionId, kind === 'diff' ? API_CHANGES_PAGE : CONTRACTS_PAGE)
    const params = new URLSearchParams()
    setPreviousLibraryVersion(params, { previousLibraryId, previousVersion })
    navigate(origin?.pathname.startsWith(versionPath) ? origin : { pathname: tabPath, search: `?${params}` })
  }
  const navigationLinkBuilder = useJavaClassNavigationLinkBuilder(kind, { previousLibraryId, previousVersion })
  let title = 'JavaAPI'
  if (kind === 'diff') title = 'Compare JavaAPI'
  else if (javaClass) title = `JavaAPI: ${javaClass.displayName}`

  if (isLibraryLoading || isVersionLoading) return <LoadingIndicator />
  if (!library || !version) {
    return (
      <ErrorPage
        title={libraryError || versionError ? 'Unable to load library version' : 'Library version not found'}
        message={libraryError?.message ?? versionError?.message}
        homePath="/portal"
      />
    )
  }

  let content = <Alert severity="info">Java type not found.</Alert>
  if (isLoading) content = <Skeleton variant="rectangular" height="100%" />
  else if (error) content = <Alert severity="error">{error.message}</Alert>
  else if (!data) {
    content = (
      <Alert severity="info">
        Class details are not available for this version yet
      </Alert>
    )
  } else if (javaClass) {
    content = viewMode === RAW_SPEC_VIEW_MODE ? <JsonRawSpecView data={rawData} /> : (
      <ViewerBox>
        <JavaClassViewer
          source={data.document}
          classKey={classKey}
          navigationLinkBuilder={navigationLinkBuilder}
          navigationLinkComponent={JavaClassNavigationLink}
        />
      </ViewerBox>
    )
  }

  return (
    <PageLayout
      toolbar={
        <Toolbar
          breadcrumbs={
            <LibraryBreadcrumbs library={library}>
              <Link component={NavLink} to={`/portal/libraries/${encodeURIComponent(libraryId)}`}>{library.name}</Link>
              <Link component={NavLink} to={getLibraryVersionPath(libraryId, versionId)}>{versionId}</Link>
            </LibraryBreadcrumbs>
          }
          header={
            <ToolbarHeaderRow>
              <IconButton color="primary" onClick={handleBackClick} aria-label="Back" data-testid="BackButton">
                <ArrowBackIcon />
              </IconButton>
              <ToolbarTitle
                value={isLoading
                  ? <Skeleton variant="text" width="150px" />
                  : (
                    <Typography component="span" variant="h5" data-testid="ToolbarTitle">
                      {title}
                    </Typography>
                  )}
              />
            </ToolbarHeaderRow>
          }
          action={<JavaClassViewModeToggler mode={viewMode} onChange={setViewMode} />}
        />
      }
      body={<BodyBox data-testid="JavaClassPage">{content}</BodyBox>}
    />
  )
}
JavaClassPage.displayName = 'JavaClassPage'

const ToolbarHeaderRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))
const BodyBox = styled(Box)({ height: '100%', minHeight: 0, overflow: 'hidden' })
const ViewerBox = styled(Box)(({ theme }) => ({
  height: '100%',
  overflow: 'auto',
  padding: theme.spacing(1, 2),
}))
