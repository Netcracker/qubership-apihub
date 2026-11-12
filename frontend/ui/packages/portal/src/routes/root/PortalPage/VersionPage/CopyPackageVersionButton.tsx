import { memo } from 'react'
import { Button } from '@mui/material'
import { useEventBus } from '@portal/routes/EventBusProvider'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { CopyPackageVersionDialog } from '@portal/routes/root/PortalPage/CopyPackageVersionDialog'

export const CopyPackageVersionButton = memo(() => {
  const { showCopyPackageVersionDialog } = useEventBus()

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<ContentCopyOutlinedIcon/>}
        onClick={showCopyPackageVersionDialog}
        data-testid="CopyVersionButton"
      >
        Copy
      </Button>

      <CopyPackageVersionDialog/>
    </>
  )
})
