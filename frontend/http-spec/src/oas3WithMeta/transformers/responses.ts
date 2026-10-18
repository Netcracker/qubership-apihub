import type { IHttpOperationResponse, Optional, Reference } from '@stoplight/types'
import { IMediaTypeContent } from '@stoplight/types'
import { CustomResponseObject } from 'openapi3-ts'

import { withContext } from '../../context'
import { isNonNullable, isString } from '../../guards'
import { getSharedKey } from '../../oas/resolver'
import { ArrayCallbackParameters } from '../../types'
import { entries, getKeptPropertiesValues, pickKeptProperties } from '../../utils'
import { mirrorDiffMetaKey, mirrorSelfDiffMetaKey } from '../consts'
import { isObject, isResponseObject } from '../guards'
import { Oas3WithMetaTranslateFunction } from '../types'
import { translateMediaTypeObject } from './content'
import { translateHeaderObject } from './headers'
import pickBy = require('lodash.pickby')

export const translateToResponse = withContext<
  Oas3WithMetaTranslateFunction<
    ArrayCallbackParameters<[statusCode: string, response: unknown]>,
    Optional<IHttpOperationResponse<true> | (Pick<IHttpOperationResponse, 'code'> & Reference)>
  >
>(function ([statusCode, response]) {
  if (!isResponseObject(response)) {
    return
  }

  const codeOrKey = this.context === 'service' ? getSharedKey(response) : statusCode

  return {
    id: this.generateId.httpResponse({ codeOrKey }),
    code: statusCode,
    headers: transformHeaders.bind(this)(response),
    contents: transformContents.bind(this)(response),

    ...pickBy(
      {
        description: response.description,
      },
      isString,
    ),

    ...pickKeptProperties(response, this.keepProperties),
  }
})

export const translateToResponses: Oas3WithMetaTranslateFunction<
  [responses: unknown],
  NonNullable<ReturnType<typeof translateToResponse>>[]
> = function (responses) {
  const diffMeta = getKeptPropertiesValues(responses, this.keepProperties)
  return entries(responses)
    .map(translateToResponse, this)
    .filter(isNonNullable)
    .map(response => ({
      ...response,
      ...{ [mirrorSelfDiffMetaKey]: diffMeta?.[response.code] },
    }))
}

const WHOLE_HEADER_CHANGED = 'whole-header-changed'
const PARTICULAR_HEADER_CHANGED = 'particular-header-changed'
type HeaderChangeMode =
  | typeof WHOLE_HEADER_CHANGED
  | typeof PARTICULAR_HEADER_CHANGED
  | undefined

const transformHeaders = withContext<
  Oas3WithMetaTranslateFunction<
    [CustomResponseObject],
    IHttpOperationResponse<true>['headers']
  >
>(function (response: CustomResponseObject) {
  const headers = response.headers
  if (!headers) {
    return []
  }

  let mode: HeaderChangeMode = undefined

  // added/removed whole property "headers" in response
  const responseKeys = Reflect.ownKeys(response)
  let headersDiffMeta: unknown = undefined
  for (const responseKey of responseKeys) {
    if (typeof responseKey !== 'symbol' || responseKey.toString() !== mirrorDiffMetaKey.toString()) {
      continue
    }
    const responseDiffMeta = response[responseKey]
    if (!isObject(responseDiffMeta) || !('headers' in responseDiffMeta)) {
      continue
    }
    headersDiffMeta = responseDiffMeta.headers
    mode = headersDiffMeta ? WHOLE_HEADER_CHANGED : undefined
  }

  // added/removed particular headers in response
  if (!mode) {
    const headerKeys = Reflect.ownKeys(headers)
    headersDiffMeta = undefined
    for (const headerKey of headerKeys) {
      if (typeof headerKey !== 'symbol' || headerKey.toString() !== mirrorDiffMetaKey.toString()) {
        continue
      }
      headersDiffMeta = headers[headerKey]
      mode = headersDiffMeta ? PARTICULAR_HEADER_CHANGED : undefined
    }
  }

  return entries(headers).map(value => {
    const result = translateHeaderObject.call(this, value)
    switch (mode) {
      case WHOLE_HEADER_CHANGED:
        if (result?.name && isObject(headersDiffMeta)) {
          result[mirrorSelfDiffMetaKey] = headersDiffMeta
        }
        break
      case PARTICULAR_HEADER_CHANGED:
        if (
          result?.name &&
          isObject(headersDiffMeta) &&
          result.name in headersDiffMeta
        ) {
          result[mirrorSelfDiffMetaKey] = headersDiffMeta[result.name]
        }
        break
    }
    return result
  }).filter(isNonNullable)
})

const transformContents = withContext<
  Oas3WithMetaTranslateFunction<
    [CustomResponseObject],
    IMediaTypeContent<true>[]
  >
>(function (response: CustomResponseObject) {
  const responseContent = response.content
  const responseContentKeys = responseContent ? Reflect.ownKeys(responseContent) : []

  let contentDiffMetaKey: symbol | undefined = undefined, contentDiffMeta: unknown = undefined
  for (const responseContentKey of responseContentKeys) {
    const responseContentValue = responseContent![responseContentKey]
    if (typeof responseContentKey !== 'symbol' || responseContentKey.toString() !== mirrorDiffMetaKey.toString()) {
      continue
    }
    contentDiffMetaKey = responseContentKey
    contentDiffMeta = responseContentValue
    break
  }

  return entries(responseContent)
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
