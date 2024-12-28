import { Extension } from '@stoplight/elements-core/components/Docs/Extensions';
import { useDocument } from '@stoplight/elements-core/context/InlineRefResolver';
import { entries, isEmpty } from 'lodash';
import * as React from 'react';

function getExtensions(data: any, depth: number, level: number): Extension[] {
  const result = data
    ? entries(data)
        .filter(([key]) => key.startsWith('x-') && key !== 'x-stoplight')
        .map(([key, value]) => ({ [key]: value }))
    : [];
  const lowerLevelExtensions: Extension[] =
    level < depth
      ? entries(data)
          .map(([, extension]) => getExtensions(extension, depth, level + 1))
          .flat()
      : [];

  return !isEmpty(lowerLevelExtensions) ? [...result, ...lowerLevelExtensions] : result;
}

export function useExtensions(data: unknown, depth = 0): Extension[] {
  return React.useMemo(() => getExtensions(data, depth, 0), [data, depth]);
}

export function useServiceExtensions(): Extension[] {
  const document = useDocument();

  return [...useExtensions(document), ...useExtensions((document as any)?.info)];
}

export function useOperationExtensions(
  path: string,
  method: string,
  responseStatusCode: string,
): [Extension[], Extension[]] {
  const document = useDocument();

  return [
    useExtensions((document as any)?.paths?.[path]?.[method].requestBody),
    useExtensions((document as any)?.paths?.[path]?.[method].responses?.[responseStatusCode]),
  ];
}
