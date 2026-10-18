import {
  allAnnotation,
} from '../core'
import type { CompareRules } from '../types'
import { asyncApiSpecificationExtensionRulesFunction } from './asyncapi3.compare.rules'


// TODO: move to asyncapi.jsonschema.common.ts
export const externalDocumentationRules: CompareRules = {
  $: allAnnotation,
  '/description': { $: allAnnotation },
  '/url': { $: allAnnotation },
  ...asyncApiSpecificationExtensionRulesFunction(allAnnotation),
}
