import { isPlainObject } from '@stoplight/json';
import { HttpParamStyles, IHttpEncoding, IHttpHeaderParam, Optional, Reference } from '@stoplight/types';
import pickBy = require('lodash.pickby');

import { withContext } from '../../context';
import { isBoolean, isNonNullable, isString } from '../../guards';
import { isReferenceObject } from '../../oas/guards';
import { pickKeptProperties } from '../../utils';
import { isHeaderObject } from '../guards';
import { Oas3WithMetaTranslateFunction } from '../types';

export const translateHeaderObject = withContext<
  Oas3WithMetaTranslateFunction<
    [[name: string, headerObject: unknown]],
    Optional<IHttpHeaderParam<true> | (Pick<IHttpHeaderParam<true>, 'name'> & Reference)>
  >
>(function ([name, unresolvedHeaderObject]) {
  const maybeHeaderObject = this.maybeResolveLocalRef(unresolvedHeaderObject);

  if (isReferenceObject(maybeHeaderObject)) {
    (maybeHeaderObject as Pick<IHttpHeaderParam<true>, 'name'> & Reference).name = name;
    return maybeHeaderObject as Pick<IHttpHeaderParam<true>, 'name'> & Reference;
  }

  if (!isPlainObject(maybeHeaderObject)) return;

  const id = this.generateId.httpHeader({ keyOrName: name });

  if (!isHeaderObject(maybeHeaderObject)) {
    return {
      id,
      encodings: [],
      examples: [],
      name,
      style: HttpParamStyles.Simple,
    };
  }

  const { content: contentObject } = maybeHeaderObject;

  const contentValue = isPlainObject(contentObject) ? Object.values(contentObject)[0] : null;

  const baseContent: IHttpHeaderParam = {
    id,
    name,
    style: HttpParamStyles.Simple,

    ...pickBy(
      {
        schema: maybeHeaderObject.schema,
        content: maybeHeaderObject.content,
      },
      isNonNullable,
    ),

    ...pickBy(
      {
        description: maybeHeaderObject.description,
      },
      isString,
    ),

    ...pickBy(
      {
        allowEmptyValue: maybeHeaderObject.allowEmptyValue,
        allowReserved: maybeHeaderObject.allowReserved,
        explode: maybeHeaderObject.explode,
        required: maybeHeaderObject.required,
        deprecated: maybeHeaderObject.deprecated,
      },
      isBoolean,
    ),

    ...pickKeptProperties(maybeHeaderObject, this.keepProperties),
  };

  const encodings: IHttpEncoding<true>[] = [];

  if (isPlainObject(contentValue)) {
    if (isPlainObject(contentValue.encoding)) {
      encodings.push(...(Object.values(contentValue.encoding) as IHttpEncoding<true>[]));
    }
  }

  return {
    ...baseContent,
    encodings,
  };
});
