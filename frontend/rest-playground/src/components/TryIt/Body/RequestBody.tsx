import { MenuItem } from '@mui/material'
import Select from '@mui/material/Select'
import { safeStringify } from '@stoplight/json'
import { Panel } from '@stoplight/mosaic'
import { CodeEditor } from '@stoplight/mosaic-code-editor'
import { INodeExample, INodeExternalExample } from '@stoplight/types'
import * as React from 'react'
import { useState } from 'react'

import { useExampleMenuItems } from '../../../hooks/useExampleMenuItems'
import { MenuItemContent } from '../../MenuItemContent'

const STYLE_MENU_ITEM = { width: '100%', display: 'flex', alignItems: 'center' }

interface RequestBodyProps {
  examples: ReadonlyArray<INodeExample | INodeExternalExample>;
  requestBody: string;
  onChange: (newRequestBody: string) => void;
}

export const RequestBody: React.FC<RequestBodyProps> = ({ examples, requestBody, onChange }) => {
  return (
    <Panel defaultIsOpen>
      <Panel.Titlebar
        rightComponent={
          examples.length > 1 && <ExampleMenu examples={examples} requestBody={requestBody} onChange={onChange}/>
        }
      >
        Body
      </Panel.Titlebar>
      <Panel.Content className="TextRequestBody">
        <CodeEditor
          onChange={onChange}
          language="markdown"
          value={requestBody}
          showLineNumbers
          padding={0}
          style={
            // when not rendering in prose (markdown), reduce font size to be consistent with base UI
            {
              fontSize: 12,
            }
          }
        />
      </Panel.Content>
    </Panel>
  )
}

function ExampleMenu({ examples, requestBody, onChange }: RequestBodyProps) {
  const { menuItems, findMenuItem, renderMenuItemTitle } = useExampleMenuItems(examples)

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const selectedItem = findMenuItem(selectedId) ?? menuItems[0]

  const handleClick = React.useCallback(
    event => {
      const item = findMenuItem(event.target.value)

      onChange(
        item
          ? safeStringify('value' in item.example ? item.example.value : item.example.externalValue, undefined, 2) ?? ''
          : requestBody,
      )
      setSelectedId(item?.id)
    },
    [findMenuItem, onChange, requestBody],
  )

  return (
    <Select
      variant="standard"
      disableUnderline
      onChange={handleClick}
      value={selectedItem?.id ?? ''}
      renderValue={renderMenuItemTitle}
      className="MuiInputBase-root examples MuiList-root custom"
    >
      {menuItems.map(({ id, title, subtitle }) => {
        return (
          <MenuItem key={id} style={STYLE_MENU_ITEM} value={id} disableRipple>
            <MenuItemContent title={title} subtitle={subtitle}/>
          </MenuItem>
        )
      })}
    </Select>
  )
}
