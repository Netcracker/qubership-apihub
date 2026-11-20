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


