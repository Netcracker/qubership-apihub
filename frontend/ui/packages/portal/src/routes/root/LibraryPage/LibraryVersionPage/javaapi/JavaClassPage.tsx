import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Alert, Box, IconButton, Link, Skeleton, styled, Typography } from '@mui/material'
import { type FC, useCallback, useMemo } from 'react'
import { createPath, Navigate, NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'

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
import { API_CHANGES_PAGE } from '../../../../../routes'
import { useLibrary } from '../../../useLibrary'
import { LibraryBreadcrumbs } from '../../LibraryBreadcrumbs'
import { useLibraryVersion } from '../../useLibraryVersions'
import { getLibraryVersionPath } from '../libraryVersion'
import { useLibraryJavaClass } from '../useLibraryJavaClass'
import {
  getJavaClassPageLink,
  getJavaReferenceLink,
  getPreviousLibraryVersion,
  JAVA_DOCUMENT_SEARCH_PARAM,
  setPreviousLibraryVersion,
} from './javaApi'
import { JavaClassNavigationLink } from './JavaClassNavigationLink'
import { JavaClassViewModeToggler } from './JavaClassViewModeToggler'
import { useJavaClassNavigationLinkBuilder } from './useJavaClassNavigationLinkBuilder'

export const JavaClassPage: FC = () => {
  const { libraryId = '', versionId = '', className = '' } = useParams()
  const [query] = useSearchParams()
  if (query.get(JAVA_DOCUMENT_SEARCH_PARAM) !== 'diff') {
    return <Navigate replace to={getJavaReferenceLink(libraryId, versionId, className)} />
  }
  return <JavaClassComparePage />
}
JavaClassPage.displayName = 'JavaClassPage'

const JavaClassComparePage: FC = () => {
  const { libraryId = '', versionId = '', className = '' } = useParams()
  const [query] = useSearchParams()
  const { previousLibraryId, previousVersion } = getPreviousLibraryVersion(query)
  const { library, isLoading: isLibraryLoading, error: libraryError } = useLibrary(libraryId)
  const { version, isLoading: isVersionLoading, error: versionError } = useLibraryVersion(libraryId, versionId)
  const { data, isLoading, error } = useLibraryJavaClass(libraryId, versionId, className, 'diff', {
    previousLibraryId,
    previousVersion,
  })
  const javaClass = data?.javaClass
  const classKey = useMemo(() => ({ className }), [className])
  const rawData = data?.raw
  const [viewMode, setViewMode] = useSpecViewMode(DOC_SPEC_VIEW_MODE)
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()
  const handleBackClick = (): void => {
    const origin = backwardLocation.fromOperation
    const versionPath = getLibraryVersionPath(libraryId, versionId, '')
    const tabPath = getLibraryVersionPath(libraryId, versionId, API_CHANGES_PAGE)
    const params = new URLSearchParams()
    setPreviousLibraryVersion(params, { previousLibraryId, previousVersion })
    navigate(origin?.pathname.startsWith(versionPath) ? origin : { pathname: tabPath, search: `?${params}` })
  }
  const referenceLinkBuilder = useJavaClassNavigationLinkBuilder()
  const navigationLinkBuilder = useCallback((targetClassName: string) => {
    if (rawData?.nestedChanges?.some(change => change.classId === targetClassName)) {
      return createPath(getJavaClassPageLink(libraryId, versionId, targetClassName, 'diff', {
        previousLibraryId,
        previousVersion,
      }))
    }
    return referenceLinkBuilder(targetClassName)
  }, [rawData?.nestedChanges, libraryId, versionId, previousLibraryId, previousVersion, referenceLinkBuilder])

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
        <ViewerScrollBox>
          <JavaClassViewer
            source={data.document}
            classKey={classKey}
            // A class removed in this version has no API Reference page to open, so its type names stay plain text
            navigationLinkBuilder={rawData?.class ? navigationLinkBuilder : undefined}
            navigationLinkComponent={JavaClassNavigationLink}
          />
        </ViewerScrollBox>
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
                      Compare JavaAPI
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
JavaClassComparePage.displayName = 'JavaClassComparePage'

const ToolbarHeaderRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))
const BodyBox = styled(Box)({ height: '100%', minHeight: 0, overflow: 'hidden' })
// The top padding sits outside the scrolling box, as in the operation preview, so it stays while the class scrolls
const ViewerBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  paddingTop: theme.spacing(1),
}))

const ViewerScrollBox = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: theme.spacing(0, 2, 1),
}))
