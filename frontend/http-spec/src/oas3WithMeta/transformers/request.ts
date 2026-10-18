import { isPlainObject } from '@stoplight/json';
import type {
  IHttpHeaderParam,
  IHttpOperationRequest,
  IHttpOperationRequestBody,
  IHttpParam,
  Optional,
  Reference,
} from '@stoplight/types';
import { HttpParamStyles, IMediaTypeContent } from '@stoplight/types';
import type { CustomRequestBodyObject, ParameterObject } from 'openapi3-ts';

import { withContext } from '../../context';
import { isBoolean, isNonNullable, isString } from '../../guards';
import { OasVersion } from '../../oas';
import { createOasParamsIterator } from '../../oas/accessors';
import { isReferenceObject, isValidParamStyle } from '../../oas/guards';
import { getComponentName, getSharedKey, syncReferenceObject } from '../../oas/resolver';
import { entries, pickKeptProperties } from '../../utils';
import { isObject, isRequestBodyObject } from '../guards';
import {
  Oas3WithMetaTranslateFunction,
  ParameterDiffMetaData,
  ParameterObjectDiffMetaData,
  ParametersArrayDiffMetaData,
  ParametersDiffMetaData,
} from '../types';
import { translateMediaTypeObject } from './content';
import pickBy = require('lodash.pickby');
import { mirrorDiffMetaKey, mirrorSelfDiffMetaKey } from '../consts';

export const translateRequestBody = withContext<
  Oas3WithMetaTranslateFunction<
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
    contents: transformContents.bind(this)(requestBodyObject),

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

    ...pickKeptProperties(requestBodyObject, this.keepProperties),
  };
});

export const translateParameterObject = withContext<
  Oas3WithMetaTranslateFunction<[parameterObject: ParameterObject, keepProperties?: string[]], IHttpParam<true>>
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

const aggregateParametersDiffMetaFromOperation = (
  operation: Record<string | symbol, unknown>,
): ParametersArrayDiffMetaData => {
  let parametersDiffMeta: ParametersDiffMetaData = null;
  const parameters = isObject(operation.parameters) ? operation.parameters : []
  for (const property of Reflect.ownKeys(parameters)) {
    if (property.toString() === mirrorDiffMetaKey.toString()) {
      parametersDiffMeta = parameters[property] as ParametersDiffMetaData;
      break;
    }
  }
  // by default, it's an empty object because in diff meta it's an object as well
  return parametersDiffMeta ?? {};
};

const aggregateRequestBodySelfDiffMetaFromOperation = (
  operation: Record<string | symbol, unknown>,
): [symbol | null, Record<PropertyKey, unknown> | null] => {
  let diffMetaKey: symbol | null = null
  let diffMeta: Record<PropertyKey, unknown> | null = null;
  for (const operationProperty of Reflect.ownKeys(operation)) {
    if (typeof operationProperty !== "symbol") {
      continue;
    }
    if (operationProperty.toString() === mirrorDiffMetaKey.toString()) {
      const operationFragment = operation[operationProperty]
      const maybeDiffMeta = isObject(operationFragment) ? operationFragment.requestBody : null
      if (isObject(maybeDiffMeta)) {
        diffMetaKey = operationProperty
        diffMeta = maybeDiffMeta
      }
      break;
    }
  }
  return [diffMetaKey, diffMeta];
};

const transformDiffMetaForReplacedParameter = (
  wholeParameterDiffMeta: ParameterDiffMetaData,
): ParameterObjectDiffMetaData => {
  const { beforeValue } = wholeParameterDiffMeta;
  const newWholeParameterDiffMeta: ParameterObjectDiffMetaData = {};
  if (beforeValue) {
    Object.keys(beforeValue).forEach(property => {
      newWholeParameterDiffMeta[property] = {
        type: wholeParameterDiffMeta.type,
        action: wholeParameterDiffMeta.action,
        beforeValue: beforeValue[property],
      };
    });
  }
  return newWholeParameterDiffMeta;
};

export const translateToRequest = withContext<
  Oas3WithMetaTranslateFunction<
    [path: Record<string, unknown>, operation: Record<string | symbol, unknown>],
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

  const wholeParametersDiffMeta = aggregateParametersDiffMetaFromOperation(operation);

  let i = 0;
  for (const param of iterateOasParams.call(this, path, operation)) {
    let kind: string;
    if (isReferenceObject(param)) {
      kind = getComponentName(this.references, param.$ref) ?? '';
    } else {
      kind = param.in;
    }

    const target = params[kind || 'unknown'];
    if (!Array.isArray(target)) continue;

    let transformedParam = isReferenceObject(param)
      ? syncReferenceObject(param, this.references)
      : (translateParameterObject.call(this, param) as any);

    // Added/Removed/Replaced parameters diff meta
    const wholeParameterDiffMeta: ParameterDiffMetaData = wholeParametersDiffMeta[i];
    if (wholeParameterDiffMeta) {
      if (wholeParameterDiffMeta.action === 'replace') {
        transformedParam[mirrorDiffMetaKey] = transformDiffMetaForReplacedParameter(wholeParameterDiffMeta);
      } else {
        transformedParam[mirrorSelfDiffMetaKey] = wholeParameterDiffMeta;
      }
    }
    i++;

    // Diff meta for replaced values in parameter
    // Applies only when there is nothing in diff meta yet
    if (!transformedParam[mirrorDiffMetaKey]) {
      Reflect.ownKeys(param).forEach(property => {
        if (property.toString() === mirrorDiffMetaKey.toString()) {
          transformedParam[mirrorDiffMetaKey] = param[property];
        }
      });
    }

    target.push(transformedParam);
  }

  const [
    requestBodySelfDiffMetaKey,
    requestBodySelfDiffMeta
  ] = aggregateRequestBodySelfDiffMetaFromOperation(operation)

  if (requestBodySelfDiffMetaKey && requestBodySelfDiffMeta && isObject(operation?.requestBody)) {
    operation.requestBody[requestBodySelfDiffMetaKey] = requestBodySelfDiffMeta
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
    ...pickKeptProperties(params, this.keepProperties),
  };

  if (res.unknown && !res.unknown.length) {
    delete res.unknown;
  }

  return res;
});

const transformContents = withContext<
  Oas3WithMetaTranslateFunction<
    [CustomRequestBodyObject],
    IMediaTypeContent<true>[]
  >
>(function (requestBody: CustomRequestBodyObject) {
  const requestBodyContent = requestBody.content
  const requestBodyContentKeys = requestBodyContent ? Reflect.ownKeys(requestBodyContent) : []
  let contentDiffMetaKey: symbol | undefined, contentDiffMeta: unknown | undefined;
  for (const requestBodyContentKey of requestBodyContentKeys) {
    const requestContentValue = requestBodyContent![requestBodyContentKey]
    if (typeof requestBodyContentKey === 'symbol' && requestBodyContentKey.toString() === mirrorDiffMetaKey.toString()) {
      contentDiffMetaKey = requestBodyContentKey
      contentDiffMeta = requestContentValue
      break
    }
  }
  return entries(requestBodyContent)
    .map((value, index, array) => {
      const result = translateMediaTypeObject.bind(this)(value, index, array)
      if (
        result?.mediaType &&
        contentDiffMetaKey &&
        contentDiffMeta != null &&
        typeof contentDiffMeta === 'object' &&
        result.mediaType in contentDiffMeta
      ) {
        result[contentDiffMetaKey] = contentDiffMeta[result.mediaType]
      }
      return result
    })
    .filter(isNonNullable)
})
