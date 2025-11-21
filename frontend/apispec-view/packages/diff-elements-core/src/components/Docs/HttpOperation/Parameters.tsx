import { JsonSchemaDiffViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import { mirrorDiffMetaKey, mirrorSelfDiffMetaKey } from '@netcracker/qubership-apihub-http-spec/oas3WithMeta'
import { useOperationSchemaOptionsMode } from '@stoplight/elements'
import { HttpParamStyles, IHttpContent, IHttpParam } from '@stoplight/types'
import { selfDiffMetaKey } from 'diff-block'
import type { JSONSchema7Object } from 'json-schema'
import { isObject, sortBy } from 'lodash'
import * as React from 'react'
import { useMemo } from 'react'

import { DiffAction, DiffMetaRecord } from '@netcracker/qubership-apihub-api-diff'
import { useAggregatedDiffsMetaKey } from '@stoplight/elements/containers/AggregatedDiffsMetaKeyContext'
import { useChangeSeverityFilters } from '@stoplight/elements/containers/ChangeSeverityFiltersContext'
import { useDiffsMetaKey } from '@stoplight/elements/containers/DiffsMetaKeyContext'
import { isNodeExample } from '../../../utils/http-spec/examples'

type ParameterKey = string
type ParameterMediaType = string
type ParametersMediaTypeMap = Record<ParameterKey, ParameterMediaType> | undefined

type ParameterType = 'query' | 'header' | 'path' | 'cookie';

type IExtendedHttpParam = IHttpParam & {
  content: Record<string, IHttpContent>;
};

interface ParametersProps {
  parameterType: ParameterType;
  parameters?: IExtendedHttpParam[];
}

const readableStyles = {
  [HttpParamStyles.PipeDelimited]: 'Pipe separated values',
  [HttpParamStyles.SpaceDelimited]: 'Space separated values',
  [HttpParamStyles.CommaDelimited]: 'Comma separated values',
  [HttpParamStyles.Simple]: 'Comma separated values',
  [HttpParamStyles.Matrix]: 'Path style values',
  [HttpParamStyles.Label]: 'Label style values',
  [HttpParamStyles.Form]: 'Form style values',
} as const

const defaultStyle = {
  query: HttpParamStyles.Form,
  header: HttpParamStyles.Simple,
  path: HttpParamStyles.Simple,
  cookie: HttpParamStyles.Form,
} as const

export const Parameters: React.FunctionComponent<ParametersProps> = ({ parameters, parameterType }) => {
  const diffsMetaKey = useDiffsMetaKey()
  const aggregatedDiffsMetaKey = useAggregatedDiffsMetaKey()
  const diffMetaKeys = React.useMemo(() => ({
    diffsMetaKey: diffsMetaKey,
    aggregatedDiffsMetaKey: aggregatedDiffsMetaKey,
  }), [diffsMetaKey, aggregatedDiffsMetaKey])

  // FIXME 18.06.24 // Get rid of "parametersMediaTypes" when future wonderful AMT+ADV are ready!
  const [schema, parametersMediaTypes] = useMemo(
    () => httpOperationParamsToSchema({ parameters, parameterType }, diffsMetaKey),
    [parameters, parameterType, diffsMetaKey],
  )
  const { schemaViewMode, defaultSchemaDepth, notSplitSchemaViewer } = useOperationSchemaOptionsMode()

  const filters = useChangeSeverityFilters()

  if (!schema) {
    return null
  }

  return (
    <JsonSchemaDiffViewer
      schema={schema}
      displayMode={schemaViewMode}
      expandedDepth={defaultSchemaDepth}
      overriddenKind="parameters"
      metaKeys={diffMetaKeys}
      layoutMode={notSplitSchemaViewer ? 'document' : 'side-by-side-diffs'}
      filters={filters}
      topLevelPropsMediaTypes={parametersMediaTypes}
    />
  )
}
Parameters.displayName = 'HttpOperation.Parameters'

function mergeMirrorSymbolsForDiffMeta(
  source: object, 
  diffMetaKey: symbol,
): void {
  source[mirrorDiffMetaKey] && (source[diffMetaKey] = source[mirrorDiffMetaKey])
  source[mirrorSelfDiffMetaKey] && (source[selfDiffMetaKey] = source[mirrorSelfDiffMetaKey])
}

const httpOperationParamsToSchema = (
  { parameters, parameterType }: ParametersProps,
  diffMetaKey: symbol,
): [JSONSchema7Object | null, ParametersMediaTypeMap] => {
  if (!parameters || !parameters.length) {
    return [null, undefined]
  }

  let schema = {
    type: 'object',
    properties: {},
    required: [] as string[],
  }
  let parametersMediaTypesMap: ParametersMediaTypeMap = undefined

  const sortedParams = sortBy(parameters, ['required', 'name'])

  for (const p of sortedParams) {
    if (!p.schema && !p.content) continue

    const { name, description, required, deprecated, examples, style } = p

    const paramContent = p.schema ?? p.content
    let paramSchema = p.schema
    if (isObject(paramContent) && paramContent !== paramSchema) {
      const paramContentKeys = Object.keys(paramContent)
      if (paramContentKeys.length > 0) {
        const mediaType = paramContentKeys[0]
        paramSchema = paramContent[mediaType].schema
        parametersMediaTypesMap ??= {}
        parametersMediaTypesMap[p.name] = mediaType
      }
    }

    const paramExamples =
      examples?.map(example => {
        if (isNodeExample(example)) {
          return example.value
        }

        return example.externalValue
      }) || []
    const schemaExamples = paramSchema?.examples
    const schemaExamplesArray = Array.isArray(schemaExamples) ? schemaExamples : []

    // TODO (CL): This can be removed when http operations are fixed https://github.com/stoplightio/http-spec/issues/26
    const paramDescription = description || paramSchema?.description

    const paramDeprecated = deprecated || (paramSchema as any)?.deprecated
    const paramStyle = style && defaultStyle[parameterType] !== style ? readableStyles[style] || style : undefined

    mergeMirrorSymbolsForDiffMeta(p, diffMetaKey)

    const paramPropsDiffMeta = {
      ...p[diffMetaKey] ?? {},
      ...paramSchema?.[diffMetaKey] ?? {},
    }
    schema.properties![p.name] = {
      ...paramSchema,
      ...paramDescription ? { description: paramDescription } : {},
      examples: [...paramExamples, ...schemaExamplesArray],
      ...paramDeprecated !== undefined ? { deprecated: paramDeprecated } : {},
      ...paramStyle !== undefined ? { style: paramStyle } : {},
      [diffMetaKey]:
        Object.keys(paramPropsDiffMeta).length > 0
          ? paramPropsDiffMeta
          : undefined,
    }

    if (p[diffMetaKey] && 'name' in p[diffMetaKey]) {
      const originalNameDiff = p[diffMetaKey].name
      const nameDiff = {
        [p.name]: {
          type: originalNameDiff.type,
          action: DiffAction.rename,
          description: originalNameDiff.description,
          beforeKey: originalNameDiff.beforeValue,
          beforeDeclarationPaths: originalNameDiff.beforeDeclarationPaths,
          afterKey: originalNameDiff.afterValue,
          afterDeclarationPaths: originalNameDiff.afterDeclarationPaths,
        }
      }
      schema.properties![diffMetaKey] = {
        ...schema.properties![diffMetaKey],
        ...nameDiff,
      }
    }

    if (p[diffMetaKey] && 'deprecated' in p[diffMetaKey]) {
      const deprecatedDiff = { deprecated: p[diffMetaKey].deprecated }
      schema[diffMetaKey] = diffMetaKey in schema
        ? { ...schema[diffMetaKey], ...deprecatedDiff }
        : deprecatedDiff
    }

    // Here we need to extend `schema.properties` by diff meta if exists to correct work of `JsonSchemaDiffViewer`
    if (p[selfDiffMetaKey]) {
      schema.properties![diffMetaKey] = {
        ...schema.properties![diffMetaKey],
        [p.name]: p[selfDiffMetaKey],
      }
    }

    const requiredChanged = !!schema.properties?.[p.name]?.[diffMetaKey]?.required
    if (required || requiredChanged) {
      schema.required.push(name)
    }
  }

  const requiredArrayDiffs: DiffMetaRecord = rearrangeRequiredDiffs(sortedParams, schema.required, diffMetaKey)
  if (Object.keys(requiredArrayDiffs).length > 0) {
    const requiredDiffs = { required: requiredArrayDiffs }
    schema[diffMetaKey] = diffMetaKey in schema
      ? { ...schema[diffMetaKey], ...requiredDiffs }
      : requiredDiffs
  }

  return [schema, parametersMediaTypesMap]
}

// TODO 01.08.24 // Remove it later
function rearrangeRequiredDiffs(
  parameters: IExtendedHttpParam[],
  required: string[],
  diffMetaKey: symbol,
): DiffMetaRecord {
  const diffRecord: DiffMetaRecord = {}
  for (const parameter of parameters) {
    const parameterDiff = parameter[diffMetaKey]
    const requiredIndex = required.indexOf(parameter.name)
    if (requiredIndex !== -1 && parameterDiff) {
      diffRecord[requiredIndex] = parameterDiff?.required
      delete parameterDiff?.required
    }
  }
  return diffRecord
}
