import * as React from 'react'
import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import { MenuItem } from '@mui/material'
import { INodeExample, INodeExternalExample } from '@stoplight/types'
import { safeStringify } from '@stoplight/json'
import { MenuItemContent } from '../TryIt/MenuItemConten'

export type ExamplesDropdownProps = {
  examples: ReadonlyArray<INodeExample | INodeExternalExample>;
  requestResponseBody: string;
  onChange: (newRequestBody: string) => void;
  onSelectExample?: (example: INodeExample | INodeExternalExample | undefined) => void;
};

export const ExamplesDropdown: FC<ExamplesDropdownProps> = memo<ExamplesDropdownProps>(
  ({ examples, requestResponseBody, onChange, onSelectExample }) => {
    const [selectedExample, setSelectedExample] = useState<INodeExample | INodeExternalExample | undefined>()

    useEffect(() => setSelectedExample(examples.length ? examples[0] : undefined), [examples])

    const [open, setOpen] = useState(false)
    const handleClose = () => {
      setOpen(false)
    }
    const handleOpen = () => {
      setOpen(true)
    }

    const handleClick = useCallback(
      event => {
        const targetExampleKey = event.target.value
        const example = examples.find(({ key }) => key === targetExampleKey)

        onChange(
          example
            ? safeStringify('value' in example ? example?.value : example?.externalValue, undefined, 2) ?? ''
            : requestResponseBody,
        )
        setSelectedExample(example)
        setOpen(false)
      },
      [onChange, requestResponseBody],
    )

    useEffect(() => {
      onSelectExample?.(selectedExample)
    }, [selectedExample])

    const menuItems = useMemo(
      () =>
        examples.map(example => ({
          id: `request-example-${example.key}`,
          title: example.key,
          summary: example.summary,
          description: ((example as INodeExample)?.value as INodeExample)?.description ?? '',
        })),
      [examples],
    )

    return (
      <FormControl size="small" fullWidth>
        <Select
          open={open}
          onClose={handleClose}
          onOpen={handleOpen}
          onChange={handleClick}
          value={selectedExample?.key ?? ''}
          renderValue={p => p}
          className="MuiInputBase-root MuiSelect-select custom"
        >
          {menuItems.map(({ id, title, summary }) => {
            return (
              <MenuItem
                key={id}
                style={{ width: '100%', display: 'flex', alignItems: 'center' }}
                value={title}
                disableRipple
              >
                <MenuItemContent title={title} subtitle={summary} maxWidth="400px"/>
              </MenuItem>
            )
          })}
        </Select>
      </FormControl>
    )
  },
)

ExamplesDropdown.displayName = 'ExamplesDropdown'
