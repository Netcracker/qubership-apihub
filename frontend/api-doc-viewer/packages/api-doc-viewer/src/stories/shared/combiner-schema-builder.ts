import { formatValidationCaseTitle } from './value-range-schema-builder'

export const COMBINER_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
] as const

export type CombinerSchemaType = (typeof COMBINER_SCHEMA_TYPES)[number];

export type CombinerKind = 'oneOf' | 'anyOf' | 'allOf';

export const COMBINER_KINDS: CombinerKind[] = ['oneOf', 'anyOf', 'allOf']

const COMBINER_KIND_LABELS: Record<CombinerKind, string> = {
  oneOf: 'One Of',
  anyOf: 'Any Of',
  allOf: 'All Of',
}

/** Human-readable "One Of" / "Any Of" / "All Of" label, for Storybook titles and summaries. */
export const combinerKindLabel = (kind: CombinerKind): string => COMBINER_KIND_LABELS[kind]

const COMBINER_KIND_SLUGS: Record<CombinerKind, string> = {
  oneOf: 'one-of',
  anyOf: 'any-of',
  allOf: 'all-of',
}

/**
 * Lowercase, hyphenated slug for a combiner kind ("one-of" / "any-of" / "all-of"), for use in case
 * slugs/ids. Deliberately NOT the raw "oneOf"/"anyOf"/"allOf" JSON Schema keyword spelling: Storybook
 * derives a story's id by kebab-casing its export name, and kebab-casing inserts a hyphen at a
 * lowercase-to-uppercase boundary (e.g. "oneOf" -> "one-Of" -> "one-of" but "OneOf" -> "One-Of"),
 * which would silently desync a hand-built `case-${caseId}` test lookup from Storybook's actual id.
 * Keeping every slug token lowercase-hyphenated up front makes that transformation a no-op.
 */
export const combinerKindSlug = (kind: CombinerKind): string => COMBINER_KIND_SLUGS[kind]

/** `My<Type>` title label used by the title/format matrix cases (e.g. "MyString", "MyInteger"). */
export const titleLabelFor = (type: CombinerSchemaType): string =>
  `My${type.charAt(0).toUpperCase()}${type.slice(1)}`

export const FORMAT_VALUE = 'ISODateTime'
export const FORMAT_VALUE_ALT = 'CustomFormat'

export const formatCombinerCaseTitle = (subset: string, label: string): string =>
  formatValidationCaseTitle(`combiner-${subset}`, label)

export type BuildComprehensiveTypeSchemaOptions = {
  title?: string;
  format?: string;
};

const COMPREHENSIVE_OBJECT_PROPERTIES = {
  name: { type: 'string' },
  id: { type: 'integer' },
}

const COMPREHENSIVE_OBJECT_DEFAULT = { name: 'sample', id: 1 }

const clone = <T>(value: T): T => structuredClone(value)

const buildBaseComprehensiveSchema = (type: CombinerSchemaType): Record<string, unknown> => {
  switch (type) {
    case 'string':
      return {
        type: 'string',
        description: 'Sample string schema with all string validations',
        default: 'alpha',
        examples: ['alpha', 'beta'],
        enum: ['alpha', 'beta', 'gamma'],
        minLength: 1,
        maxLength: 128,
        pattern: '^[a-z]+$',
      }
    case 'number':
      return {
        type: 'number',
        description: 'Sample number schema with all number validations',
        default: 1.5,
        examples: [1.5, 2.5],
        minimum: 0,
        maximum: 100,
        multipleOf: 0.5,
      }
    case 'integer':
      return {
        type: 'integer',
        description: 'Sample integer schema with all integer validations',
        default: 1,
        examples: [1, 2],
        minimum: 0,
        maximum: 100,
        multipleOf: 1,
      }
    case 'boolean':
      return {
        type: 'boolean',
        description: 'Sample boolean schema',
        default: false,
        examples: [true, false],
      }
    case 'array':
      return {
        type: 'array',
        description: 'Sample array schema with all array validations',
        items: { type: 'string' },
        default: ['alpha', 'beta'],
        examples: [['alpha', 'beta']],
        minItems: 1,
        maxItems: 10,
        uniqueItems: true,
      }
    case 'object':
      return {
        type: 'object',
        description: 'Sample object schema with all object validations',
        properties: clone(COMPREHENSIVE_OBJECT_PROPERTIES),
        default: clone(COMPREHENSIVE_OBJECT_DEFAULT),
        examples: [clone(COMPREHENSIVE_OBJECT_DEFAULT)],
        minProperties: 1,
        maxProperties: 5,
      }
    default:
      throw new Error(`Unsupported combiner schema type: ${type}`)
  }
}

/** A "type-schema" (comprehensive, all applicable validation keywords) per the combiner-cases terms. */
export const buildComprehensiveTypeSchema = (
  type: CombinerSchemaType,
  options: BuildComprehensiveTypeSchemaOptions = {},
): Record<string, unknown> => {
  const schema = buildBaseComprehensiveSchema(type)
  if (options.title !== undefined) {
    schema.title = options.title
  }
  if (options.format !== undefined) {
    schema.format = options.format
  }
  return schema
}

export const wrapInCombiner = (
  kind: CombinerKind,
  options: Record<string, unknown>[],
): Record<string, unknown> => ({ [kind]: options })

/** Storybook CSF export name for a combiner case id (`001-foo.bar` -> `Case_001_foo_bar`). */
export const toCombinerCaseExportName = (caseId: string): string =>
  `Case_${caseId.replace(/[.-]/g, '_')}`
