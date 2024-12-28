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
import React, { memo, useCallback, useMemo } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Skeleton, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { OperationsListOnComparison } from './OperationsListOnComparison'
import type { OperationsGroupedByTag } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationChangeData } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { GROUP_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

export type OperationsByTagListProps = {
  tag: string
  operationsGroupedByTag: OperationsGroupedByTag<OperationChangeData>
  isLoading: boolean
  expanded: readonly string[]
  setExpanded: Dispatch<SetStateAction<readonly string[]>>
  onOperationClick: (key: Key) => void
}
export const OperationsByTagList: FC<OperationsByTagListProps> = memo<OperationsByTagListProps>(props => {
  const {
    tag,
    operationsGroupedByTag,
    isLoading = true,
    expanded,
    setExpanded,
  } = props
  const operationsList = operationsGroupedByTag[tag]

  const group = useSearchParam(GROUP_SEARCH_PARAM)

  const handleTagSelection = useCallback((tag: string) => {
    setExpanded(prevState => (
      !prevState.includes(tag)
        ? [...prevState, tag]
        : prevState.filter(key => key !== tag)
    ))
  }, [setExpanded])

  const isTagExpanded = useMemo(() => expanded.includes(tag), [expanded, tag])
  const onChange = useCallback(() => handleTagSelection(tag), [handleTagSelection, tag])

  return (
    <Accordion expanded={isTagExpanded} onChange={onChange}>
      <AccordionSummary
        sx={ACCORDION_SUMMARY_STYLE}
        expandIcon={<ExpandMoreIcon/>}
        data-testid="TagAccordionButton"
      >
        <Typography width="100%" noWrap variant="button">{tag}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {
          isTagExpanded && (
            group ? (
                <OperationsListOnComparison
                  changedOperations={operationsList}
                />
              )
              : (
                <OperationsListOnComparison
                  changedOperations={operationsList}
                />
              )
          )
        }
        {isLoading && <Skeleton sx={{ ml: 4, mr: 1 }}/>}
      </AccordionDetails>
    </Accordion>
  )
})

const ACCORDION_SUMMARY_STYLE = {
  '&.MuiButtonBase-root': {
    '&.MuiAccordionSummary-root': {
      '.MuiAccordionSummary-content': {
        width: '100%',
        display: 'contents',
      },
    },
  },
}
