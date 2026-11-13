import type { DocumentsDto } from './types'

export const VERSION_DOCUMENTS_2_2: DocumentsDto = {
  documents: [
    {
      fileId: 'api-1.json',
      slug: 'api-1.json',
      title: 'API 1',
      type: 'openapi-3-0',
      format: 'json',
      version: 'v3.000',
      labels: [],
      description: 'API service',
      info: {
        contact: {
          name: 'API Support',
          url: 'https://example.com/support',
          email: 'apiteam@swager.io',
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://httpd.apache.org',
        },
        termsOfService: 'https://example.com/support',
      },
      externalDocs: {
        description: 'Find out more about Swagger',
        url: 'https://example.com/support',
      },
    },
    {
      fileId: 'api-2.json',
      slug: 'api-2.json',
      title: 'API 2',
      type: 'openapi-3-0',
      format: 'json',
      labels: ['Cloud', 'QS'],
      description: 'An increase in the scalability of different operations such as catalog browsing that is achieved by in-memory caching.',
      info: {
        contact: {
          url: 'https://example.com/support',
          email: 'apiteam@swager.io',
        },
        license: {
          name: 'Apache 2.0',
          url: 'https://httpd.apache.org',
        },
      },
      externalDocs: {
        url: 'https://example.com/support',
      },
    },
    {
      fileId: 'api-3.json',
      slug: 'api-1.json',
      title: 'API 3',
      type: 'openapi-3-0',
      format: 'json',
      labels: ['QS'],
      info: {
        contact: {
          email: 'apiteam@swager.io',
        },
        license: {
          name: 'Apache 2.0',
        },
      },
      externalDocs: {
        url: 'https://example.com/support',
      },
    },
    {
      fileId: 'api-4.json',
      slug: 'api-4.json',
      title: 'Petstore OpeenApi',
      type: 'openapi-3-0',
      format: 'yaml',
      labels: [],
      description: 'An increase in the scalability of different operations such as catalog browsing that is achieved by in-memory caching.',
    },
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
      labels: [
        'MyOrganization',
        'ServiceExample',
      ],
    },
    {
      fileId: 'unknown-sample.doc',
      slug: 'api-doc',
      title: 'Unknown Sample',
      type: 'unknown',
      format: 'unknown',
      labels: [],
    },
  ],
}

export const VERSION_DOCUMENTS_2_6: DocumentsDto = {
  documents: [
    {
      fileId: 'openapi-v3.json',
      slug: 'openapi-v3-json',
      title: 'v1',
      type: 'openapi-3-0',
      version: 'v3.000',
      format: 'json',
      labels: ['API', 'QS'],
    },
    {
      fileId: 'v3.json',
      slug: 'v3-json',
      title: 'IBTMF v3',
      type: 'openapi-3-0',
      version: '5.34',
      format: 'json',
      labels: ['API', 'QS'],
    },
    {
      fileId: 'openapi/petstore-opeenapi.yaml',
      slug: 'openapi-petstore-opeenapi-yaml',
      title: 'Petstore OpeenApi',
      version: 'v1.2',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      version: 'v1.34.12',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'openapi/ibtmf/sample.postman_collection.yaml',
      slug: 'openapi-ibtmf-sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
      labels: ['API', 'QS'],
    },
    {
      fileId: 'markdown-sample.md',
      slug: 'markdown-sample-md',
      title: 'Markdown Sample',
      type: 'unknown',
      format: 'md',
      labels: ['API', 'QS'],
    },
  ],
}

export const VERSION_DOCUMENTS_1_4: DocumentsDto = {
  documents: [
    {
      fileId: 'openapi/petstore-opeenapi.yaml',
      slug: 'openapi-petstore-opeenapi-yaml',
      title: 'Petstore OpeenApi',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'openapi/ibtmf/sample.postman_collection.yaml',
      slug: 'openapi-ibtmf-sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
    },
  ],
}

export const VERSION_DOCUMENTS_1_0: DocumentsDto = {
  documents: [
    {
      fileId: 'openapi/ibtmf/sample.postman_collection.yaml',
      slug: 'openapi-ibtmf-sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'graphql-sample.graphql',
      slug: 'api-graphql',
      title: 'Graphql Sample',
      type: 'graphql',
      format: 'json',
      labels: [],
    },
  ],
}
export const VERSION_DOCUMENTS_0_0: DocumentsDto = {
  documents: [],
}

export const VERSION_DOCUMENTS = new Map([
  ['2.2', VERSION_DOCUMENTS_2_2],
  ['2.6', VERSION_DOCUMENTS_2_6],
  ['1.4', VERSION_DOCUMENTS_1_4],
  ['1.0', VERSION_DOCUMENTS_1_0],
  ['0.0', VERSION_DOCUMENTS_0_0],
])
