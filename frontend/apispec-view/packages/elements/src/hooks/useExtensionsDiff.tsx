import { Extension, ExtensionMeta } from '@stoplight/diff-elements-core/components/Docs/Extensions';
import { useDocument } from '@stoplight/elements-core/context/InlineRefResolver';
import { entries, mergeWith } from 'lodash';
import * as React from 'react';
import { useDiffMetaKey } from "@stoplight/elements/containers/DIffMetaKeyContext";

// If you have OVERWRITING original specification, look at this place

function getExtensions(data: any, depth: number, level: number, diffMetaKey: symbol): [Extension[], ExtensionMeta] {
  const result = data
    ? entries(data)
        .filter(([key]) => key.startsWith('x-') && key !== 'x-stoplight')
        .map(([key, value]) => ({ [key]: value }))
    : [];
  let currentMeta = data?.[diffMetaKey] ?? {};
  const lowerLevelExtensions: Extension[] =
    level < depth
      ? entries(data)
          .map(([, extension]) => {
            const [lowerLevelResult, lowerLevelMeta] =
              getExtensions(extension, depth, level + 1, diffMetaKey);
            currentMeta = mergeWith({}, currentMeta, lowerLevelMeta);
            return lowerLevelResult;
          })
          .flat()
      : [];

  const extensions = lowerLevelExtensions.length > 0 ? [...result, ...lowerLevelExtensions] : result;
  return [extensions, currentMeta];
}

export function useExtensions(data: unknown, depth = 0): Extension[] {
  const [extensions] = useExtensionsWithDiff(data, depth);
  return extensions;
}

export function useExtensionsWithDiff(data: unknown, depth = 0): [Extension[], ExtensionMeta] {
  const diffMetaKey = useDiffMetaKey()
  return React.useMemo(() => getExtensions(data, depth, 0, diffMetaKey), [data, depth]);
}

export function useServiceExtensions(data: unknown): Extension[] {
  return [...useExtensions(data), ...useExtensions((data as any)?.info)];
}

export function useOperationExtensions(
  document: object | undefined,
  path: string,
  method: string,
): [Extension[], Extension[]] {
  return [
    useExtensions((document as any)?.paths?.[path]?.[method].requestBody),
    useExtensions((document as any)?.paths?.[path]?.[method].responses, 1),
  ];
}

export function useServiceExtensionsWithDiff(): [Extension[], ExtensionMeta] {
  const document = useDocument();

  const [rootExtensions, rootMeta] = useExtensionsWithDiff(document);
  const [infoExtensions, infoMeta] = useExtensionsWithDiff((document as any)?.info);
  return [[...rootExtensions, ...infoExtensions], mergeWith({}, rootMeta, infoMeta)];
}

export function useOperationExtensionsWithDiff(
  path: string,
  method: string,
  responseStatusCode: string,
): [Extension[], Extension[], ExtensionMeta] {
  const document = useDocument();

  const [requestExtensions, requestMeta] = useExtensionsWithDiff(
    (document as any)?.paths?.[path]?.[method].requestBody,
  );
  const [responseExtensions, responseMeta] = useExtensionsWithDiff(
    (document as any)?.paths?.[path]?.[method].responses?.[responseStatusCode],
  );

  return [requestExtensions, responseExtensions, mergeWith({}, requestMeta, responseMeta)];
}
