import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material'
import { styled, type CSSObject, type Theme } from '@mui/material/styles'
import { type FC, memo, useCallback, useMemo, type MouseEvent } from 'react'
import { type To, useNavigate, useParams } from 'react-router-dom'

import { DocumentErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/DocumentErrorIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { SidebarSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/SidebarSkeleton'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { ICON_BUTTON_HOVER_BACKGROUND_COLOR } from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { optionalSearchParams, REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import type { Document } from '@portal/entities/documents'
import { useEventBus } from '@portal/routes/EventBusProvider'
import { usePackageParamsWithRef } from '@portal/routes/root/PortalPage/usePackageParamsWithRef'
import { usePackageVersionConfig } from '@portal/routes/root/PortalPage/usePackageVersionConfig'
import { useVersionWithRevision } from '../../../useVersionWithRevision'
import { DocumentActionsButton } from './DocumentActionsButton'
import { buildMcpEndpointByFileKey, groupDocumentsForSidebar, isMcpSidebarGroup } from './documentGrouping'
import { ShareabilityMarker } from './ShareabilityMarker'

export type DocumentListProps = Readonly<{
  isLoading: boolean
  documents: ReadonlyArray<Document>
}>

export const DocumentList: FC<DocumentListProps> = memo<DocumentListProps>(({ documents, isLoading }) => {
  const { packageId: packageKey, versionId: versionKey, documentId } = useParams()
  const escapedVersionKey = encodeURIComponent(versionKey ?? '')
  const ref = useSearchParam(REF_SEARCH_PARAM)
  const [versionConfig] = usePackageVersionConfig(packageKey, versionKey)

  const search = optionalSearchParams({
    [REF_SEARCH_PARAM]: { value: ref ?? '' },
  })

  const navigate = useNavigate()

  const navigateToSelectedDocument = useCallback((pathToNavigate: To): void => {
    navigate(pathToNavigate)
  }, [navigate])

  const { showDocumentErrorsDialog } = useEventBus()
  const [documentsPackageKey, documentsPackageVersion] = usePackageParamsWithRef()
  const { fullVersion } = useVersionWithRevision(documentsPackageVersion, documentsPackageKey)

  const mcpEndpointByFileKey = useMemo(
    () => buildMcpEndpointByFileKey(versionConfig?.files),
    [versionConfig?.files],
  )

  const sidebarGroups = useMemo(
    () => groupDocumentsForSidebar(documents, mcpEndpointByFileKey),
    [documents, mcpEndpointByFileKey],
  )

  const handleDocumentErrorIndicatorClick = useCallback((
    event: MouseEvent<HTMLButtonElement>,
    { slug, title }: Document,
  ) => {
    event.stopPropagation()
    if (!documentsPackageKey || !fullVersion) {
      return
    }
    showDocumentErrorsDialog({
      packageKey: documentsPackageKey,
      versionKey: fullVersion,
      documentId: slug,
      documentTitle: title,
    })
  }, [documentsPackageKey, fullVersion, showDocumentErrorsDialog])

  const renderDocumentRow = useCallback((document: Document) => {
    const { key, type, title, version, slug, format, shareabilityStatus, hasErrors } = document
    const displayTitle = version ? `${title} ${version}` : title

    return (
      <ListItem
        key={key}
        sx={{ p: 0 }}
      >
        <ListItemButton
          sx={{
            flexDirection: 'unset',
            height: '36px',
            alignItems: 'center',
          }}
          selected={documentId === slug}
          onClick={() => {
            navigateToSelectedDocument({
              pathname: `/portal/packages/${packageKey}/${escapedVersionKey}/documents/${slug}`,
              search: `${search}`,
            })
          }}
          data-testid="DocumentButton"
        >
          <ListItemIcon sx={{ minWidth: 2, mt: 0, mr: 1 }}>
            <SpecLogo value={type} />
          </ListItemIcon>
          <ListItemText primary={displayTitle} primaryTypographyProps={{ sx: { mt: 0.25 } }} />
          <ListItemDocumentErrorIndicator
            hasErrors={hasErrors}
            onClick={event => handleDocumentErrorIndicatorClick(event, document)}
          />
          <ListItemShareabilityMarker value={shareabilityStatus} />
          <ListItemActionsButton
            slug={slug}
            docType={type}
            format={format}
            shareabilityStatus={shareabilityStatus}
            hasErrors={hasErrors}
            icon={<MoreVertIcon sx={{ color: '#626D82' }} fontSize="small" />}
          />
        </ListItemButton>
      </ListItem>
    )
  }, [
    documentId,
    escapedVersionKey,
    handleDocumentErrorIndicatorClick,
    navigateToSelectedDocument,
    packageKey,
    search,
  ])

  if (isLoading) {
    return (
      <Box mt={1}>
        <SidebarSkeleton />
      </Box>
    )
  } else if (isEmpty(documents)) {
    return (
      <Placeholder
        invisible={isNotEmpty(documents)}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message="No documents"
      />
    )
  }

  return (
    <List
      sx={{
        paddingBottom: '30px',
        gap: '16px',
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="DocumentsList"
    >
      {sidebarGroups.map(group => {
        if (isMcpSidebarGroup(group)) {
          return (
            <Box key={group.groupName}>
              <DocumentListSubheader>
                {group.groupName}
              </DocumentListSubheader>
              {group.mcpEndpointGroups.map(({ endpointLabel, documents: endpointDocuments }) => (
                <Box key={endpointLabel}>
                  <DocumentListSubheader>
                    {endpointLabel}
                  </DocumentListSubheader>
                  {endpointDocuments.map(renderDocumentRow)}
                </Box>
              ))}
            </Box>
          )
        }

        return (
          <Box key={group.groupName}>
            <DocumentListSubheader>
              {group.groupName}
            </DocumentListSubheader>
            {group.documents.map(renderDocumentRow)}
          </Box>
        )
      })}
    </List>
  )
})

DocumentList.displayName = 'DocumentList'

const ListItemDocumentErrorIndicator = styled(DocumentErrorIndicator)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  ...documentListRowIconButtonStyles(theme),
}))

const ListItemShareabilityMarker = styled(ShareabilityMarker)(({ theme }) => ({
  marginLeft: theme.spacing(1),
}))

const ListItemActionsButton = styled(DocumentActionsButton)(({ theme }) => ({
  marginLeft: 0,
  ...documentListRowIconButtonStyles(theme),
}))

const DocumentListSubheader = styled(ListSubheader)({
  fontSize: 12,
  lineHeight: '24px',
})

function documentListRowIconButtonStyles(theme: Theme): CSSObject {
  return {
    '&:hover': {
      backgroundColor: ICON_BUTTON_HOVER_BACKGROUND_COLOR,
    },
    width: theme.spacing(3),
    minWidth: theme.spacing(3),
    height: theme.spacing(3),
    paddingLeft: theme.spacing(1.25),
    paddingRight: theme.spacing(1.25),
  }
}
