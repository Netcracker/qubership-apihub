import { buildSchema as graphqlBuildSchema } from 'graphql'
import jsyaml from 'js-yaml'
import React, { FC, useEffect, useState } from 'react'
import { buildFromIntrospection } from "../build-graph-api/of-introspection"
import { buildFromSchema } from '../build-graph-api/of-schema'
import { printGraphApi } from '../print-graph-api'
import { GraphApiSchema } from '../types'
import './graph-api-playground.css'

type GraphApiPlaygroundProps = {
  mode: ModeType
  resultFormat: ResultType
}

const buildGraphApi = (
  source: string,
  sourceType: SourceType = SOURCE_TYPE_GRAPHQL,
): GraphApiSchema | never => {
  if (!source) {
    throw new Error('Please fill the source')
  }

  if (sourceType === SOURCE_TYPE_GRAPHQL) {
    const graphqlSchema = graphqlBuildSchema(source, { noLocation: true })
    return buildFromSchema(graphqlSchema)
  } else {
    const introspectionSchema = JSON.parse(source)
    return buildFromIntrospection(introspectionSchema)
  }
}

export const GraphApiPlayground: FC<GraphApiPlaygroundProps> = ({
  mode,
  resultFormat,
}) => {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')

  const convert = (): void => {
    let result: string = ''

    let sourceType: SourceType | undefined
    switch (mode) {
      case GRAPHQL_TO_GRAPHAPI:
      case GRAPHQL_TO_GRAPHQL:
        sourceType = SOURCE_TYPE_GRAPHQL
        break
      case INTROSPECTION_TO_GRAPHAPI:
        sourceType = SOURCE_TYPE_INTROSPECTION
        break
    }

    if (mode === GRAPHQL_TO_GRAPHAPI || mode === INTROSPECTION_TO_GRAPHAPI) {
      try {
        const graphApiSchema = buildGraphApi(inputText, sourceType)
        if (graphApiSchema) {
          switch (resultFormat) {
            case RESULT_TYPE_YAML:
              result = jsyaml.dump(graphApiSchema, { noRefs: true, quotingType: '"' })
              break
            case RESULT_TYPE_JSON:
              result = JSON.stringify(graphApiSchema, null, 2)
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          result = error.message
        }
      }
    }
    if (mode === GRAPHAPI_TO_GRAPHQL) {
      try {
        const graphApiSchema = jsyaml.load(inputText) as GraphApiSchema
        result = printGraphApi(graphApiSchema)
      } catch (error) {
        if (error instanceof Error) {
          result = error.message
        }
      }
    }
    if (mode === GRAPHQL_TO_GRAPHQL) {
      try {
        const graphApi = buildGraphApi(inputText, sourceType)
        result = typeof graphApi === 'object' ? printGraphApi(graphApi) : ''
      } catch (error) {
        if (error instanceof Error) {
          result = error.message
        }
      }
    }

    setOutputText(result)
  }

  useEffect(() => {
    convert()
  }, [inputText, resultFormat, mode])

  return (
    <div className="graph-playground">
      <div className="graph-playground__input">
        <textarea
          className="graph-playground__textarea"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      <div className="graph-playground__output">
        <pre className="graph-playground__pre">
          {outputText}
        </pre>
      </div>
    </div>
  )
}

export const GRAPHQL_TO_GRAPHAPI = 'GraphQL to GraphAPI'
export const INTROSPECTION_TO_GRAPHAPI = 'Introspection to GraphAPI'
export const GRAPHAPI_TO_GRAPHQL = 'GraphAPI to GraphQL'
export const GRAPHQL_TO_GRAPHQL = 'GraphQL to GraphQL'

export const SOURCE_TYPE_GRAPHQL = 'graphql'
export const SOURCE_TYPE_INTROSPECTION = 'introspection'

export const RESULT_TYPE_YAML = 'yaml'
export const RESULT_TYPE_JSON = 'json'

export type ModeType =
  typeof GRAPHQL_TO_GRAPHAPI
  | typeof INTROSPECTION_TO_GRAPHAPI
  | typeof GRAPHAPI_TO_GRAPHQL
  | typeof GRAPHQL_TO_GRAPHQL

export type SourceType =
  typeof SOURCE_TYPE_GRAPHQL
  | typeof SOURCE_TYPE_INTROSPECTION

export type ResultType =
  typeof RESULT_TYPE_YAML
  | typeof RESULT_TYPE_JSON
