import { Diff } from '@netcracker/qubership-apihub-api-diff';
import { ExtensionMeta } from '@stoplight/diff-elements-core/components/Docs/Extensions';
import { safeStringify } from '@stoplight/json';
import { MarkdownViewer } from '@stoplight/markdown-viewer';
import { CodeViewer } from '@stoplight/mosaic-code-viewer';
import { DiffBlock, useValueFromObjWithDiff } from 'diff-block';
import { keys } from 'lodash';
import * as React from 'react';
import { FC } from 'react';

export type Pair = [string, unknown];

type SchemaRowDiffBlockProps = {
  value: Pair;
  meta: ExtensionMeta;
};

export const SchemaRowDiffBlock: FC<SchemaRowDiffBlockProps> = ({ value: [key, value], meta }) => {
  const isObject = typeof value === 'object';
  const isString = typeof value === 'string';
  const metaKeys = isObject ? keys(value).filter(key => meta?.[key]) : [];
  const valueMeta = (metaKeys.length > 0 ? meta?.[metaKeys[0]] : {}) as Diff;
  const resolvedValue = {
    ...(value as object),
    [metaKeys[0]]: useValueFromObjWithDiff(value, metaKeys[0]),
  };

  return (
    <DiffBlock
      id={key}
      type={meta?.[key]?.type}
      action={meta?.[key]?.action}
      cause=''
    >
      <MarkdownViewer markdown={`*${key}*: ${isString ? value : ''}`} />
      {isObject && (
        <DiffBlock
          id={`${key}-${safeStringify(value)}`}
          type={valueMeta?.type}
          action={valueMeta?.action}
          cause=''
        >
          <CodeViewer value={safeStringify(resolvedValue, undefined, 2) ?? ''} language="json" />
        </DiffBlock>
      )}
    </DiffBlock>
  );
};
