import { OpenAPIV3 } from 'openapi-types'
import { takeIfDefined } from './utils'
import Document = OpenAPIV3.Document
import ResponsesObject = OpenAPIV3.ResponsesObject
import ParameterObject = OpenAPIV3.ParameterObject
import SchemaObject = OpenAPIV3.SchemaObject
import RequestBody = OpenAPIV3.RequestBodyObject
import ReferenceObject = OpenAPIV3.ReferenceObject
import Parameters = OpenAPIV3.ParameterObject
import SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject

const defaultSpecContent = (): Document => ({
  openapi: '3.0.0',
  info: {
    version: '0.0.1',
    title: 'Default title',
  },
  paths: {},
})

// Builder class that defines general methods for building openAPI schema
export class OpenapiBuilder {
  private spec: Document

  constructor() {
    this.spec = defaultSpecContent()
  }

  // Reset the specification to its initial state
  reset(): void {
    this.spec = defaultSpecContent()
  }

  // Set the version and name of the schema
  addInfo(version: string, title: string, license?: string): OpenapiBuilder {
    this.spec.info.version = version
    this.spec.info.title = title
    if (license) {
      this.spec.info.license = {
        name: license,
      }
    }

    return this
  }

  // Add a schema server
  addServer(url: string): OpenapiBuilder {
    if (!this.spec.servers) {
      this.spec.servers = []
    }
    this.spec.servers.push({
      url: url,
    })

    return this
  }

  // Add a schema tag
  addTag(name: string, description?: string): OpenapiBuilder {
    if (!this.spec.tags) {
      this.spec.tags = []
    }
    this.spec.tags.push({
      name: name,
      description: description,
    })

    return this
  }

  // Add a schema path
  addPath(params: PathParameters): OpenapiBuilder {
    const {
      path, method = 'get', responses = createEmptyResponses(),
      requestBody, tags, parameters,
      summary = 'Default Summary',
      externalDocs,
      servers,
      security,
    } = params

    this.spec.paths[path] = {
      [method]: {
        summary: summary,
        ...takeIfDefined({ tags }),
        ...takeIfDefined({ parameters }),
        ...takeIfDefined({ responses }),
        ...takeIfDefined({ requestBody }),
        ...takeIfDefined({ externalDocs }),
        ...takeIfDefined({ servers }),
        ...takeIfDefined({ security }),
      },
    }
    return this
  }

  // Add a schema component
  addComponent(
    name: string,
    items: SchemaObject | ParameterObject | SecuritySchemeObject,
    type: ComponentType = SCHEMA_COMPONENT_TYPE,
  ): OpenapiBuilder {
    if (!this.spec.components) {
      this.spec.components = {}
    }
    const isSchema = type === SCHEMA_COMPONENT_TYPE
    const isParameter = type === PARAMETER_COMPONENT_TYPE

    if (!this.spec.components.schemas && isSchema) {
      this.spec.components.schemas = {}
    }
    if (!this.spec.components.parameters && isParameter) {
      this.spec.components.parameters = {}
    }
    if (this.spec.components.schemas && isSchema) {
      this.spec.components.schemas[name] = items as SchemaObject
    }
    if (this.spec.components.parameters && isParameter) {
      this.spec.components.parameters[name] = items as ParameterObject
    }

    return this
  }

// Get spec
  getSpec(): OpenAPIV3.Document {
    return this.spec
  }
}

type RequestBodyParameters = {
  schema?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  examples?: {
    [media: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.ExampleObject;
  }
}

export function createRequestBody(requestBody: RequestBodyParameters): OpenAPIV3.RequestBodyObject {
  return {
    content: {
      'application/json': {
        schema: requestBody.schema ?? SIMPLE_SCHEMA,
        ...takeIfDefined({ examples: requestBody.examples }),
      },
    },
  }
}

const SIMPLE_SCHEMA: OpenAPIV3.SchemaObject = {
  type: 'string',
}

export type PathParameters = {
  path: string
  responses?: ResponsesObject
  method?: string
  summary?: string
  tags?: string[]
  requestBody?: RequestBody
  parameters?: (Parameters | ReferenceObject) []
  externalDocs?: OpenAPIV3.ExternalDocumentationObject
  servers?: OpenAPIV3.ServerObject[]
  security?: OpenAPIV3.SecurityRequirementObject[];
}

type ComponentType =
  | typeof PARAMETER_COMPONENT_TYPE
  | typeof SCHEMA_COMPONENT_TYPE
  | typeof SECURITY_SCHEMA_COMPONENT_TYPE

export const PARAMETER_COMPONENT_TYPE = 'parameter'
export const SCHEMA_COMPONENT_TYPE = 'schema'

export const SECURITY_SCHEMA_COMPONENT_TYPE = 'security-schema'

const createEmptyResponses = (): ResponsesObject => ({
  '200': {
    description: 'Successful operation',
    content: {},
  },
})
