import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Box, Button, Typography } from '@mui/material'
import type { Path } from '@remix-run/router'
import { type FC, memo, useCallback, useState } from 'react'

import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { DdlTableWithMetaList } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableWithMetaList'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { DdlContractEntity } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { DDL_TABLES_EMPTY_MESSAGE } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export type DdlTableSelectorProps = {
  tables: ReadonlyArray<DdlContractEntity>
  isLoading?: boolean
  sectionTitle?: string
  emptyMessage?: string
  prepareLinkFn: (table: DdlContractEntity) => Partial<Path>
}

export const DdlTableSelector: FC<DdlTableSelectorProps> = memo<DdlTableSelectorProps>(({
  tables,
  isLoading,
  sectionTitle = 'Tables',
  emptyMessage = DDL_TABLES_EMPTY_MESSAGE,
  prepareLinkFn,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const onClose = useCallback(() => setAnchor(undefined), [])

  return (
    <Box display="flex" alignItems="center" overflow="hidden" data-testid="DdlTableSelector">
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
                  invisible={isNotEmpty(tables)}
                  area={NAVIGATION_PLACEHOLDER_AREA}
                  message={emptyMessage}
                >
                  <DdlTableWithMetaList
                    tables={tables}
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

DdlTableSelector.displayName = 'DdlTableSelector'
