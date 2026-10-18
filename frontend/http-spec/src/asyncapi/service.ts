import { isPlainObject } from '@stoplight/json';
import { IHttpService } from '@stoplight/types';
import { isBoolean, isString, pickBy } from 'lodash';

import { isNonNullable } from '../guards';
import { createContext } from '../oas';
import { translateTagDefinition } from '../oas/tags';
import { AsyncServiceTransformerImpl } from './types';

export const transformAsyncApiService: AsyncServiceTransformerImpl = ({
  document: _document,
  ctx = createContext(_document),
}) => {
  const document = ctx.document;
  const id = String((document['x-stoplight'] as any)?.id);
  ctx.ids.service = id;
  ctx.parentId = id;

  const httpService: IHttpService = {
    id,

    version: document.info?.version ?? '',
    name: document.info?.title ?? 'no-title',

    ...pickBy(
      {
        description: document.info?.description,
        termsOfService: document.info?.termsOfService,
      },
      isString,
    ),

    ...pickBy(
      {
        contact: document.info?.contact,
      },
      isPlainObject,
    ),

    ...pickBy(
      {
        internal: document['x-internal'],
      },
      isBoolean,
    ),
  };

  const tags = Array.isArray(document.tags)
    ? document.tags.map(translateTagDefinition, this).filter(isNonNullable)
    : [];

  if (tags.length > 0) {
    httpService.tags = tags;
  }

  return httpService;
};
