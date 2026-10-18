import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, Button, Typography } from '@mui/material'
import type { Path } from '@remix-run/router'
import { type FC, memo, useCallback, useState } from 'react'

import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { McpEntityWithMetaList } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpEntityWithMetaList'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { McpContractEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type McpEntitySelectorProps = {
  entities: ReadonlyArray<McpContractEntity>
  isLoading?: boolean
  sectionTitle: string
  emptyMessage: string
  prepareLinkFn: (entity: McpContractEntity) => Partial<Path>
}

export const McpEntitySelector: FC<McpEntitySelectorProps> = memo<McpEntitySelectorProps>(({
  entities,
  isLoading,
  sectionTitle,
  emptyMessage,
  prepareLinkFn,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const onClose = useCallback(() => setAnchor(undefined), [])

  return (
    <Box display="flex" alignItems="center" overflow="hidden" data-testid="McpEntitySelector">
      <Button
        sx={{ minWidth: 4, height: 20, p: 0, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
        variant="text"
        aria-label={`Open ${sectionTitle}`}
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon />}
      >
        <MenuButtonItems
          anchorEl={anchor}
          open={!!anchor}
          onClick={event => event.stopPropagation()}
          onClose={onClose}
        >
          <Box p={2} width="370px" maxHeight="480px" overflow="scroll">
            <Typography variant="subtitle2" fontSize={13} mb={1}>{sectionTitle}</Typography>
            {isLoading
              ? <LoadingIndicator />
              : (
                <Placeholder
                  invisible={isNotEmpty(entities)}
                  area={NAVIGATION_PLACEHOLDER_AREA}
                  message={emptyMessage}
                >
                  <McpEntityWithMetaList
                    entities={entities}
                    prepareLinkFn={prepareLinkFn}
                    onClick={onClose}
                  />
                </Placeholder>
              )}
          </Box>
        </MenuButtonItems>
      </Button>
    </Box>
  )
})

McpEntitySelector.displayName = 'McpEntitySelector'
