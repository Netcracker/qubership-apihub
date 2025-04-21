import { Box, Chip, Typography } from '@mui/material'
import type { FC } from 'react'
import React, { memo } from 'react'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { NO_DATA_STRING } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { OasExtension } from '@netcracker/qubership-apihub-ui-shared/entities/package-export-config'

const EXTENSION_NAME_STYLE = { textOverflow: 'ellipsis', overflow: 'hidden' }
export const OasExtensionsList: FC<{ extensions: ReadonlyArray<OasExtension> }> = memo(({ extensions }) => {
  if (isEmpty(extensions)) {
    return <Typography variant="body2">{NO_DATA_STRING}</Typography>
  }

  return (
    <>
      {extensions.map(extension => (
        <Chip
          key={extension.key}
          label={
            <OverflowTooltip
              key={`tooltip-${extension.key}`}
              title={extension.name}>
              <Box sx={EXTENSION_NAME_STYLE}>
                {extension.name}
              </Box>
            </OverflowTooltip>
          }
        />
      ))}
    </>
  )
})

OasExtensionsList.displayName = 'OasExtensionsList'
