import { entries, isEmpty } from 'lodash';
import * as React from 'react';

export type Extension = Record<string, unknown>;

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
