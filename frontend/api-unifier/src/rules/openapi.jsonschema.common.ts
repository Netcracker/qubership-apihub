import { CrawlPrefixRules } from "@netcracker/qubership-apihub-json-crawl"
import { NormalizationRule, NormalizationRules } from "../types"
import { TYPE_JSON_ANY, TYPE_OBJECT, TYPE_STRING } from "../validate/checker"
import { checkType } from "../validate/checker"
import * as resolvers from '../resolvers'

// extracted to facilitate type checking
const _openApiSpecificationExtensionPrefixRules: CrawlPrefixRules<NormalizationRule> = {
  'x-': {
    isExtension: true,
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.last,
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

/**
 * Specification Extensions Rules
 * Handles x-* extension properties that can be added to any object
 * in OpenAPI specifications
 */
export const openApiSpecificationExtensionRules: NormalizationRules = {
  '/^': _openApiSpecificationExtensionPrefixRules,
}

export const openApiExternalDocsRules: NormalizationRules = {
  '/externalDocs': {
    validate: checkType(TYPE_OBJECT),
    merge: resolvers.last,  // used only for JSON schema rules
    '/description': { validate: checkType(TYPE_STRING) },
    '/url': { validate: checkType(TYPE_STRING) },
    ...openApiSpecificationExtensionRules,
  },
}
