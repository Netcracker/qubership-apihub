import { Box, IconButton, styled, Tooltip } from '@mui/material'
import { type FC, memo, useCallback } from 'react'

import { useEventBus } from '@apihub/routes/EventBusProvider'
import { useFileActions } from '@apihub/routes/root/PortalPage/FilesProvider'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'

const DELETE_ENDPOINT_MESSAGE =
  'Deleting this MCP endpoint will permanently remove the endpoint and all associated artifacts.'

type McpEndpointActionsProps = Readonly<{
  mcpEndpoint: string
  knownEndpoints: ReadonlyArray<string>
}>

export const McpEndpointActions: FC<McpEndpointActionsProps> = memo(({
  mcpEndpoint,
  knownEndpoints,
}) => {
  const { showMcpRenameEndpointDialog, showDeleteFileDialog } = useEventBus()
  const { renameMcpEndpoint, deleteMcpEndpoint } = useFileActions()

  const handleDelete = useCallback((): void => {
    showDeleteFileDialog({
      title: `Delete ${mcpEndpoint}?`,
      message: DELETE_ENDPOINT_MESSAGE,
      onConfirm: () => deleteMcpEndpoint(mcpEndpoint),
    })
  }, [deleteMcpEndpoint, mcpEndpoint, showDeleteFileDialog])

  const handleEdit = useCallback((): void => {
    showMcpRenameEndpointDialog({
      mcpEndpoint: mcpEndpoint,
      knownEndpoints: knownEndpoints,
      onConfirm: (newEndpoint: string) => renameMcpEndpoint(mcpEndpoint, newEndpoint),
      onCancel: () => undefined,
    })
  }, [
    knownEndpoints,
    mcpEndpoint,
    renameMcpEndpoint,
    showMcpRenameEndpointDialog,
  ])

  return (
    <ActionsBox>
      <Tooltip title="Remove">
        <ActionIconButton
          className="hoverable"
          aria-label="Remove"
          onClick={handleDelete}
          data-testid="RemoveButton"
        >
          <DeleteIcon color="#626D82" />
        </ActionIconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <ActionIconButton
          className="hoverable"
          aria-label="Edit"
          onClick={handleEdit}
          data-testid="EditButton"
        >
          <EditIcon color="#626D82" />
        </ActionIconButton>
      </Tooltip>
    </ActionsBox>
  )
})

McpEndpointActions.displayName = 'McpEndpointActions'

const ActionsBox = styled(Box)({
  display: 'flex',
  gap: '8px',
  justifyContent: 'flex-end',
})

const ActionIconButton = styled(IconButton)({
  visibility: 'hidden',
  padding: 0,
})
