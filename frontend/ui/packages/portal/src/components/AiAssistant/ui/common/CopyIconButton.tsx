import IconButton from '@mui/material/IconButton'
import { type FC, memo } from 'react'

import { CheckIconMui } from '@netcracker/qubership-apihub-ui-shared/icons/CheckIconMui'
import { CopyIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CopyIcon'

type CopyIconButtonProps = {
  ariaLabel: string
  copied: boolean
  onCopy: () => void
}

export const CopyIconButton: FC<CopyIconButtonProps> = memo(({ ariaLabel, copied, onCopy }) => (
  <IconButton aria-label={ariaLabel} size="small" onClick={onCopy}>
    {copied ? <CheckIconMui fontSize="small" /> : <CopyIcon fontSize="small" />}
  </IconButton>
))

CopyIconButton.displayName = 'CopyIconButton'
