import type { IBundledHttpService, IHttpCallbackOperation } from '@stoplight/types';
import type { OpenAPIObject } from 'openapi3-ts';

import { withContext } from '../../context';
import { isReferenceObject } from '../../oas/guards';
import { setSharedKey, syncReferenceObject } from '../../oas/resolver';
import { entries } from '../../utils';
import { transformOas3WithMetaOperation } from '../operation';
import type { Oas3WithMetaTranslateFunction } from '../types';

export const translateToCallbacks: Oas3WithMetaTranslateFunction<
  [callbacks: unknown],
  IHttpCallbackOperation[] | undefined
> = function (callbacks) {
  const callbackEntries = entries(callbacks);
  if (!callbackEntries.length) return;

  return callbackEntries.reduce((results: IHttpCallbackOperation[], [callbackName, path2Methods]) => {
    for (const [path, method2Op] of entries(path2Methods)) {
      for (const [method, op] of entries(method2Op as { [key: string]: {} })) {
        const document: Partial<OpenAPIObject> = {
          openapi: '3',
          info: { title: '', version: '1' },
          paths: { [path]: { [method]: op } },
        };

        results.push({
          ...transformOas3WithMetaOperation({
            document,
            method,
            path,
          }),
          key: callbackName,
        });
      }
    }

    return results;
  }, []);
};

export const translateToSharedCallbacks: Oas3WithMetaTranslateFunction<
  [callbacks: unknown],
  IBundledHttpService['components']['callbacks']
> = withContext(function (callbacks) {
  // `components.callbacks` was collected by nothing before @stoplight/types 13.9 gave the
  // bundled service a place to put it, so a document could declare reusable callbacks and
  // the bundled output would not mention them. One component entry is a callback object -
  // a map of expression -> path item - so it can expand to several operations, which is
  // why each is re-keyed with the component's own name rather than the expression's.
  const results: IBundledHttpService['components']['callbacks'] = [];

  for (const [key, value] of entries(callbacks)) {
    setSharedKey(value, key);

    this.references[`#/components/callbacks/${key}`] = {
      resolved: true,
      value: `#/components/callbacks/${results.length}`,
    };

    if (isReferenceObject(value)) {
      results.push(syncReferenceObject({ ...value, key }, this.references));
      continue;
    }

    // Wrapped back into a single-entry map so the operation-level translator above does
    // the work, and `key` comes out as the component name.
    const translated = translateToCallbacks.call(this, { [key]: value });
    if (translated === void 0) continue;

    for (const operation of translated) {
      results.push(operation);
    }
  }

  return results;
});
