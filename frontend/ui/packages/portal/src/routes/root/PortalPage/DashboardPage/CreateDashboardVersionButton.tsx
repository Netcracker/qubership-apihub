import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigation } from '../../../NavigationProvider'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { SPECIAL_VERSION_KEY } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { ButtonGroupProps, ButtonProps } from '@mui/material'
import { Box, Button, MenuItem, Typography } from '@mui/material'
import { MultiButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MultiButton'
import { useEventBus } from '@portal/routes/EventBusProvider'
import type { SxProps } from '@mui/system'

export type CreateVersionButtonProps = {
  disabled: boolean
  variant?: ButtonGroupProps['variant']
  primaryButtonProps?: ButtonProps
  sx?: SxProps
}

export const CreateDashboardVersionButton: FC<CreateVersionButtonProps> = memo(({
  disabled,
  variant = 'contained',
  primaryButtonProps,
  sx,
}) => {
  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const { navigateToVersion } = useNavigation()
  const { packageId } = useParams()
  const handleClick = useCallback(
    () => {
      setBackwardLocation({ ...backwardLocation, fromPackage: location })
      navigateToVersion({ packageKey: packageId!, versionKey: SPECIAL_VERSION_KEY, edit: true })
    },
    [backwardLocation, location, navigateToVersion, packageId, setBackwardLocation],
  )

  const { showPublishPackageVersionDialog } = useEventBus()

  return (
    <MultiButton
      sx={sx}
      buttonGroupProps={{
        sx: { marginLeft: 'auto', minWidth: 'max-content' },
        variant: variant,
        disabled: disabled,
      }}
      arrowButtonProps={{
        sx: { p: 0, width: '32px', '&.MuiButtonGroup-grouped': { minWidth: '32px' } },
      }}
      disableHint={!disabled}
      hint="You do not have permission to create the version"
      primary={
        <Button
          variant={variant}
          onClick={handleClick}
          data-testid="CreateVersionButton"
          {...primaryButtonProps}
        >
          Create Version
        </Button>
      }
      secondary={
        <Box>
          <MenuItem onClick={handleClick}>
            <Typography component="span" variant="body2">Manually&nbsp;</Typography>
            <Typography component="span" variant="body2" color="#626D82">(default)</Typography>
          </MenuItem>
          <MenuItem onClick={showPublishPackageVersionDialog}>
            Import from CSV
          </MenuItem>
        </Box>
      }
    />
  )
})
