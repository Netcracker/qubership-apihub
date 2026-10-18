import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, useCallback, useMemo } from 'react'
import { type To, useNavigate, useParams } from 'react-router-dom'

import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { SidebarSkeleton } from '@netcracker/qubership-apihub-ui-shared/components/SidebarSkeleton'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { optionalSearchParams, REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import type { Document } from '@apihub/entities/documents'
import { usePackageVersionConfig } from '@apihub/routes/root/PortalPage/usePackageVersionConfig'
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

  const mcpEndpointByFileKey = useMemo(
    () => buildMcpEndpointByFileKey(versionConfig?.files),
    [versionConfig?.files],
  )

  const sidebarGroups = useMemo(
    () => groupDocumentsForSidebar(documents, mcpEndpointByFileKey),
    [documents, mcpEndpointByFileKey],
  )

  const renderDocumentRow = useCallback((document: Document) => {
    const { key, type, title, version, slug, format, shareabilityStatus } = document
    const displayTitle = version ? `${title} ${version}` : title

    return (
      <ListItem
        key={key}
        sx={{ p: 0 }}
      >
        <ListItemButton
          sx={{
            flexDirection: 'unset',
            backgroundColor: documentId === slug ? '#ECEDEF' : 'transparent',
            height: '36px',
            alignItems: 'center',
            '&:hover': {
              '& .MuiButtonBase-root': {
                visibility: 'visible',
              },
            },
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
          <ListItemShareabilityMarker value={shareabilityStatus} />
          <ListItemActionsButton
            slug={slug}
            docType={type}
            format={format}
            shareabilityStatus={shareabilityStatus}
            icon={<MoreVertIcon sx={{ color: '#626D82' }} fontSize="small" />}
          />
        </ListItemButton>
      </ListItem>
    )
  }, [documentId, escapedVersionKey, navigateToSelectedDocument, packageKey, search])

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

const ListItemShareabilityMarker = styled(ShareabilityMarker)({ marginLeft: 8 })

const ListItemActionsButton = styled(DocumentActionsButton)({
  visibility: 'visible',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: '#ECEDEF',
  },
  width: 24,
  minWidth: 24,
  height: 24,
  paddingLeft: 10,
  paddingRight: 10,
  marginLeft: 0,
})

const DocumentListSubheader = styled(ListSubheader)({
  fontSize: 12,
  lineHeight: '24px',
})
