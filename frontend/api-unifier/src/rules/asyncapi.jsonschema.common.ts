import { NormalizationRules } from '../types'
import { CrawlPrefixRules } from '@netcracker/qubership-apihub-json-crawl'
import * as resolvers from '../resolvers'
import {
  checkType,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'

// Specification Extension Prefix Rules (x-* properties)
// Shared across AsyncAPI and can be reused by other specifications
const _specificationExtensionPrefixRules: CrawlPrefixRules<NormalizationRules> = {
  'x-': {
    isExtension: true,
    validate: checkType(...TYPE_JSON_ANY),
    merge: resolvers.last,  // used only for JSON schema
    '/*': { validate: checkType(...TYPE_JSON_ANY) },
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  },
}

/**
 * Specification Extensions Rules
 * Handles x-* extension properties that can be added to any object
 * in AsyncAPI specifications
 */
export const specificationExtensionsRules: NormalizationRules = {
  '/^': _specificationExtensionPrefixRules,
}

/**
 * External Documentation Rules
 * Defines structure for referencing external documentation
 * Shared across AsyncAPI schema objects and other AsyncAPI components
 */
export const externalDocumentationRules: NormalizationRules = {
  '/description': { validate: checkType(TYPE_STRING) },
  '/url': { validate: checkType(TYPE_STRING) },
  ...specificationExtensionsRules,
  validate: checkType(TYPE_OBJECT),
  merge: resolvers.last,  // used only for JSON schema
}
