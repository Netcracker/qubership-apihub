import { isPlainObject } from '@stoplight/json';
import { HttpParamStyles, IHttpEncoding, IMediaTypeContent, Optional } from '@stoplight/types';
import pickBy = require('lodash.pickby');

import { withContext } from '../../context';
import { isBoolean, isNonNullable, isString } from '../../guards';
import { ArrayCallbackParameters, Fragment } from '../../types';
import { entries } from '../../utils';
import type { Oas3TranslateFunction } from '../types';
import { translateHeaderObject } from './headers';
import { JSONSchema7, JSONSchema7Array } from 'json-schema'
import { translateToDefaultExample } from '../../oas/transformers/examples'
import { translateToExample } from '../../oas3WithMeta/transformers/examples'
import { translateSchemaObject } from '../../oas/transformers'

const ACCEPTABLE_STYLES: (string | undefined)[] = [
  HttpParamStyles.Form,
  HttpParamStyles.SpaceDelimited,
  HttpParamStyles.PipeDelimited,
  HttpParamStyles.DeepObject,
];

function hasAcceptableStyle<T extends Fragment = Fragment>(
  encodingPropertyObject: T,
): encodingPropertyObject is T & {
  style:
    | HttpParamStyles.Form
    | HttpParamStyles.SpaceDelimited
    | HttpParamStyles.PipeDelimited
    | HttpParamStyles.DeepObject;
} {
  return typeof encodingPropertyObject.style === 'string' && ACCEPTABLE_STYLES.includes(encodingPropertyObject.style);
}

const translateEncodingPropertyObject = withContext<
  Oas3TranslateFunction<
    ArrayCallbackParameters<[property: string, encodingPropertyObject: unknown]>,
    Optional<IHttpEncoding<true>>
  >
>(function ([property, encodingPropertyObject]) {
  if (!isPlainObject(encodingPropertyObject)) return;
  if (!hasAcceptableStyle(encodingPropertyObject)) return;

  return {
    property,
    style: encodingPropertyObject.style,
    headers: entries(encodingPropertyObject.headers).map(translateHeaderObject, this).filter(isNonNullable),

    ...pickBy(
      {
        allowReserved: encodingPropertyObject.allowReserved,
        explode: encodingPropertyObject.explode,
      },
      isBoolean,
    ),

    ...pickBy(
      {
        mediaType: encodingPropertyObject.contentType,
      },
      isString,
    ),
  };
});

export const translateMediaTypeObject = withContext<
  Oas3TranslateFunction<
    ArrayCallbackParameters<[mediaType: string, mediaObject: unknown]>,
    Optional<IMediaTypeContent<true>>
  >
>(function ([mediaType, mediaObject]) {
  if (!isPlainObject(mediaObject)) return;

  const id = this.generateId.httpMedia({ mediaType });
  const { schema, encoding, examples } = mediaObject;
  const jsonSchema = translateSchemaObject.call(this, schema);
  const defaultExample = 'example' in mediaObject ? mediaObject.example : (jsonSchema?.examples as JSONSchema7Array)?.[0];

  return {
    id,
    mediaType,
    // Note that I'm assuming all references are resolved

    // Examples are necessary here, because they are used in REST Playground (panel "Examples" on Operation Page)
    examples: [
      defaultExample !== undefined ? translateToDefaultExample.call(this, 'default', defaultExample) : undefined,
      ...entries(examples).map(translateToExample, this),
    ].filter(isNonNullable),
    encodings: entries(encoding).map(translateEncodingPropertyObject, this).filter(isNonNullable),

    ...pickBy(
      {
        schema: schema,
      },
      isNonNullable,
    ),
  };
});
