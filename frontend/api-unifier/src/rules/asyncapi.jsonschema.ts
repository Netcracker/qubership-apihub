import {
  NormalizationRules,
  UnifyFunction,
} from '../types'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { SPEC_TYPE_JSON_SCHEMA_07, SPEC_TYPE_OPEN_API_30 } from '../spec-type'
import * as resolvers from '../resolvers'
import {
  checkType,
  TYPE_BOOLEAN,
  TYPE_JSON_ANY,
  TYPE_OBJECT,
  TYPE_STRING,
} from '../validate/checker'
import { DefaultValueMapping, valueDefaults } from '../unifies/defaults'
import { concatArrays, insertIntoArrayByInstruction } from '../utils'
import { jsonSchemaRules } from './jsonschema'
import { JSON_SCHEMA_PROPERTY_DEPRECATED } from './jsonschema.const'
import { jsonSchemaReferenceResolver, referenceObjectResolver } from '../references/ref-resolver'
import {
  referenceObjectRules,
  externalDocumentationRules,
  specificationExtensionsRules,
} from './asyncapi.jsonschema.common'
import { openApiJsonSchemaRules } from './openapi.jsonschema'
import {
  ASYNCAPI_PROPERTY_EXTERNAL_DOCS,
  ASYNCAPI_PROPERTY_SCHEMA_FORMAT, ASYNCAPI_SCHEMA_FORMAT_DEFAULT,
  ASYNCAPI_SCHEMA_FORMATS_ASCYNAPI_30,
  ASYNCAPI_SCHEMA_FORMATS_JSON,
  ASYNCAPI_SCHEMA_FORMATS_OPENAPI_30,
} from './asyncapi.const'
import { EMPTY_MARKER, ReplaceMapping, TO_EMPTY_OBJECT_MAPPING, valueReplaces } from '../unifies/replaces'

// Default value mapping for Multi Format Schema
const MULTI_FORMAT_SCHEMA_DEFAULTS: DefaultValueMapping = {
  [ASYNCAPI_PROPERTY_SCHEMA_FORMAT]: ASYNCAPI_SCHEMA_FORMAT_DEFAULT,
}

// Add default for deprecated property in AsyncAPI schema
const SCHEMA_DEFAULTS: DefaultValueMapping = {
  [JSON_SCHEMA_PROPERTY_DEPRECATED]: false,
  [ASYNCAPI_PROPERTY_EXTERNAL_DOCS]: EMPTY_MARKER,
}

const SCHEMA_REPLACES: Record<string, ReplaceMapping> = {
  [ASYNCAPI_PROPERTY_EXTERNAL_DOCS]: TO_EMPTY_OBJECT_MAPPING,
}

/**
 * AsyncAPI Schema Object Extension Rules (additional vocabulary properties)
 * Extends JSON Schema Draft 07 with AsyncAPI-specific properties:
 * - discriminator: for polymorphism support
 * - externalDocs: for external documentation references
 * - deprecated: for deprecation marking (defaults to false)
 */
function asyncApiSchemaExtensionRules(): NormalizationRules {
  return {
    '/discriminator': {
      validate: checkType(TYPE_STRING),
      merge: resolvers.last,
    },
    '/externalDocs': externalDocumentationRules,
    '/deprecated': {
      validate: checkType(TYPE_BOOLEAN),
      merge: resolvers.or,
    },
    ...specificationExtensionsRules,
    unify: [
      valueDefaults(SCHEMA_DEFAULTS),
      valueReplaces(SCHEMA_REPLACES),
    ],
  }
}

/**
 * AsyncAPI-specific JSON Schema rules (based on Draft 07)
 * Includes additional vocabulary properties: discriminator, externalDocs, deprecated
 * Key difference from OpenAPI: Reference Objects do NOT allow property overrides
 */
function asyncApiSchemaRulesFactory(): NormalizationRules {
  const baseJsonSchemaVersion = SPEC_TYPE_JSON_SCHEMA_07
  const core = jsonSchemaRules(baseJsonSchemaVersion, () => asyncApiSchemaRules)
  const extensions = asyncApiSchemaExtensionRules()

  return {
    ...core,
    ...extensions,
    // TODO: per spec "$ref keyword MUST follow the behavior described by Reference Object
    // instead of the one in JSON Schema definition."
    // need to check if other if behavior modification are required besided "no property overrides"
    // Override referenceHandler to disallow property overrides
    referenceHandler: jsonSchemaReferenceResolver({ richRefAllowed: false }),
    unify: insertIntoArrayByInstruction(
      concatArrays<UnifyFunction>(core.unify, extensions.unify),
    ),
  }
}
const asyncApiSchemaRules: NormalizationRules = asyncApiSchemaRulesFactory() // used to proper cycle rules

function isMultiFormatSchema(value: unknown): boolean {
  return isObject(value) && 'schema' in value
}

function normalizeSchemaFormat(format: string): string {
  return format.trim().toLowerCase()
}

/**
 * Returns schema rules based on schemaFormat value
 * Supports AsyncAPI, JSON Schema, OpenAPI formats.
 * All other formats are validated as any JSON value for now.
 */
function getSchemaRulesByFormat(schemaFormat: string): () => NormalizationRules {
  const normalizedSchemaFormat = normalizeSchemaFormat(schemaFormat)

  if (ASYNCAPI_SCHEMA_FORMATS_ASCYNAPI_30.includes(normalizedSchemaFormat)) {
    return () => asyncApiSchemaRules
  }
  if (ASYNCAPI_SCHEMA_FORMATS_JSON.includes(normalizedSchemaFormat)) {
    return () => jsonSchemaRules(SPEC_TYPE_JSON_SCHEMA_07)
  }
  if (ASYNCAPI_SCHEMA_FORMATS_OPENAPI_30.includes(normalizedSchemaFormat)) {
    return () => openApiJsonSchemaRules(SPEC_TYPE_OPEN_API_30)
  }
  return () => ({
    validate: checkType(...TYPE_JSON_ANY),
    '/**': { validate: checkType(...TYPE_JSON_ANY) },
  })
}

/**
 * Factory function for Multi Format Schema rules
 * Returns common rules for '/schemaFormat' property and delegates to
 * getSchemaRulesByFormat() for '/schema' property rules
 */
function multiFormatSchemaRules(schemaFormat: string): NormalizationRules {
  return {
    '/schemaFormat': {
      validate: checkType(TYPE_STRING),
    },
    '/schema': getSchemaRulesByFormat(schemaFormat),
    ...referenceObjectRules,
    ...specificationExtensionsRules,
    validate: checkType(TYPE_OBJECT),
    unify: valueDefaults(MULTI_FORMAT_SCHEMA_DEFAULTS),
  }
}

/**
 * Returns appropriate rules based on whether Multi Format Schema is present
 * This is the main entry point for AsyncAPI schema rules
 *
 * - If 'schema' property is NOT present: Regular AsyncAPI Schema Object
 * - If 'schema' property IS present: Multi Format Schema Object with format-specific rules
 */
export function schemaOrMultiFormatSchemaRules({ value }: { value: unknown }): NormalizationRules {
  if (!isMultiFormatSchema(value)) {
    // Regular AsyncAPI Schema Object (JSON Schema Draft 07 based with extensions)
    return asyncApiSchemaRules
  }

  // Multi Format Schema Object
  const obj = value as Record<string, unknown>
  const schemaFormat = typeof obj.schemaFormat === 'string'
    ? obj.schemaFormat
    : ASYNCAPI_SCHEMA_FORMAT_DEFAULT
  return multiFormatSchemaRules(schemaFormat)
}
