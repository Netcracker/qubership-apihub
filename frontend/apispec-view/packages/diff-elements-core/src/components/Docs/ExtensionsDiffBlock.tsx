import { DiffBlock, useValueFromObjWithDiff } from 'diff-block';
import { keys } from 'lodash';
import { nanoid } from 'nanoid';
import React, { FC } from 'react';

import { Extension, ExtensionMeta, Extensions } from './Extensions';
import { useDiffsMetaKey } from "@stoplight/elements/containers/DiffsMetaKeyContext";
import { buildOpenApiDiffCause } from "@netcracker/qubership-apihub-api-doc-viewer";

interface ExtensionsDiffBlockProps {
  idPrefix: string;
  value: Extension;
  meta: ExtensionMeta;
  index: number;
}

export const ExtensionsDiffBlock: FC<ExtensionsDiffBlockProps> = ({ idPrefix, value, meta, index }) => {
  const diffMetaKey = useDiffsMetaKey()

  const extensionKeys = keys(value);
  const metas = extensionKeys.map((key: string) => meta?.[key]).filter(Boolean);
  const firstDiff = metas[0]
  const key = `${idPrefix}-${extensionKeys.reduce(
    (accumulator: string, current: string) => accumulator + '-' + current,
  )}-${index}`;
  const [extensionName] = extensionKeys;
  (value as any)[diffMetaKey] = meta;
  const content = { [extensionName]: useValueFromObjWithDiff(value, extensionName) } as Extension;

  return (
    <DiffBlock
      id={key}
      key={key}
      type={firstDiff?.type}
      action={firstDiff?.action}
      cause={buildOpenApiDiffCause(firstDiff)}
    >
      <Extensions key={nanoid(8)} value={content} />
    </DiffBlock>
  );
};
