import { NativeMenu } from '@stoplight/elements-core/hoc/Menu';
import { safeStringify } from '@stoplight/json';
import { MenuItems, Panel } from '@stoplight/mosaic';
import { CodeEditor } from '@stoplight/mosaic-code-editor';
import { INodeExample, INodeExternalExample } from '@stoplight/types';
import * as React from 'react';

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
          examples.length > 1 && <ExampleMenu examples={examples} requestBody={requestBody} onChange={onChange} />
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
  );
};

function ExampleMenu({ examples, requestBody, onChange }: RequestBodyProps) {
  const handleClick = React.useCallback(
    (example: INodeExample | INodeExternalExample) => {
      onChange(safeStringify('value' in example ? example.value : example.externalValue, undefined, 2) ?? requestBody);
    },
    [onChange, requestBody],
  );

  const data = React.useMemo(() => {
    const items: MenuItems = [];
    const mapping = new Map<string, INodeExample | INodeExternalExample>();
    examples.forEach(example => {
      const id = `request-example-${example.key}`;
      items.push({ id, title: example.key });
      mapping.set(id, example);
    });
    return { items, mapping };
  }, [examples]);

  return (
    <div>
      <NativeMenu
        menuItems={data.items}
        title={'Examples'}
        onChange={event => {
          const value = data.mapping.get(event.target.value);
          if (value) {
            handleClick(value);
          }
        }}
      ></NativeMenu>
    </div>
  );
}
