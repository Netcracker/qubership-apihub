import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Button, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material'
import type { FC } from 'react'
import React, { memo, useCallback } from 'react'
import { DialogForm } from './DialogForm'
import type { PopupProps } from './PopupDelegate'
import { PopupDelegate } from './PopupDelegate'
import type { TestableProps } from './Testable'

export const EmptyPackageDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EMPTY_PACKAGE_DIALOG}
      render={props => <EmptyPackagePopup {...props} />}
    />
  )
})

export const SHOW_EMPTY_PACKAGE_DIALOG = 'show-empty-package-dialog'

export type EmptyPackageItem = {
  label: string
  navigate: () => void
  description: string
} & TestableProps

export type ShowEmptyPackageDetail = {
  emptyPackageData: EmptyPackageItem[]
}

export const EmptyPackagePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { emptyPackageData } = detail as ShowEmptyPackageDetail

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="440px"
    >
      <DialogTitle>
        Methods for API Documentation Upload
      </DialogTitle>
      <DialogContent
        sx={{
          width: 'auto',
          minWidth: 'unset',
        }}
      >
        {emptyPackageData.map(({ label, navigate, description, 'data-testid': dataTestId }, index) => (
          <React.Fragment key={index}>
            <Box
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                onClose()
                navigate()
              }}
              data-testid={dataTestId}
            >
              <Box display="flex" justifyContent="space-between">
                <Typography variant="subtitle1" fontSize={13}>
                  {label}
                </Typography>
                <ChevronRightIcon />
              </Box>
              <Typography variant="body2" fontSize={13} maxWidth="352px">
                {description}
              </Typography>
            </Box>
            <Divider orientation="horizontal" sx={DIVIDER_STYLES} />
          </React.Fragment>
        ))}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={onClose}
          data-testid="GotItButton"
        >
          Got it
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

const DIVIDER_STYLES = {
  borderWidth: '0 0 1px 0',
  borderColor: '#D9D9D9',
  margin: '9px 0',
}
