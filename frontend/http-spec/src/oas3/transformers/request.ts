import { isPlainObject } from '@stoplight/json';
import type {
  IHttpHeaderParam,
  IHttpOperationRequest,
  IHttpOperationRequestBody,
  IHttpParam,
  Optional,
  Reference,
} from '@stoplight/types';
import { HttpParamStyles } from '@stoplight/types';
import type { ParameterObject } from 'openapi3-ts';

import { withContext } from '../../context';
import { isBoolean, isNonNullable, isString } from '../../guards';
import { OasVersion } from '../../oas';
import { createOasParamsIterator } from '../../oas/accessors';
import { isReferenceObject, isValidParamStyle } from '../../oas/guards';
import { getComponentName, getSharedKey, syncReferenceObject } from '../../oas/resolver';
import { entries } from '../../utils';
import { isRequestBodyObject } from '../guards';
import { Oas3TranslateFunction } from '../types';
import { translateMediaTypeObject } from './content';
import pickBy = require('lodash.pickby');

export const translateRequestBody = withContext<
  Oas3TranslateFunction<
    [requestBodyObject: unknown],
    Optional<IHttpOperationRequestBody<true> | Reference>
  >
>(function (requestBodyObject) {
  if (!isRequestBodyObject(requestBodyObject)) {
    return;
  }

  const id = this.generateId.httpRequestBody({});

  return {
    id,
    contents: entries(requestBodyObject.content).map(translateMediaTypeObject, this).filter(isNonNullable),

    ...pickBy(
      {
        required: requestBodyObject.required,
      },
      isBoolean,
    ),

    ...pickBy(
      {
        description: requestBodyObject.description,
      },
      isString,
    ),
  };
});

export const translateParameterObject = withContext<
  Oas3TranslateFunction<[parameterObject: ParameterObject], IHttpParam<true>>
>(function (parameterObject) {
  const kind = parameterObject.in === 'path' ? 'pathParam' : parameterObject.in;
  const name = parameterObject.name;
  const keyOrName = getSharedKey(parameterObject) ?? name;
  const id = this.generateId[`http${kind[0].toUpperCase()}${kind.slice(1)}`]({ keyOrName });

  return {
    id,
    name,
    style: isValidParamStyle(parameterObject.style)
      ? parameterObject.style
      : // https://spec.openapis.org/oas/v3.0.3#parameterStyle, https://spec.openapis.org/oas/v3.1.0#parameterStyle
      parameterObject.in === 'query' || parameterObject.in === 'cookie'
        ? HttpParamStyles.Form
        : HttpParamStyles.Simple,

    ...pickBy(
      {
        description: parameterObject.description,
      },
      isString,
    ),

    ...pickBy(
      {
        deprecated: parameterObject.deprecated,
        required: parameterObject.required,
        explode: parameterObject.explode,
      },
      isBoolean,
    ),

    ...pickBy(
      {
        schema: parameterObject.schema,
        content: parameterObject.content,
      },
      isPlainObject,
    ),
  };
});

const iterateOasParams = createOasParamsIterator(OasVersion.OAS3);

export const translateToRequest = withContext<
  Oas3TranslateFunction<
    [path: Record<string, unknown>, operation: Record<string, unknown>],
    IHttpOperationRequest<true>
  >
>(function (path, operation) {
  const params: Omit<IHttpOperationRequest<true>, 'header'> & { header: (IHttpHeaderParam<true> | Reference)[] } = {
    header: [],
    query: [],
    cookie: [],
    path: [],
    unknown: [],
  };

  for (const param of iterateOasParams.call(this, path, operation)) {
    let kind: string;
    if (isReferenceObject(param)) {
      kind = getComponentName(this.references, param.$ref) ?? '';
    } else {
      kind = param.in;
    }

    const target = params[kind || 'unknown'];
    if (!Array.isArray(target)) continue;

    if (isReferenceObject(param)) {
      target.push(syncReferenceObject(param, this.references));
    } else {
      target.push(translateParameterObject.call(this, param) as any);
    }
  }

  const res = {
    ...pickBy(
      {
        body: translateRequestBody.call(this, operation?.requestBody),
      },
      isNonNullable,
    ),

    headers: params.header,
    query: params.query,
    cookie: params.cookie,
    path: params.path,
    unknown: params.unknown,
  };

  if (res.unknown && !res.unknown.length) {
    delete res.unknown;
  }

  return res;
});
