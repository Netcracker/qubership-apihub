import { Box, Link, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { Path } from '@remix-run/router'
import type { FC } from 'react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import type { McpContractEntity } from '../../entities/contracts-mcp'
import { getMcpContractEntityDescription, getMcpContractEntityDisplayName } from '../../entities/contracts-mcp'
import { EMPTY_SUBTITLE_PLACEHOLDER } from '../../utils/placeholders'
import { OverflowTooltip } from '../OverflowTooltip'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'

export type McpEntityTitleWithMetaProps = {
  entity: McpContractEntity
  link?: Partial<Path>
  onLinkClick?: () => void
  onlyTitle?: boolean
}

export const McpEntityTitleWithMeta: FC<McpEntityTitleWithMetaProps> = memo<McpEntityTitleWithMetaProps>(({
  entity,
  link,
  onLinkClick,
  onlyTitle = false,
}) => {
  const displayName = getMcpContractEntityDisplayName(entity)
  const description = getMcpContractEntityDescription(entity)

  const titleNode = link
    ? (
      <Typography noWrap variant="subtitle1">
        <Link
          component={NavLink}
          to={link}
          onClick={(event) => {
            event.stopPropagation()
            onLinkClick?.()
          }}
        >
          {displayName}
        </Link>
      </Typography>
    )
    : <Typography noWrap variant="inherit">{displayName}</Typography>

  return (
    <TitleColumn>
      <TitleRow>
        <OverflowTooltip title={displayName}>
          {titleNode}
        </OverflowTooltip>
      </TitleRow>
      {!onlyTitle && (
        <SubtitleRow data-testid="McpEntitySubtitle">
          <TextWithOverflowTooltip tooltipText={description} variant="subtitle2">
            {description ?? EMPTY_SUBTITLE_PLACEHOLDER}
          </TextWithOverflowTooltip>
        </SubtitleRow>
      )}
    </TitleColumn>
  )
})

McpEntityTitleWithMeta.displayName = 'McpEntityTitleWithMeta'

const TitleColumn = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
})

const TitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const SubtitleRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  minHeight: 20,
}))
