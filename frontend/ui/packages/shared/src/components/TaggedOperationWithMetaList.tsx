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

import type { FC } from 'react'
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { Path } from '@remix-run/router'
import Box from '@mui/material/Box'
import type { OperationData, OperationsGroupedByTag } from '../entities/operations'
import { LoadingIndicator } from './LoadingIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from './Placeholder'
import { isNotEmpty } from '../utils/arrays'
import { CustomAccordion } from './CustomAccordion'
import { OperationWithMetaList } from './Operations/OperationWithMetaList'

export type TaggedOperationWithMetaListProps = {
  operations: OperationsGroupedByTag
  onClick?: () => void
  prepareLinkFn: (operation: OperationData) => Partial<Path>
  isLoading?: boolean
  openLinkInNewTab?: boolean
}

export const TaggedOperationWithMetaList: FC<TaggedOperationWithMetaListProps> = memo<TaggedOperationWithMetaListProps>((props) => {
  const { operations, onClick, prepareLinkFn, isLoading = false, openLinkInNewTab } = props

  const [expandedTags, setExpandedTags] = useState<string[]>([])
  const handleExpandedTags = useCallback((tag: string) => {
    setExpandedTags(prevState => (
      !prevState.includes(tag)
        ? [...prevState, tag]
        : prevState.filter(key => key !== tag)
    ))
  }, [setExpandedTags])

  const relatedTags = useMemo(() => Object.keys(operations), [operations])

  useEffect(() => setExpandedTags(relatedTags), [relatedTags])

  return (
    <Box width="100%">
      {isLoading
        ? <LoadingIndicator/>
        : <Placeholder
          invisible={isNotEmpty(relatedTags) || isLoading}
          area={NAVIGATION_PLACEHOLDER_AREA}
          message="No operations"
        >
          {Object.entries(operations)?.map(([tag, operations]) => {
            return (
              <Box width="100%" mb={1} key={tag}>
                <CustomAccordion
                  expanded={expandedTags.includes(tag)}
                  title={tag}
                  accordionDetails={
                    <OperationWithMetaList
                      operations={operations}
                      prepareLinkFn={prepareLinkFn}
                      onClick={onClick}
                      nestedList
                      openLinkInNewTab={openLinkInNewTab}
                    />
                  }
                  setExpanded={() => handleExpandedTags(tag)}
                />
              </Box>
            )
          })}
        </Placeholder>
      }
    </Box>
  )
})
