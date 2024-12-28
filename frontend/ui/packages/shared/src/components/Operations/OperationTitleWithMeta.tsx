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
import React, { memo, useMemo } from 'react'
import { Box, Link, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'
import type { Path } from '@remix-run/router'
import type { Operation } from '../../entities/operations'
import { isGraphQlOperation, isRestOperation } from '../../entities/operations'
import { OverflowTooltip } from '../OverflowTooltip'
import { CustomChip } from '../CustomChip'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'

export type OperationTitleWithMetaProps = {
  operation: Operation
  link?: Partial<Path>
  onLinkClick?: () => void
  badgeText?: string
  openLinkInNewTab?: boolean
  onlyTitle?: boolean
}

// First Order Component //
export const OperationTitleWithMeta: FC<OperationTitleWithMetaProps> = memo<OperationTitleWithMetaProps>((
  {
    operation,
    link,
    onLinkClick,
    badgeText,
    openLinkInNewTab = false,
    onlyTitle = false,
  }) => {

  const { title, subtitle, type } = useMemo(() => {
    if (isRestOperation(operation)) {
      return {
        title: operation.title,
        subtitle: operation.path,
        type: operation.method,
      }
    } else if (isGraphQlOperation(operation)) {
      return {
        title: operation.title,
        subtitle: operation.method,
        type: operation.type,
      }
    } else {
      throw new Error('Operation must be either a REST or GraphQL operation')
    }
  }, [operation])

  const titleNode = link
    ? <Typography noWrap variant="subtitle1">
      <Link
        component={NavLink}
        sx={{ '&:hover': { cursor: 'pointer' } }}
        to={link}
        target={openLinkInNewTab ? '_blank' : '_self'}
        onClick={(event) => {
          event.stopPropagation()
          onLinkClick?.()
        }}
      >
        {title}
      </Link>
    </Typography>
    : <Typography noWrap variant="inherit">{title}</Typography>

  return (
    <Box display="flex" flexDirection="column" width="100%">
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        data-testid="OperationTitle"
      >
        <OverflowTooltip title={title}>
          {titleNode}
        </OverflowTooltip>

        {badgeText &&
          <CustomChip
            value={badgeText.toLowerCase()}
            label={badgeText}
            isExtraSmall
          />
        }
      </Box>
      {!onlyTitle && (
        <Box display="flex" alignItems="center" gap={1} data-testid="OperationPath">
          <CustomChip value={type} variant="outlined"/>
          <TextWithOverflowTooltip tooltipText={subtitle} variant="subtitle2">
            {subtitle}
          </TextWithOverflowTooltip>
        </Box>
      )}
    </Box>
  )
})
