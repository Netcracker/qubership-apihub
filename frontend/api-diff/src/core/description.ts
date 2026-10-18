import {
  ActionType,
  CompareContext,
  DescriptionTemplates,
  type Diff,
  DiffDescription,
  DiffDescriptionRule,
  DiffTemplateParamsCalculator,
  DynamicParams,
  FAILED_PARAMS_CALCULATION
} from '../types'
import { isArray, isEmptyArray, objectKeys } from '../utils'
import { DiffAction } from './constants'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export const diffDescription: DiffDescription = (descriptionTemplate) => {
  const diffDescriptionRule: DiffDescriptionRule = (diff, ctx) => {
    const paramCalculator = resolveParamCalculator(ctx)
    if (paramCalculator === undefined) {
      return undefined
    }
    const params = paramCalculator(diff, ctx)
    if (params === FAILED_PARAMS_CALCULATION) {
      return undefined
    }

    return createDescription(isArray(descriptionTemplate) ? descriptionTemplate : [descriptionTemplate], params)
  }

  return diffDescriptionRule
}

const resolveParamCalculator = (ctx: CompareContext | undefined): DiffTemplateParamsCalculator | undefined => {
  if (ctx === undefined) {
    return undefined
  }
  const descriptionParamCalculator = ctx.rules.descriptionParamCalculator
  if (descriptionParamCalculator) {
    return descriptionParamCalculator
  }
  return resolveParamCalculator(ctx.parentContext)
}

export const getDeclarationPathsForDiff = (diff: Diff): JsonPath[] => {
  switch (diff.action) {
    case DiffAction.add:
      return [...diff.afterDeclarationPaths]
    case DiffAction.remove:
      return [...diff.beforeDeclarationPaths]
    case DiffAction.replace:
      if (diff.afterDeclarationPaths) {
        return [...diff.afterDeclarationPaths]
      } else {
        return [...diff.beforeDeclarationPaths]
      }
    case DiffAction.rename:
      if (diff.afterDeclarationPaths) {
        return [...diff.afterDeclarationPaths]
      } else {
        return [...diff.beforeDeclarationPaths]
      }
  }
}

export const calculateDefaultDiffDescription = (diff: Diff) => {
  const declarationPaths = getDeclarationPathsForDiff(diff)
  const paths = declarationPaths.map(path => `'${path.join('.')}'`).join(', ')
  if (diff.scope) {
    return `[${DIFF_ACTION_TO_ACTION_MAP[diff.action]}] ${paths} in ${diff.scope}`
  }
  return `[${DIFF_ACTION_TO_ACTION_MAP[diff.action]}] ${paths}`
}

export const createDescription = (descriptionTemplates: DescriptionTemplates, params: DynamicParams): string | undefined => {
  if (isEmptyArray(descriptionTemplates)) { return '' }

  return applyTemplateParams(descriptionTemplates, params)
}

const applyTemplateParams = (templates: string[], params: DynamicParams): string | undefined => {
  const template = findTemplate(templates, params)
  if (!template) {
    return undefined
  }

  return applyTempleParams(template, params)
}

type SuitableTemplate = {
  template: string
  suitability: number
}

const findTemplate = (templates: string[], params: DynamicParams) => {
  return templates.reduce((suitableTemplate, template) => {
    const templateParams = [...template.matchAll(/{{(\w+)}}/g)].map(matchResult => matchResult[0]).map(param => param.slice(2, -2))
    let suitability = 0
    for (const templateParam of templateParams) {
      if (params[templateParam] === undefined) {
        return suitableTemplate
      }
      suitability += 1
    }
    return suitableTemplate && suitableTemplate.suitability > suitability ? suitableTemplate : { template, suitability }
  }, undefined as SuitableTemplate | undefined)?.template
}

const applyTempleParams = (template: string, params: DynamicParams): string => {
  if (!template) { return '' }

  const placeholders: DynamicParams = {}

  for (const key of objectKeys(params)) {
    placeholders[key] = params[key]
  }

  for (const match of [...template.matchAll(/{{(\w+)}}/g)].reverse()) {
    if (!(match[1] in placeholders)) { continue }

    const index = match.index ?? 0
    template = template.substring(0, index) + String(placeholders[match[1]]) + template.substring(index + match[0].length)
  }
  return template
}

export const DIFF_ACTION_TO_PREPOSITION_MAP: Record<ActionType, string> = {
  [DiffAction.add]: 'to',
  [DiffAction.remove]: 'from',
  [DiffAction.replace]: 'for',
  [DiffAction.rename]: 'of'
}

export const DIFF_ACTION_TO_ACTION_MAP: Record<ActionType, string> = {
  [DiffAction.add]: 'Added',
  [DiffAction.remove]: 'Deleted',
  [DiffAction.replace]: 'Changed',
  [DiffAction.rename]: 'Renamed'
}

export const GREP_TEMPLATE_PARAM_HEADER_NAME = 'headerName'
export const GREP_TEMPLATE_PARAM_RESPONSE_NAME = 'responseName'
export const GREP_TEMPLATE_PARAM_EXAMPLE_NAME = 'exampleName'
export const GREP_TEMPLATE_PARAM_PARAMETER_NAME = 'parameterName'
export const GREP_TEMPLATE_PARAM_MEDIA_TYPE = 'mediaType'
export const GREP_TEMPLATE_PARAM_ENCODING_NAME = 'encodingName'
export const TEMPLATE_PARAM_ACTION = 'action'
export const TEMPLATE_PARAM_PREPOSITION = 'preposition'
export const TEMPLATE_PARAM_PROPERTY_NAME = 'propertyName'
export const TEMPLATE_PARAM_RESPONSE_PATH = 'responsePath'
export const TEMPLATE_PARAM_REQUEST_PATH = 'requestPath'
export const TEMPLATE_PARAM_HEADER_PATH = 'headerPath'
export const TEMPLATE_PARAM_EXAMPLE_PATH = 'examplePath'
export const TEMPLATE_PARAM_PARAMETER_PATH = 'parameterPath'
export const TEMPLATE_PARAM_SCHEMA_PATH = 'schemaPath'
export const TEMPLATE_PARAM_COMPONENT_PATH = 'componentPath'
export const TEMPLATE_PARAM_PARAMETER_LOCATION = 'parameterLocation'
export const TEMPLATE_PARAM_PLACE = 'place'
export const TEMPLATE_PARAM_SCOPE = 'scope'
