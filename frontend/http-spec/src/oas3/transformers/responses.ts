import type { IHttpOperationResponse, Optional, Reference } from '@stoplight/types';
import pickBy = require('lodash.pickby');

import { withContext } from '../../context';
import { isNonNullable, isString } from '../../guards';
import { getSharedKey } from '../../oas/resolver';
import { ArrayCallbackParameters } from '../../types';
import { entries } from '../../utils';
import { isResponseObject } from '../guards';
import { Oas3TranslateFunction } from '../types';
import { translateMediaTypeObject } from './content';
import { translateHeaderObject } from './headers';

export const translateToResponse = withContext<
  Oas3TranslateFunction<
    ArrayCallbackParameters<[statusCode: string, response: unknown]>,
    Optional<IHttpOperationResponse<true> | (Pick<IHttpOperationResponse, 'code'> & Reference)>
  >
>(function ([statusCode, response]) {
  if (!isResponseObject(response)) {
    return;
  }

  const codeOrKey = this.context === 'service' ? getSharedKey(response) : statusCode;

  return {
    id: this.generateId.httpResponse({ codeOrKey }),
    code: statusCode,
    headers: entries(response.headers).map(translateHeaderObject, this).filter(isNonNullable),
    contents: entries(response.content).map(translateMediaTypeObject, this).filter(isNonNullable),

    ...pickBy(
      {
        description: response.description,
      },
      isString,
    ),
  };
});

export const translateToResponses: Oas3TranslateFunction<
  [responses: unknown],
  NonNullable<ReturnType<typeof translateToResponse>>[]
> = function (responses) {
  return entries(responses).map(translateToResponse, this).filter(isNonNullable);
};
