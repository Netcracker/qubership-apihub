import React, { memo } from 'react'
import { Box, List, ListItem, Tooltip, Typography } from '@mui/material'
import { OAS_EXTENSION_KIND_INHERITED, type OasSettingsExtension } from '../package-export-config'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'

type OasExtensionTooltipProps = {
  extension: OasSettingsExtension
}

const LIST_SX = { listStyleType: 'disc', pl: 2 }
const LIST_ITEM_SX = { display: 'list-item', p: 0 }
const LABEL_CONTENT_SX = { textOverflow: 'ellipsis', overflow: 'hidden' }

const getTooltipTitle = (extension: OasSettingsExtension): React.ReactNode => {
  const { name, inheritances = [] } = extension

  if (!inheritances?.length) return <Typography>Extension {name} has no inheritance information</Typography>

  if (inheritances.length === 1) {
    const [{ packageName, packageKind }] = inheritances
    return <Typography variant="body2">The {name} extension is inherited from {packageName} {packageKind}</Typography>
  }

  return (
    <>
      <Typography variant="body2">The {name} extension is inherited from:</Typography>
      <List sx={LIST_SX}>
        {inheritances.map(({ packageName, packageKind }, index) => (
          <ListItem key={index} sx={LIST_ITEM_SX}>
            {packageName} {packageKind}
          </ListItem>
        ))}
      </List>
    </>
  )
}

export const OasExtensionTooltip = memo<OasExtensionTooltipProps>(({ extension }): React.ReactElement => {
  const labelContent = <Box sx={LABEL_CONTENT_SX}>{extension.name}</Box>

  if (extension.kind === OAS_EXTENSION_KIND_INHERITED) {
    return <Tooltip title={getTooltipTitle(extension)}>{labelContent}</Tooltip>
  }

  return <OverflowTooltip title={extension.name}>{labelContent}</OverflowTooltip>
})

OasExtensionTooltip.displayName = 'OasExtensionTooltip'
