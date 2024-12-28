/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { OperationCrawlRules } from '../../types'
import { REST_SCOPES } from './rest.consts'

const { annotation, examples, properties, request, response } = REST_SCOPES

export const jsonSchemaRules = (parentRule: string[] = [], customRules: OperationCrawlRules = {}): OperationCrawlRules => ({
  '/title': { '#': [...parentRule, annotation] },
  '/enum': { '#': [...parentRule, properties] },
  '/not': () => jsonSchemaRules(parentRule),
  '/allOf': {
    '/*': () => jsonSchemaRules(parentRule),
  },
  '/oneOf': {
    '/*': () => jsonSchemaRules(parentRule),
  },
  '/anyOf': {
    '/*': () => jsonSchemaRules(parentRule),
  },
  '/items': () => jsonSchemaRules(parentRule),
  '/properties': {
    '/*': () => jsonSchemaRules(parentRule, { '##': [...parentRule, properties] }),
  },
  '/additionalProperties': () => jsonSchemaRules(parentRule),
  '/description': { '#': [...parentRule, annotation] },
  '/format': { '#': [...parentRule, annotation] },
  '/default': { '#': [...parentRule, properties] },
  '/deprecated': { '##': [...parentRule, annotation] },
  '/example': { '#': [...parentRule, examples] },
  '/examples': {
    '/*': {
      '/$ref': {},
      '/value': { '#': [...parentRule, examples] },
      '/*': { '#': [...parentRule, annotation] },
    },
  },
  // '!': toDeprecatedSchemaPropertyDescription,
  ...customRules,
})

const parametersRules = (parentRule: string[] = []): OperationCrawlRules => ({
  '/*': {
    '/name': { '#': [...parentRule, properties] },
    '/schema': jsonSchemaRules(parentRule),
    '/description': { '#': [...parentRule, annotation] },
    '/deprecated': { '##': [...parentRule, annotation] },
    // '!': toDeprecatedRequestParameterDescription,
  },
})

const headersRules = (parentRule: string[] = []): OperationCrawlRules => ({
  '/*': {
    '##': [...parentRule, properties],
    '/description': { '#': [...parentRule, annotation] },
    '/deprecated': { '##': [...parentRule, annotation] },
    // '!': toDeprecatedContentHeaderDescription,
  },
})

const contentRules = (parentRule: string[] = []): OperationCrawlRules => ({
  '/*': {
    '##': [...parentRule],
    '/schema': jsonSchemaRules(parentRule),
    '/example': { '#': [...parentRule, examples] },
    '/examples': {
      '/*': {
        '/$ref': {},
        '/value': { '#': [...parentRule, examples] },
        '/*': { '#': [...parentRule, annotation] },
      },
    },
    '/encoding': {
      '/contentType': { '#': [...parentRule, annotation] },
      '/headers': headersRules(parentRule),
      '/style': { '#': [...parentRule, annotation] },
    },
  },
})

const requestBodiesRules = (parentRule: string[] = []): OperationCrawlRules => ({
  '/description': { '#': [...parentRule, annotation] },
  '/content': contentRules(parentRule),
})

const responsesRules = (parentRule: string[] = []): OperationCrawlRules => ({
  '/*': {
    '##': [...parentRule, annotation],
    '/description': { '#': [...parentRule, annotation] },
    '/headers': headersRules(parentRule),
    '/content': contentRules(parentRule),
  },
})

const serversRules = (parentRule: string[] = []): OperationCrawlRules => ({
  '/*': {
    '/url': { '#': [...parentRule, annotation] },
    '/description': { '#': [...parentRule, annotation] },
    '/variables': {
      '/*': {
        '/*': { '#': [...parentRule, annotation] },
        '##': [...parentRule, annotation],
      },
    },
  },
})

export const operationRules: OperationCrawlRules = {
  '/tags': {
    '/*': { '#': [annotation] },
  },
  '/summary': { '#': [request, annotation] },
  '/description': { '#': [request, annotation] },
  '/operationId': { '#': [request, annotation] },
  '/parameters': parametersRules([request]),
  '/requestBody': requestBodiesRules([request]),
  '/responses': responsesRules([response]),
  // '/security': { '#': [annotation] },
  '/servers': serversRules([request]),
  '/deprecated': { '##': [request, annotation] },
  // '!': toDeprecatedOperationDescription,
}

export const openapiRules: OperationCrawlRules = {
  '/info': {
    '/title': { '#': [annotation] },
    '/description': { '#': [annotation] },
    '/contact': {
      '/name': { '#': [annotation] },
    },
    '/license': {
      '/name': { '#': [annotation] },
    },
    '/version': { '#': [annotation] },
  },
  '/servers': serversRules([request]),
  '/paths': {
    '/*': operationRules,
  },
  '/components': {
    '/schemas': {
      '/*': {
        ...jsonSchemaRules(),
        '##': [annotation],
      },
    },
    '/responses': {
      '/*': responsesRules(),
    },
    '/parameters': {
      '/*': parametersRules(),
    },
    '/examples': {
      '/*': {
        '/value:': { '#': [examples] },
        '/*': { '#': [annotation] },
      },
    },
    '/requestBodies': {
      '/*': requestBodiesRules(),
    },
    '/headers': {
      '/*': headersRules(),
    },
    '/securitySchemes': {
      '/*': {
        '##': [annotation],
        '/type': { '#': [annotation] },
        '/description': { '#': [annotation] },
        '/name': { '#': [annotation] },
      },
    },
  },
  '/security': { '#': [annotation] },
  '/tags': {
    '/*': {
      '/description': { '#': [annotation] },
    },
  },
}
