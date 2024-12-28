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

import type { FC, SyntheticEvent } from 'react'
import { memo, useCallback } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'
import { DashboardPackageSelector } from './DashboardPackageSelector'
import { OperationGroupFilter } from './OperationGroupFilter'
import { ApiKindFilter } from './ApiKindFilter'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { PackageReference } from '../../entities/version-references'
import type { OperationGroupName } from '../../entities/operation-groups'
import type { ApiAudience, ApiKind, Tags } from '../../entities/operations'
import type { PackageVersionContent } from '../../entities/version-contents'
import { SidebarWithTags } from '../SidebarWithTags/SidebarWithTags'
import type { ApiType } from '../../entities/api-types'
import { ApiAudienceFilter } from './ApiAudienceFilter'
import type { HasNextPage, IsFetchingNextPage } from '../../utils/aliases'

export type OperationFiltersProps = {
  selectedPackageKey?: string
  onSelectPackage?: (packageRef: PackageReference | null) => void
  selectedOperationGroupName?: OperationGroupName
  onSelectOperationGroup?: (operationGroupName?: OperationGroupName) => void
  selectedApiAudience?: ApiAudience
  onSelectApiAudience?: (value?: ApiAudience) => void
  selectedApiKind?: ApiKind
  onSelectApiKind?: (value?: ApiKind) => void
  hiddenGeneralFilters: boolean
  onClickExpandCollapseButton: (value: boolean) => void
  areTagsLoading: boolean
  fetchNextTagsPage?: () => Promise<void>
  isNextTagsPageFetching?: IsFetchingNextPage
  hasNextTagsPage?: HasNextPage
  isReferencesLoading: boolean
  isPackageVersionContentLoading: boolean
  tags: Tags
  references: PackageReference[]
  apiType: ApiType
  versionContent: PackageVersionContent | null
  onTagSearch?: (value: string) => void
  selectedTag?: string
  onSelectTag: (value?: string) => void
}

// First Order Component //
export const OperationFilters: FC<OperationFiltersProps> = memo<OperationFiltersProps>(props => {
  const {
    selectedPackageKey, selectedOperationGroupName, selectedApiAudience, selectedApiKind,
    onSelectPackage, onSelectOperationGroup, onSelectApiAudience, onSelectApiKind, onClickExpandCollapseButton,
    areTagsLoading, fetchNextTagsPage, hasNextTagsPage, isNextTagsPageFetching,
    isReferencesLoading, isPackageVersionContentLoading, hiddenGeneralFilters,
    tags, references, versionContent, apiType,
    onSelectTag, onTagSearch, selectedTag,
  } = props

  const onChange = useCallback(
    (_event: SyntheticEvent, expanded: boolean) => onClickExpandCollapseButton(!expanded),
    [onClickExpandCollapseButton],
  )

  return (
    <>
      <Box
        sx={{
          borderBottom: '1px solid #D9D9D9',
          p: 2,
        }}
      >
        <Accordion
          expanded={!hiddenGeneralFilters}
          onChange={onChange}
          data-testid="GeneralFiltersAccordion"
        >
          <AccordionSummary
            sx={{ p: 0 }}
            expandIcon={<ExpandMoreIcon />}
          >
            <Typography width="100%" noWrap variant="button">
              General Filters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {onSelectPackage && (
              <DashboardPackageSelector
                onSelectPackage={onSelectPackage}
                references={references}
                isLoading={isReferencesLoading}
                defaultPackageKey={selectedPackageKey}
                required={false}
              />
            )}
            {onSelectOperationGroup && (
              <Box sx={{ mt: onSelectPackage ? 1 : 0 }}>
                <OperationGroupFilter
                  value={selectedOperationGroupName}
                  onSelectValue={onSelectOperationGroup}
                  isLoading={isPackageVersionContentLoading}
                  apiType={apiType as ApiType}
                  versionContent={versionContent}
                />
              </Box>
            )}
            {onSelectApiAudience && (
              <Box sx={{ mt: onSelectPackage || onSelectOperationGroup ? 1 : 0 }}>
                <ApiAudienceFilter
                  value={selectedApiAudience}
                  onSelectApiAudience={onSelectApiAudience}
                />
              </Box>
            )}
            {onSelectApiKind && (
              <Box sx={{ mt: onSelectPackage || onSelectOperationGroup || onSelectApiAudience ? 1 : 0 }}>
                <ApiKindFilter
                  value={selectedApiKind}
                  onSelectApiKind={onSelectApiKind}
                />
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>
      <SidebarWithTags
        tags={tags}
        areTagsLoading={areTagsLoading}
        fetchNextTagsPage={fetchNextTagsPage}
        isNextTagsPageFetching={isNextTagsPageFetching}
        hasNextTagsPage={hasNextTagsPage}
        onSearch={onTagSearch}
        selectedTag={selectedTag}
        onSelectTag={onSelectTag}
      />
    </>
  )
})
