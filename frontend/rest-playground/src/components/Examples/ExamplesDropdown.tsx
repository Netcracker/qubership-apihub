import { MenuItem } from '@mui/material'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import { safeStringify } from '@stoplight/json'
import { INodeExample, INodeExternalExample } from '@stoplight/types'
import { FC, memo, useCallback, useEffect, useState } from 'react'

import { useExampleMenuItems } from '../../hooks/useExampleMenuItems'
import { MenuItemContent } from '../MenuItemContent'

const STYLE_MENU_ITEM = { width: '100%', display: 'flex', alignItems: 'center' }

export type ExamplesDropdownProps = {
  examples: ReadonlyArray<INodeExample | INodeExternalExample>;
  requestResponseBody: string;
  onChange: (newRequestBody: string) => void;
  onSelectExample?: (example: INodeExample | INodeExternalExample | undefined) => void;
};

export const ExamplesDropdown: FC<ExamplesDropdownProps> = memo<ExamplesDropdownProps>(
  ({ examples, requestResponseBody, onChange, onSelectExample }) => {
    const { menuItems, findMenuItem, renderMenuItemTitle } = useExampleMenuItems(examples)

    const [selectedId, setSelectedId] = useState<string | undefined>()
    const selectedItem = findMenuItem(selectedId) ?? menuItems[0]

    useEffect(() => setSelectedId(menuItems.length ? menuItems[0].id : undefined), [menuItems])

    const [open, setOpen] = useState(false)
    const handleClose = () => {
      setOpen(false)
    }
    const handleOpen = () => {
      setOpen(true)
    }

    const handleClick = useCallback(
      event => {
        const item = findMenuItem(event.target.value)

        onChange(
          item
            ? safeStringify('value' in item.example ? item.example.value : item.example.externalValue, undefined, 2) ??
                ''
            : requestResponseBody,
        )
        setSelectedId(item?.id)
        setOpen(false)
      },
      [findMenuItem, onChange, requestResponseBody],
    )

    useEffect(() => {
      onSelectExample?.(selectedItem?.example)
    }, [onSelectExample, selectedItem])

    return (
      <FormControl size="small" fullWidth>
        <Select
          open={open}
          onClose={handleClose}
          onOpen={handleOpen}
          onChange={handleClick}
          value={selectedItem?.id ?? ''}
          renderValue={renderMenuItemTitle}
          className="MuiInputBase-root MuiSelect-select custom"
        >
          {menuItems.map(({ id, title, subtitle }) => {
            return (
              <MenuItem key={id} style={STYLE_MENU_ITEM} value={id} disableRipple>
                <MenuItemContent title={title} subtitle={subtitle} maxWidth="400px"/>
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>
    )
  },
)

ExamplesDropdown.displayName = 'ExamplesDropdown'
