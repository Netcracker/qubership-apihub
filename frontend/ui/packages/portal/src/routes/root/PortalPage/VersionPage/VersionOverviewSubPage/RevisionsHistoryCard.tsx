import type { Dispatch, FC, SetStateAction } from 'react'
import React, { memo, useRef, useState } from 'react'
import { usePagedRevisions } from '../usePagedRevisions'
import { useParams } from 'react-router-dom'
import { VersionHistoryTable } from '../../VersionHistoryTable'
import { Box, Tooltip, Typography } from '@mui/material'
import { useFullMainVersion } from '../../FullMainVersionProvider'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { useCurrentPackage } from '@portal/components/CurrentPackageProvider'
import { MetaDataContent } from '@portal/components/MetaDataContent'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'
import type { Revision } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'

export const RevisionsHistoryCard: FC = memo(() => {
  const { packageId } = useParams()
  const currentPackage = useCurrentPackage()
  const [searchValue, setSearchValue] = useState('')
  const fullMainVersion = useFullMainVersion()

  const { data: revisions, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage } = usePagedRevisions({
    packageKey: packageId,
    versionKey: fullMainVersion,
    textFilter: searchValue,
  })

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isFetchingNextPage, hasNextPage, fetchNextPage)

  return (
    <BodyCard
      header={<RevisionsHistoryCardHeader setSearchValue={setSearchValue}/>}
      body={
        <Placeholder
          invisible={isNotEmpty(revisions) || isLoading}
          area={NAVIGATION_PLACEHOLDER_AREA}
          message={searchValue ? NO_SEARCH_RESULTS : 'No revisions to display'}
        >
          <VersionHistoryTable
            value={revisions}
            packageKey={packageId ?? ''}
            kind={currentPackage?.kind}
            hasNextPage={hasNextPage}
            refObject={ref}
            actionsCell={(item) => <RevisionActions revision={item as Revision}/>}
            isLoading={isLoading}
          />
        </Placeholder>}
    />
  )
})

type RevisionsHistoryCardHeaderProps = {
  setSearchValue: Dispatch<SetStateAction<string>>
}

const RevisionsHistoryCardHeader: FC<RevisionsHistoryCardHeaderProps> = memo<RevisionsHistoryCardHeaderProps>(({ setSearchValue }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
      }}
    >
      <Typography variant="inherit">Revision History</Typography>
      <SearchBar onValueChange={setSearchValue} data-testid="SearchRevisions"/>
    </Box>
  )
})

type RevisionActionsProps = {
  revision: Revision
}

const REVISION_ACTION_TOOLTIP_MAX_WIDTH = 332

const RevisionActions: FC<RevisionActionsProps> = memo<RevisionActionsProps>(({ revision }) => {
  const { publishMeta } = revision
  if (publishMeta && isNotEmpty(Object.keys(publishMeta))) {
    return (
      <Tooltip
        disableHoverListener={false}
        title={<MetaDataContent metaData={publishMeta}/>}
        placement="left"
        slotProps={{
          tooltip: { sx: { maxWidth: REVISION_ACTION_TOOLTIP_MAX_WIDTH } },
        }}
      >
        <InfoContextIcon sx={{ visibility: 'hidden' }} className="visible-on-hover" area-label="info"/>
      </Tooltip>
    )
  }

  return null
})
