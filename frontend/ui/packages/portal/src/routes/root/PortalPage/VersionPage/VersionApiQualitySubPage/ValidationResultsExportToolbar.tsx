import type { Issue } from '@apihub/entities/api-quality/issues'
import { useShowSuccessNotification } from '@apihub/routes/root/BasePage/Notification'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { Button } from '@mui/material'
import { DownloadIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DownloadIcon'
import fileDownload from 'js-file-download'
import { memo, useCallback, useMemo, type FC } from 'react'
import { useCopyToClipboard } from 'react-use'

type ValidationResultsExportToolbarProps = {
  disabled?: boolean
  data: Issue[]
}

export const ValidationResultsExportToolbar: FC<ValidationResultsExportToolbarProps> = memo<ValidationResultsExportToolbarProps>((props) => {
  const { data, disabled = false } = props

  const preparedData = useMemo(() => prepareDataForExport(data), [data])

  const showNotification = useShowSuccessNotification()
  const [, copyToClipboard] = useCopyToClipboard()

  const handleDownload = useCallback(() => {
    fileDownload(preparedData, 'validation-results.json')
  }, [preparedData])

  const handleCopy = useCallback(() => {
    copyToClipboard(preparedData)
    showNotification({ message: 'Data copied to clipboard' })
  }, [copyToClipboard, preparedData, showNotification])

  return (
    <>
      <Button
        disabled={disabled}
        size="small"
        className="hoverable"
        variant="outlined"
        sx={{
          padding: '8px 5px',
          minWidth: '10px',
        }}
        onClick={handleDownload}
      >
        <DownloadIcon color='#353C4E' />
      </Button>
      <Button
        disabled={disabled}
        size="small"
        className="hoverable"
        variant="outlined"
        sx={{
          padding: '8px 5px',
          minWidth: '10px',
        }}
        onClick={handleCopy}
      >
        <ContentCopyOutlinedIcon fontSize='small' htmlColor='#353C4E' />
      </Button>
    </>
  )
})

function prepareDataForExport(data: Issue[]): string {
  return JSON.stringify(data, null, 2)
}
