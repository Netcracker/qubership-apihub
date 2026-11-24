import type { ChangeEvent, FC } from 'react'
import { memo } from 'react'
import type { ButtonProps } from '@mui/material'
import { Box, Button } from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import type { SxProps } from '@mui/system'

export type UploadButtonProps = {
  title: string
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  acceptableFileTypes?: readonly string[]
  buttonSxProp?: SxProps
  withIcon?: boolean
  multiple?: boolean
} & ButtonProps

export const UploadButton: FC<UploadButtonProps> = memo<UploadButtonProps>(({
  title,
  acceptableFileTypes,
  onUpload,
  withIcon = false,
  buttonSxProp,
  multiple = false,
  ...buttonProps
}) => {
  return (
    <Box
      component="label"
      htmlFor="contained-button-file"
    >
      <Box
        component="input"
        id="contained-button-file"
        display="none"
        multiple={multiple}
        type="file"
        accept={acceptableFileTypes?.toString()}
        // A click on the label opens the file dialog even when the button is disabled, so the input is disabled too.
        disabled={buttonProps.disabled}
        onChange={onUpload}
        onClick={(event) => {
          // Reset the input value to allow the same file to be selected again
          event.currentTarget.value = ''
        }}
        data-testid="UploadButtonInput"
      />
      <Button
        sx={buttonSxProp}
        component="span"
        startIcon={withIcon ? <CloudUploadOutlinedIcon/> : undefined}
        {...buttonProps}
      >
        {title}
      </Button>
    </Box>
  )
})
