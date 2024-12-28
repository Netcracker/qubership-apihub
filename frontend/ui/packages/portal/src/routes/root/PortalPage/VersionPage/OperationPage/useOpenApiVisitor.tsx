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

import type { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { OpenApiWalker, type VisitorCallbackArgument } from '@netcracker/qubership-apihub-api-visitor'
import type { OpenAPIV3 } from 'openapi-types'
import { useMemo } from 'react'
import type {
  OpenApiCustomSchemaObject,
  OpenApiData,
  OpenApiVisitorData,
  OpenApiVisitorDataWithSection,
} from '@apihub/entities/operation-structure'
import {
  OPEN_API_SECTION_PARAMETERS,
  OPEN_API_SECTION_REQUESTS,
  OPEN_API_SECTION_RESPONSES,
} from '@apihub/entities/operation-structure'
import type { DenormalizeOptions, NormalizeOptions } from '@netcracker/qubership-apihub-api-unifier'
import {
  denormalize,
  JSON_SCHEMA_PROPERTY_TITLE,
  normalize,
  OPEN_API_PROPERTY_COMPONENTS,
  OPEN_API_PROPERTY_SCHEMAS,
  pathItemToFullPath,
} from '@netcracker/qubership-apihub-api-unifier'
import {
  resolveSharedSchemaNames,
  VISITOR_FLAG_DEFAULTS,
  VISITOR_FLAG_HASH,
  VISITOR_FLAG_INLINE_REFS,
  VISITOR_FLAG_ORIGINS,
  VISITOR_FLAG_TITLE,
} from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/visitor-utils'
import { schemaHashWithTitle } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'

const walker = new OpenApiWalker()

export function useOpenApiVisitor(operationData: object | undefined): OpenApiData | undefined {
  return useMemo(() => {
    //ASSUMPTIONS. single operations specs can be here
    const parameters: OpenApiVisitorDataWithSection = { data: [], scopeDeclarationPath: [], declarationPath: [] }
    //ASSUMPTIONS. single operations can be here with only one media type in request specs can be here
    const requests: Record<string, OpenApiVisitorDataWithSection> = {}
    const responses: Record<string, Record<string, OpenApiVisitorDataWithSection>> = {}
    const scopeDeclarationPathStack: JsonPath[] = []

    let activeDataSection: Record<string, OpenApiVisitorDataWithSection> = {}
    let activeDataCollection: OpenApiVisitorData[] = []
    let activeDataCycleGuard: Set<unknown> = new Set()

    if (!operationData) {
      return undefined
    }

    const options: NormalizeOptions = {
      syntheticTitleFlag: VISITOR_FLAG_TITLE,
      originsFlag: VISITOR_FLAG_ORIGINS,
      hashFlag: VISITOR_FLAG_HASH,
      defaultsFlag: VISITOR_FLAG_DEFAULTS,
      inlineRefsFlag: VISITOR_FLAG_INLINE_REFS,
      unify: true,
      allowNotValidSyntheticChanges: true,
      validate: true,
    }
    const invertOptions: DenormalizeOptions = {
      ...options,
      originsAlreadyDefined: true,
      hashFlag: undefined,
      ignoreSymbols: [VISITOR_FLAG_HASH, VISITOR_FLAG_INLINE_REFS],
    }
    delete invertOptions.inlineRefsFlag
    const normalizedSpec = denormalize(normalize(operationData, options), invertOptions) as Record<PropertyKey, unknown>
    const schemaHandler: (value: VisitorCallbackArgument<OpenAPIV3.SchemaObject, unknown>) => boolean = ({ value }) => {
      if (activeDataCycleGuard.has(value)) {
        return false
      }
      activeDataCycleGuard.add(value)
      const schemaObjectNames = resolveSharedSchemaNames(value)
      const title = value?.title
      if (title && schemaObjectNames) {
        schemaObjectNames.forEach(schemaObjectName => {
          let existingData: OpenApiVisitorData | undefined = activeDataCollection.find(i => i.schemaObjectName === schemaObjectName)
          if (!existingData) {
            const sharedSchema =
              (normalizedSpec[OPEN_API_PROPERTY_COMPONENTS] as OpenAPIV3.ComponentsObject)
                ?.[OPEN_API_PROPERTY_SCHEMAS]?.[schemaObjectName] as OpenAPIV3.SchemaObject
            activeDataCollection.push(existingData = {
              title: sharedSchema?.[JSON_SCHEMA_PROPERTY_TITLE] ?? title,
              scopeDeclarationPath: scopeDeclarationPathStack.at(-1)!,
              declarationPath: [OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_SCHEMAS, schemaObjectName],
              schemaObject: sharedSchema,
              schemaObjectName: schemaObjectName,
              schemaTolerantHashWithTitle: schemaHashWithTitle(sharedSchema),
              derivedSchemas: [],
            })
          }
          if (!existingData.derivedSchemas.includes(value)) {
            existingData.derivedSchemas.push(value)
          }
        })
      }
      return true
    }

    walker.walkPathsOnNormalizedSource(normalizedSpec, {
      pathStart: ({ declarationPaths }) => {
        const path = pathItemToFullPath(declarationPaths[0])
        scopeDeclarationPathStack.push(path)
        return true
      },
      pathEnd: () => {
        scopeDeclarationPathStack.pop()
      },
      responseStart: ({ responseCode, declarationPaths }) => {
        responses[responseCode] = activeDataSection = {}
        const path = pathItemToFullPath(declarationPaths[0])
        scopeDeclarationPathStack.push(path)
        return true
      },
      responseEnd: () => {
        activeDataSection = {}
        scopeDeclarationPathStack.pop()
      },

      requestBodyStart: ({ declarationPaths }) => {
        const path = pathItemToFullPath(declarationPaths[0])
        scopeDeclarationPathStack.push(path)
        activeDataSection = requests
        return true
      },
      requestBodyEnd: () => {
        activeDataSection = {}
        scopeDeclarationPathStack.pop()
      },

      parameterStart: ({ value, declarationPaths }) => {
        if (value && value.name) {
          const path = pathItemToFullPath(declarationPaths[0])
          parameters.data.push({
            title: value.name,
            scopeDeclarationPath: scopeDeclarationPathStack.at(-1)!,
            declarationPath: path,
            schemaObject: paramToSchema(value),
            derivedSchemas: [],
          })
        }
        return false
      },
      headerStart: () => false, //forgotten?

      mediaTypeStart: ({ mediaType, declarationPaths }) => {
        const path = pathItemToFullPath(declarationPaths[0])
        activeDataSection[mediaType] = {
          data: activeDataCollection = [],
          scopeDeclarationPath: path,
          declarationPath: path,
        }
        activeDataCycleGuard = new Set()
        scopeDeclarationPathStack.push(path)
        return true
      },
      mediaTypeEnd: () => {
        activeDataCycleGuard = new Set()
        activeDataCollection = []
        scopeDeclarationPathStack.pop()
      },

      schemaRootStart: schemaHandler,
      combinerItemStart: schemaHandler,
      schemaItemsStart: schemaHandler,
      schemaPropertyStart: schemaHandler,
      combinerStart: ({ value }) => {
        if (activeDataCycleGuard.has(value)) {
          return false
        }
        activeDataCycleGuard.add(value)
        return true
      },
    }, { originsFlag: VISITOR_FLAG_ORIGINS })

    return {
      [OPEN_API_SECTION_PARAMETERS]: parameters,
      [OPEN_API_SECTION_RESPONSES]: responses,
      [OPEN_API_SECTION_REQUESTS]: requests,
    }
  }, [operationData])
}

//todo copy from ApiSpecView (httpOperationParamsToSchema), need to optimize
// TODO 06.08.24 // Uncomment code fragments when it's ready to render parameter examples
const paramToSchema = (value: OpenAPIV3.ParameterObject): OpenApiCustomSchemaObject => {
  const { name, description, deprecated/*, examples*/, schema = {} } = value

  // const paramExamples =
  //   examples
  //     ? Object.values(examples).map(example => {
  //       if (isExampleObject(example)) {
  //         return example.value
  //       }
  //
  //       return example.$ref
  //     })
  //     : []
  const schemaExample = (schema as OpenAPIV3.SchemaObject).example
  const schemaExamplesFragment = schemaExample !== undefined ? { examples: [schemaExample] } : {}

  // TODO (CL): This can be removed when http operations are fixed https://github.com/stoplightio/http-spec/issues/26
  const paramDescription = description || (schema as OpenAPIV3.SchemaObject)?.description
  const paramDeprecated = deprecated || (schema as OpenAPIV3.SchemaObject)?.deprecated

  return {
    ...schema,
    title: name,
    description: paramDescription,
    ...schemaExamplesFragment,
    deprecated: paramDeprecated,
  }
}

// export const isExampleObject = (example: OpenAPIV3.ReferenceObject | OpenAPIV3.ExampleObject): example is OpenAPIV3.ExampleObject => {
//   return 'value' in example
// }
