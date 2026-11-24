import { Autorenew } from '@mui/icons-material'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'

export const ModuleFetchingErrorPopup: FC<PropsWithChildren> = () => (
  <Dialog
    open
    PaperProps={{
      sx: {
        borderRadius: '10px',
      },
    }}
  >
    <DialogTitle>
      APIHUB UI is out of date
    </DialogTitle>
    <DialogContent>
      <DialogContentText
        variant="body2"
        data-testid="ModuleFetchingErrorDialogContent"
      >
        Please reload the page to get the latest version;
        otherwise, APIHUB UI may not function correctly
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button
        variant="contained"
        startIcon={<Autorenew/>}
        onClick={() => { location.reload() }}
      >
        Reload
      </Button>
    </DialogActions>
  </Dialog>
)
