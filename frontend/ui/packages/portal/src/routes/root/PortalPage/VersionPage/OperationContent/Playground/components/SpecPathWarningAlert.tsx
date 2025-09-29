import { type FC, memo } from 'react'
import { Alert } from '@mui/material'
import { InfoContextIcon } from '@netcracker/qubership-apihub-ui-shared/icons/InfoContextIcon'

type SpecPathWarningAlertProps = {
  path: string
}

export const SpecPathWarningAlert: FC<SpecPathWarningAlertProps> = memo(({ path }) => (
  <Alert
    severity="info"
    sx={{
      mt: 2,
      color: 'black',
      backgroundColor: 'rgba(242, 243, 245, 0.5)', // equivalent to MuiFilledInput #F2F3F5 at 50% opacity
      '& .MuiAlert-message': {
        fontSize: '12px',
        lineHeight: '16px',
      },
    }}
    icon={<InfoContextIcon color="action" />}
  >
    {`Servers specified directly in the OpenAPI specification contain a path to a specific resource. Make sure the URL you enter is correct, and you may need to add an additional path (e.g. ${path}).`}
  </Alert>
))
