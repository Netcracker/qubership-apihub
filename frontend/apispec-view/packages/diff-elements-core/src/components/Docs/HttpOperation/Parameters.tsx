import { JsonSchemaDiffsViewer, JsonSchemaViewer } from '@netcracker/qubership-apihub-api-doc-viewer'
import { mirrorDiffMetaKey, mirrorSelfDiffMetaKey } from '@netcracker/qubership-apihub-http-spec/oas3WithMeta'
import { useOperationSchemaOptionsMode } from '@netcracker/qubership-apihub-apispec-view'
import { HttpParamStyles, IHttpContent, IHttpParam } from '@stoplight/types'
import { selfDiffMetaKey } from '@netcracker/qubership-apihub-apispec-view-diff-block'
import type { JSONSchema7Object } from 'json-schema'
import { sortBy } from 'lodash'
import * as React from 'react'
import { useMemo } from 'react'
import {
  Diff,
  DiffAction,
  DiffMetaRecord,
  isDiffAdd,
  isDiffRemove,
  isDiffReplace,
} from '@netcracker/qubership-apihub-api-diff'
import { isObject } from '../../../utils/guards'
import { useAggregatedDiffsMetaKey } from '@netcracker/qubership-apihub-apispec-view/containers/AggregatedDiffsMetaKeyContext'
import { useChangeSeverityFilters } from '@netcracker/qubership-apihub-apispec-view/containers/ChangeSeverityFiltersContext'
import { useDiffsMetaKey } from '@netcracker/qubership-apihub-apispec-view/containers/DiffsMetaKeyContext'
import { JSON_SCHEMA_VIEWER_CUSTOMIZATION_OPTIONS } from '../../../constants'
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
  // TODO: Pass parameters media types (2nd tuple item) to JsonSchemaDiffsViewer once it supports them again
  const [schema] = useMemo(
    () => httpOperationParamsToSchema({ parameters, parameterType }, diffsMetaKey),
    [parameters, parameterType, diffsMetaKey],
  )
  const { schemaViewMode, defaultSchemaDepth, notSplitSchemaViewer } = useOperationSchemaOptionsMode()

  const filters = useChangeSeverityFilters()

  if (!schema) {
    return null
  }

  // Whole operation was added/removed, so there is nothing to compare side-by-side
  if (notSplitSchemaViewer) {
    return (
      <JsonSchemaViewer
        schema={schema}
        displayMode={schemaViewMode}
        expandedDepth={defaultSchemaDepth}
        customizationOptions={JSON_SCHEMA_VIEWER_CUSTOMIZATION_OPTIONS}
      />
    )
  }

  return (
    <JsonSchemaDiffsViewer
      schema={schema}
      displayMode={schemaViewMode}
      expandedDepth={defaultSchemaDepth}
      customizationOptions={JSON_SCHEMA_VIEWER_CUSTOMIZATION_OPTIONS}
      diffMetaKeys={diffMetaKeys}
      // TODO: Temporarily disabled, restore once hiding unchanged nodes is supported
      hideUnchangedNodes={false}
      diffTypes={filters}
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
  const requiredArrayDiffs: DiffMetaRecord = {}

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

    // Parameter-level diffs which aren't diffs of the property schema itself:
    // - `required` is moved to the synthetic schema's `required` array (see `toRequiredArrayItemDiff`),
    // - `name` becomes a rename of the property key (see `nameDiff` below).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { required: parameterRequiredDiff, name: _parameterNameDiff, ...parameterDiffMeta } = p[diffMetaKey] ?? {}
    const paramPropsDiffMeta = {
      ...parameterDiffMeta,
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

    // Here we need to extend `schema.properties` by diff meta if exists to correct work of `JsonSchemaDiffsViewer`
    if (p[selfDiffMetaKey]) {
      schema.properties![diffMetaKey] = {
        ...schema.properties![diffMetaKey],
        [p.name]: p[selfDiffMetaKey],
      }
    }

    const requiredDiff = toRequiredArrayItemDiff(parameterRequiredDiff, name)
    if (required || requiredDiff) {
      if (requiredDiff) {
        requiredArrayDiffs[schema.required.length] = requiredDiff
      }
      schema.required.push(name)
    }
  }

  if (Object.keys(requiredArrayDiffs).length > 0 && isObject(schema.required)) {
    schema.required[diffMetaKey] = requiredArrayDiffs
  }

  return [schema, parametersMediaTypesMap]
}

/**
 * Converts a parameter's boolean `required` diff into a JSON Schema `required` array item diff,
 * as `JsonSchemaDiffsViewer` expects: parameter name added to the array (became required) or
 * removed from it (became optional). A raw boolean diff doesn't fit these semantics, e.g.
 * `false -> true` is a replace, which the viewer treats as "required on both sides".
 * Changes without effect (absent <-> `false`) are dropped.
 */
function toRequiredArrayItemDiff(diff: Diff | undefined, parameterName: string): Diff | undefined {
  if (!diff) {
    return undefined
  }

  const beforeRequired = (isDiffRemove(diff) || isDiffReplace(diff)) && diff.beforeValue === true
  const afterRequired = (isDiffAdd(diff) || isDiffReplace(diff)) && diff.afterValue === true
  if (beforeRequired === afterRequired) {
    return undefined
  }

  const { type, scope, customScope, description } = diff
  if (afterRequired) {
    return {
      type,
      scope,
      customScope,
      description,
      action: DiffAction.add,
      afterValue: parameterName,
      afterDeclarationPaths: isDiffAdd(diff) || isDiffReplace(diff) ? diff.afterDeclarationPaths : [],
    }
  }
  return {
    type,
    scope,
    customScope,
    description,
    action: DiffAction.remove,
    beforeValue: parameterName,
    beforeDeclarationPaths: isDiffRemove(diff) || isDiffReplace(diff) ? diff.beforeDeclarationPaths : [],
  }
}
