import type { FC, ReactNode } from 'react'
import { memo, useMemo } from 'react'
import { Box, ButtonBase, styled } from '@mui/material'

import { OverflowTooltip } from '../OverflowTooltip'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'

const DEFAULT_ICON_TEXT_GAP = '4px'

export const FileCellContent: FC<{
  fileKey: string
  file: File
  getFileClickHandler: (file: File) => ((file: File) => void) | null
  getFileLeftIcon: (file: File) => ReactNode
  getFileRightIcon: (file: File) => ReactNode
  iconTextGap?: string
}> = memo(({
  fileKey,
  file,
  getFileClickHandler,
  getFileLeftIcon,
  getFileRightIcon,
  iconTextGap = DEFAULT_ICON_TEXT_GAP,
}) => {
  const onTitleClick = useMemo(() => getFileClickHandler(file), [file, getFileClickHandler])
  const leftIcon = useMemo(() => getFileLeftIcon(file), [file, getFileLeftIcon])
  const rightIcon = useMemo(() => getFileRightIcon(file), [file, getFileRightIcon])
  const isClickable = onTitleClick !== null

  function handleTitleClick(): void {
    onTitleClick?.(file)
  }

  return (
    <IconTextRow key={fileKey} iconTextGap={iconTextGap}>
      {leftIcon}
      <TitleArea>
        {isClickable
          ? (
            <OverflowTooltip title={file.name}>
              <ButtonBase
                type="button"
                onClick={handleTitleClick}
                data-testid="FileTitleButton"
              >
                {file.name}
              </ButtonBase>
            </OverflowTooltip>
          )
          : (
            <TextWithOverflowTooltip tooltipText={file.name}>
              {file.name}
            </TextWithOverflowTooltip>
          )}
      </TitleArea>
      {rightIcon}
    </IconTextRow>
  )
})
FileCellContent.displayName = 'FileCellContent'

const IconTextRow = styled(Box, {
  shouldForwardProp: prop => prop !== 'iconTextGap',
})<{ iconTextGap: string }>(({ iconTextGap }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: iconTextGap,
}))

const TitleArea = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'hidden',
  '& .MuiButtonBase-root': {
    ...theme.typography.body2,
    display: 'block',
    width: '100%',
    padding: 0,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: theme.palette.primary.main,
  },
}))
