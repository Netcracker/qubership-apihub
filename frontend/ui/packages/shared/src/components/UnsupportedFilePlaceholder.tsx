import type { FC } from 'react'
import { memo } from 'react'
import { Box, Button } from '@mui/material'

export type UnsupportedFilePlaceholderProps = {
  onDownload?: () => void
  message: string
  buttonLabel?: string
}

export const UnsupportedFilePlaceholder: FC<UnsupportedFilePlaceholderProps> = memo<UnsupportedFilePlaceholderProps>(({
  onDownload,
  message,
  buttonLabel = 'Download',
}) => {
  return (
    <Box height="100%" display="flex" alignItems="center" data-testid="UnsupportedFilePlaceholder">
      <Box sx={{
        display: 'grid',
        justifyItems: 'center',
        width: '100%',
        gridTemplateAreas: `
          'title'
          'button'
      `,
      }}>
        <Box sx={{gridArea: 'title'}}>
          {message}
        </Box>
        {
          onDownload &&
          <Button sx={{gridArea: 'button'}} onClick={onDownload} data-testid="DownloadButton">
            {buttonLabel}
          </Button>
        }
      </Box>
    </Box>
  )
})
