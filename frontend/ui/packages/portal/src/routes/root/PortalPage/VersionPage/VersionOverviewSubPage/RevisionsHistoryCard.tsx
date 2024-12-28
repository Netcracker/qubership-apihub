/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Dispatch, FC, SetStateAction } from 'react'
import React, { memo, useRef, useState } from 'react'
import { usePagedRevisions } from '../usePagedRevisions'
import { useParams } from 'react-router-dom'
import { VersionHistoryTable } from '../../VersionHistoryTable'
import { Box, Typography } from '@mui/material'
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
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { MetaDataContent } from '@apihub/components/MetaDataContent'
import { InfoIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoIcon'
import type { Revision } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'

export const RevisionsHistoryCard: FC = memo(() => {
  const { packageId } = useParams()
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
      <ButtonWithHint
        area-label="info"
        hint={<MetaDataContent metaData={publishMeta}/>}
        size="small"
        sx={{ visibility: 'hidden', height: '20px' }}
        className="hoverable"
        startIcon={<InfoIcon/>}
        disableHint={false}
        disabled={false}
        testId="InfoButton"
        tooltipMaxWidth={REVISION_ACTION_TOOLTIP_MAX_WIDTH}
        tooltipPlacement="left"
      />
    )
  }

  return null
})
