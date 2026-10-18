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

import { PROPERTY_ALIAS_ADDITIONAL_PROPERTIES, VisitorCrawlRules } from './openapi.types'

const jsonSchemaRules: (
    self?: () => VisitorCrawlRules,
) => VisitorCrawlRules =
    (
        self = () => jsonSchemaRules(),
    ) => ({
        '/items': ({ value }) => ({
            ...(Array.isArray(value)
                ? {
                    '/*': self,
                }
                : {
                    ...self(),
                    visitorMethodBase: 'schemaItems',
                    createContext: (_, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths }),
                }
            ),
        }),
        '/additionalItems': ({ value }) => ({
            ...(typeof value === 'boolean' ? {} : {
                ...self(),
                visitorMethodBase: 'schemaItems',
                createContext: (_, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths }),
            }),
        }),
        '/properties': {
            '/*': () => ({
                ...self(),
                visitorMethodBase: 'schemaProperty',
                createContext: (propertyName, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, propertyName }),
            }),
            passthrough: true,
        },
        '/additionalProperties': ({ value }) => ({
            ...(typeof value === 'boolean' ? {} : {
                ...self(),
                visitorMethodBase: 'schemaProperty',
                createContext: (_, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, propertyName: PROPERTY_ALIAS_ADDITIONAL_PROPERTIES }),
            }),
        }),
        '/patternProperties': {
            '/*': () => ({
                ...self(),
                visitorMethodBase: 'schemaProperty',
                createContext: (propertyName, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, propertyName }),
            }),
            passthrough: true,
        },
        '/oneOf': {
            '/*': () => ({
                ...self(),
                visitorMethodBase: 'combinerItem',
                createContext: (combinerItemIndex, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, combinerItemIndex }),
            }),
            visitorMethodBase: 'combiner',
            createContext: (combinerType, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, combinerType }),
        },
        '/anyOf': {
            '/*': () => ({
                ...self(),
                visitorMethodBase: 'combinerItem',
                createContext: (combinerItemIndex, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, combinerItemIndex }),
            }),
            visitorMethodBase: 'combiner',
            createContext: (combinerType, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, combinerType }),
        },
        // '/not': () => ({
        //     ...self(),
        // }),

        // '/definitions': {
        //     '/*': self,
        // },
        '/allOf': {
            '/*': () => ({
                ...self(),
                visitorMethodBase: 'combinerItem',
                createContext: (combinerItemIndex, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, combinerItemIndex }),
            }),
            visitorMethodBase: 'combiner',
            createContext: (combinerType, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, combinerType }),
        },
        visitorMethodBase: 'schemaRoot',
        createContext: (_, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths }),
    })

// TODO: NEED TO MOVE IT OUT!!!
// See "Split the rules" for more details
const customFor30JsonSchemaRulesFactory: () => VisitorCrawlRules = () => {
    const core = jsonSchemaRules(() => customFor30JsonSchemaRules)
    return ({
        ...core,
        '/items': () => ({
            ...customFor30JsonSchemaRules,
            visitorMethodBase: 'schemaItems',
            createContext: (_, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths }),
        }),
    })
}
const customFor30JsonSchemaRules = customFor30JsonSchemaRulesFactory()

const openApiJsonSchemaRules = customFor30JsonSchemaRules

const openApiMediaTypesRules: VisitorCrawlRules = {
    '/*': {
        '/schema': openApiJsonSchemaRules,
        visitorMethodBase: 'mediaType',
        createContext: (mediaType, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, mediaType }),

    },
}

const openApiHeaderRules: VisitorCrawlRules = {
    '/schema': openApiJsonSchemaRules,
    visitorMethodBase: 'header',
    createContext: (header, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, header }),
}

const openApiHeadersRules: VisitorCrawlRules = {
    '/*': openApiHeaderRules,
}

const openApiParameterRules: VisitorCrawlRules = {
    '/schema': openApiJsonSchemaRules,
    visitorMethodBase: 'parameter',
    createContext: (method, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, method }),
}

const openApiParametersRules: VisitorCrawlRules = {
    '/*': openApiParameterRules,
}

const openApiRequestRules: VisitorCrawlRules = {
    '/content': openApiMediaTypesRules,
    visitorMethodBase: 'requestBody',
    createContext: (_, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths }),

}

const openApiResponseRules: VisitorCrawlRules = {
    '/headers': openApiHeadersRules,
    '/content': openApiMediaTypesRules,
    visitorMethodBase: 'response',
    createContext: (responseCode, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, responseCode }),
}

const openApiResponsesRules: VisitorCrawlRules = {
    '/*': openApiResponseRules,
}

const openApiMethodRules: VisitorCrawlRules = {
    '/parameters': openApiParametersRules,
    '/requestBody': openApiRequestRules,
    '/responses': openApiResponsesRules,
    visitorMethodBase: 'httpMethod',
    createContext: (method, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, method }),
}

export const openApiRules: VisitorCrawlRules = {
    '/paths': {
        '/*': {
            '/get': openApiMethodRules,
            '/post': openApiMethodRules,
            '/put': openApiMethodRules,
            '/delete': openApiMethodRules,
            '/patch': openApiMethodRules,
            '/options': openApiMethodRules,
            '/head': openApiMethodRules,
            '/trace': openApiMethodRules,
            '/parameters': openApiParametersRules,
            visitorMethodBase: 'path',
            createContext: (path, value, declarationPaths, valueAlreadyVisited) => ({ value, valueAlreadyVisited, declarationPaths, path }),
        },
    },
}


