import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import fileDownload from 'js-file-download'
import { CloseIcon } from '../icons/CloseIcon'
import { CopyIcon } from '../icons/CopyIcon'
import { DownloadIconMui } from '../icons/DownloadIconMui'

export type PublicationErrorReportDialogProps = {
  open: boolean
  onClose: () => void
  downloadFilename: string
  errors: string
}

export const PublicationErrorReportDialog: FC<PublicationErrorReportDialogProps> = memo<PublicationErrorReportDialogProps>(({
  open,
  onClose,
  downloadFilename,
  errors,
}) => {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(errors).catch()
  }, [errors])

  const handleDownload = useCallback(() => {
    fileDownload(errors, downloadFilename, 'text/plain')
  }, [errors, downloadFilename])

  return (
    <Dialog
      maxWidth="md"
      fullWidth
      open={open}
      onClose={onClose}
    >
      <StyledDialogTitle>
        <TitleRow>
          <Typography variant="h5" data-testid="ErrorReportTitle">
            Error Details
          </Typography>
          <TitleActions>
            <Button
              data-testid="CopyErrorsButton"
              size="small"
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={handleCopy}
            >
              Copy
            </Button>
            <Button
              data-testid="DownloadErrorsButton"
              variant="outlined"
              size="small"
              startIcon={<DownloadIconMui fontSize="small" />}
              onClick={handleDownload}
            >
              Download
            </Button>
            <CloseIconButton
              data-testid="CloseErrorReportButton"
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="small"/>
            </CloseIconButton>
          </TitleActions>
        </TitleRow>
      </StyledDialogTitle>

      <Divider/>

      <StyledDialogContent>
        <ErrorText
          data-testid="ErrorReportContent"
        >
          {errors}
        </ErrorText>
      </StyledDialogContent>
    </Dialog>
  )
})

PublicationErrorReportDialog.displayName = 'PublicationErrorReportDialog'

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(1.5, 2.5),
}))

const TitleRow = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const TitleActions = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginLeft: 'auto',
})

const CloseIconButton = styled(IconButton)({
  padding: 0,
  marginLeft: 'auto',
})

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2, 2.5),
  maxHeight: '60vh',
  overflow: 'auto',
  width: '100%',
}))

const ErrorText = styled(Typography)({
  fontFamily: 'monospace',
  fontSize: 13,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.6})
