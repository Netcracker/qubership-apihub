import type { DeepPartial, IHttpOperation } from '@stoplight/types';
import pickBy = require('lodash.pickby');
import type { OpenAPIObject } from 'openapi3-ts';

import { isNonNullable } from '../guards';
import { transformOasOperation, transformOasOperations } from '../oas';
import { createContext } from '../oas/context';
import type { Oas3HttpOperationTransformer } from '../oas/types';
import { Fragment, TransformerContext } from '../types';
import { pickKeptProperties } from '../utils';
import { translateToCallbacks } from './transformers/callbacks';
import { translateToRequest } from './transformers/request';
import { translateToResponses } from './transformers/responses';
import { translateToSecurities } from './transformers/securities';
import { translateToServers } from './transformers/servers';

// TODO 06.06.23 Try to find another way of keeping diff meta

export function transformOas3WithMetaOperations<T extends Fragment = DeepPartial<OpenAPIObject>>(
  document: T,
  ctx?: TransformerContext<T>,
): IHttpOperation[] {
  return transformOasOperations(document, transformOas3WithMetaOperation, void 0, ctx);
}

export const transformOas3WithMetaOperation: Oas3HttpOperationTransformer = ({
  document: _document,
  path,
  method,
  keepProperties: _keepProperties,
  ctx = createContext(_document, undefined, _keepProperties),
}) => {
  const httpOperation = transformOasOperation.call(ctx, path, method);
  const pathObj = ctx.maybeResolveLocalRef(ctx.document.paths![path]) as Fragment;
  const operation = ctx.maybeResolveLocalRef(pathObj[method]) as Fragment;

  return {
    ...httpOperation,

    responses: translateToResponses.call(ctx, operation.responses),
    request: translateToRequest.call(ctx, pathObj, operation),
    security: translateToSecurities.call(ctx, operation.security),
    servers: translateToServers.call(ctx, pathObj, operation),

    ...pickBy(
      {
        callbacks: translateToCallbacks.call(ctx, operation.callbacks),
      },
      isNonNullable,
    ),

    ...pickKeptProperties(operation, ctx.keepProperties),
  } as unknown as IHttpOperation;
};
