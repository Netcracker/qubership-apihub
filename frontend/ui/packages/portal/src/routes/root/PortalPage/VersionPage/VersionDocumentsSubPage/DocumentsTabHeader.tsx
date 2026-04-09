import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, Skeleton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type Dispatch, type FC, memo, type SetStateAction, useCallback } from 'react'

import type { Document } from '@apihub/entities/documents'
import type { Key } from '@apihub/entities/keys'
import {
  type DocumentsTabSubPageKey,
  OPERATIONS_SUB_PAGE,
  OVERVIEW_SUB_PAGE,
} from '@apihub/routes/root/PortalPage/VersionPage/OpenApiViewer/OpenApiViewer'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import type { FileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  isAsyncApiSpecType,
  isGraphQlSpecType,
  isOpenApiSpecType,
  type SpecType,
} from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { DocumentActionsButton } from './DocumentActionsButton'
import { useSelectedSubPage, useSetSelectedSubPage } from './SelectedSubPageProvider'
import { ShareabilityDropdown } from './ShareabilityDropdown'
import { ShareabilityMarker } from './ShareabilityMarker'
import { useDocumentShareabilityState } from './useDocumentShareabilityState'

export type DocumentsTabHeaderProps = {
  title: string
  version?: string
  slug: Key
  type: SpecType
  format: FileFormat
  searchValue: string
  setSearchValue: Dispatch<SetStateAction<string>>
  isLoading?: boolean
  document: Document
}

const MORE_ACTIONS_BUTTON_PROPS = {
  title: 'More',
  variant: 'outlined',
} as const

export const DocumentsTabHeader: FC<DocumentsTabHeaderProps> = (props) => {
  const {
    title,
    version,
    slug,
    type,
    format,
    searchValue,
    setSearchValue,
    isLoading = true,
    document,
  } = props

  const selectedSubPage = useSelectedSubPage()

  const { shareabilityStatus } = document

  const {
    hasPermission: hasShareabilityPermission,
    packageKey: docPackageKey,
    fullVersion,
    isShareabilityStatusLoading,
    handleChange: handleShareabilityChange,
  } = useDocumentShareabilityState(slug)

  if (isLoading) {
    return (
      <TabHeader>
        <TextSection>
          <TitleTextSkeleton />
          <VersionTextSkeleton />
        </TextSection>
        <ActionsSection>
          <ActionsSkeleton />
        </ActionsSection>
      </TabHeader>
    )
  }

  return (
    <TabHeader data-testid="DocumentToolbar">
      <TextSection data-testid="DocumentToolbarTitle">
        <TitleTooltip title={title}>
          <TitleText variant="inherit">
            {title}
          </TitleText>
        </TitleTooltip>
        <TitleSuffix>
          <VersionText variant="body2">
            {version}
          </VersionText>
          {hasShareabilityPermission && docPackageKey && fullVersion
            ? (
              <ShareabilityDropdown
                value={shareabilityStatus}
                onChange={handleShareabilityChange}
                isLoading={isShareabilityStatusLoading}
              />
            )
            : <ShareabilityMarker value={shareabilityStatus} />
          }
        </TitleSuffix>
      </TextSection>
      <ActionsSection>
        {(isOpenApiSpecType(type) || isGraphQlSpecType(type) || isAsyncApiSpecType(type)) && (
          <>
            {selectedSubPage === OPERATIONS_SUB_PAGE && (
              <SearchInput
                value={searchValue}
                onValueChange={setSearchValue}
                data-testid="SearchOperations"
              />
            )}
            <DocumentsSubPageSelector />
          </>
        )}
        <ActionsButton
          slug={slug}
          docType={type}
          format={format}
          shareabilityStatus={shareabilityStatus}
          customProps={MORE_ACTIONS_BUTTON_PROPS}
          startIcon={<MoreButtonIcon fontSize="small" />}
        />
      </ActionsSection>
    </TabHeader>
  )
}

const DocumentsSubPageSelector = memo(() => {
  const selectedSubPage = useSelectedSubPage()
  const setSelectedSubPage = useSetSelectedSubPage()

  const handleSubPageChange = useCallback((newSelectedSubPage: DocumentsTabSubPageKey) => {
    setSelectedSubPage(newSelectedSubPage)
  }, [setSelectedSubPage])

  return (
    <SubPageSelector>
      <Toggler<DocumentsTabSubPageKey>
        mode={selectedSubPage}
        modes={[OVERVIEW_SUB_PAGE, OPERATIONS_SUB_PAGE]}
        onChange={handleSubPageChange}
      />
    </SubPageSelector>
  )
})

const LEFT_SECTION_MIN_WIDTH = 240

const TabHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const TextSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: '0 1 auto',
  minWidth: LEFT_SECTION_MIN_WIDTH,
  overflow: 'hidden',
}))

const TitleSuffix = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0,
}))

const TitleTooltip = styled(OverflowTooltip)({
  display: 'block',
  minWidth: 0,
  flex: '0 1 auto',
})

const TitleText = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const VersionText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  paddingLeft: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
}))

const ActionsSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0,
  marginLeft: 'auto',
}))

const SearchInput = styled(SearchBar)({
  width: '200px',
})

const SubPageSelector = styled(Box)({
  borderRadius: 6,
})

const TitleTextSkeleton = styled(Skeleton)({
  width: 200,
})

const VersionTextSkeleton = styled(Skeleton)({
  width: 36,
})

const ActionsSkeleton = styled(Skeleton)({
  width: 130,
  height: 54,
})

const ActionsButton = styled(DocumentActionsButton)({
  margin: 0,
})

const MoreButtonIcon = styled(MoreVertIcon)(({ theme }) => ({
  color: theme.palette.text.secondary,
}))
