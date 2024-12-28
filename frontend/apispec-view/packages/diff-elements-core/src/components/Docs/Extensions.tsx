import { Diff } from '@netcracker/qubership-apihub-api-diff';
import { safeStringify } from '@stoplight/json';
import { Box, Flex, isArray, isObject, Panel } from '@stoplight/mosaic';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { keys } from 'lodash';
import { nanoid } from 'nanoid';
import React, { FC, ReactElement } from 'react';

import { MarkdownViewer } from '../MarkdownViewer';

interface ExtensionsProps {
  value: Extension | Extension[];
}

export type Extension = Record<string, unknown>;
export type ExtensionMeta = Record<string, Diff>;

const schemeExpandedState = atomWithStorage<Record<string, boolean>>('HttpOperation_extension_expanded', {});

export const Extensions: FC<ExtensionsProps> = ({ value }) => {
  const [expanded, setExpanded] = useAtom(schemeExpandedState);

  return (
    <Box>
      {keys(value).map((key: string) => {
        const isExtension = value[key] && typeof value[key] === 'object';
        const isLongValue = value[key] && value[key].toString().length > 50;
        return (
          <Panel
            key={`${key}-${nanoid(8)}`}
            title={key}
            isCollapsible={isExtension || isLongValue}
            defaultIsOpen={expanded[key]}
            onChange={isOpen => setExpanded({ ...expanded, [key]: isOpen })}
            appearance="outlined"
            border={0}
          >
            <Panel.Titlebar userSelect={'text'}>
              <Flex flex={1} flexDirection={'row'}>
                <div role="heading" style={{ fontWeight: 'bold' }}>
                  {key}
                </div>
                <div>{!isExtension && !isLongValue && `: ${value[key]}`}</div>
              </Flex>
            </Panel.Titlebar>

            <Panel.Content pt={0} pb={0} userSelect="text">
              {renderContent(value, key, isLongValue)}
            </Panel.Content>
          </Panel>
        );
      })}
    </Box>
  );
};

function renderContent(
  value: Extension | Extension[],
  key: string,
  isLongValue: boolean,
): ReactElement[] | ReactElement | null {
  const extension = value[key];

  if (isArray(extension)) {
    return extension.map((child: any) =>
      isObject(child) ? (
        <Extensions key={nanoid(8)} value={child} />
      ) : (
        <MarkdownViewer key={nanoid(8)} style={{ fontSize: 12 }} markdown={safeStringify(child) ?? 'null'} />
      ),
    );
  } else if (isObject(extension)) {
    return <Extensions value={extension} />;
  }

  if (isLongValue) {
    return <MarkdownViewer style={{ fontSize: '12px' }} markdown={safeStringify(extension) ?? 'null'} />;
  }

  return null;
}
