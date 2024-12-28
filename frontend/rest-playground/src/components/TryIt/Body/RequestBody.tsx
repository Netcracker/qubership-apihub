import { safeStringify } from '@stoplight/json'
import { Panel } from '@stoplight/mosaic'
import { CodeEditor } from '@stoplight/mosaic-code-editor'
import { INodeExample, INodeExternalExample } from '@stoplight/types'
import * as React from 'react'
import { useState } from 'react'
import Select from '@mui/material/Select'
import { MenuItem } from '@mui/material'
import { MenuItemContent } from '../MenuItemConten'
import { nanoid } from 'nanoid'

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
  const firstExampleKey = examples.length ? examples[0].key : ''
  const [selectedExample, setSelectedExample] = useState<INodeExample | INodeExternalExample | undefined>()

  const handleClick = React.useCallback(
    event => {
      const targetExampleKey = event.target.value
      const example = examples.find(({ key }) => key === targetExampleKey)

      onChange(
        example
          ? safeStringify('value' in example ? example?.value : example?.externalValue, undefined, 2) ?? ''
          : requestBody,
      )
      setSelectedExample(example)
    },
    [onChange, requestBody],
  )

  const menuItems = React.useMemo(
    () =>
      examples.map(example => ({
        id: `request-example-${example.key}`,
        title: example.key,
        description: example.summary,
      })),
    [examples],
  )

  return (
    <Select
      variant="standard"
      disableUnderline
      onChange={handleClick}
      value={selectedExample?.key}
      defaultValue={firstExampleKey}
      renderValue={p => p}
      className="MuiInputBase-root examples MuiList-root custom"
    >
      {menuItems.map((menuItem, index) => {
        const { title, description } = menuItem
        return (
          <MenuItem
            key={nanoid(8)}
            style={{ width: '100%', display: 'flex', alignItems: 'center' }}
            value={title}
            disableRipple
          >
            <MenuItemContent title={title} subtitle={description}/>
          </MenuItem>
        )
      })}
    </Select>
  )
}
