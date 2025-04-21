import { Box } from '@mui/material'
import type { FC } from 'react'
import React, { memo, useCallback } from 'react'
import type { PackageSettingsTabProps } from '../package-settings'
import { EditPreservedOasExtensionsDialog } from './EditPreservedOasExtensionsDialog'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { SettingsEditableParameter } from '@netcracker/qubership-apihub-ui-shared/components/SettingsEditableParameter'
import {
  useAllowedOasExtensions,
} from '@netcracker/qubership-apihub-ui-shared/hooks/package-export-config/usePackageExportConfig'
import { OasExtensionsList } from './OasExtensionsList'

const BODY_CONTAINER_SX = {
  mt: 1,
  mb: 2,
  overflow: 'hidden',
  height: '100%',
}
const SETTINGS_PARAMETER_CONTAINER_SX = {
  width: 280,
  display: 'flex',
  gap: 1,
}
export const ExportSettingsTab: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({ packageObject }) => {
  const { showEditPreservedOasExtensionsDialog } = useEventBus()
  const { oasExtensions, isOasExtensionsLoading } = useAllowedOasExtensions(packageObject.key)

  const handleEditPreservedOasExtensions = useCallback(() => {
    showEditPreservedOasExtensionsDialog({
      packageKey: packageObject.key,
      oasExtensions: [...oasExtensions],
    })
  }, [oasExtensions, packageObject.key, showEditPreservedOasExtensionsDialog])

  return (
    <Box height="100%">
      <BodyCard
        header="Export Settings"
        body={
          <Box sx={BODY_CONTAINER_SX}>
            <Box sx={SETTINGS_PARAMETER_CONTAINER_SX}>
              <SettingsEditableParameter
                title="List of OAS Extensions Preserved on Export"
                packageObject={packageObject}
                onEdit={handleEditPreservedOasExtensions}
                isLoading={isOasExtensionsLoading}
                data-testid="ListOfOasExtensionsSettingsParameter"
              >
                <OasExtensionsList extensions={oasExtensions}/>
              </SettingsEditableParameter>
            </Box>
          </Box>
        }
      />
      <EditPreservedOasExtensionsDialog/>
    </Box>
  )
})

ExportSettingsTab.displayName = 'ExportSettingsTab'
