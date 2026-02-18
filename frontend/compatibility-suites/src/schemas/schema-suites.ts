import { JsonSchemaCaseMap, SchemaSuiteTemplateMap } from '../../generated/suite-data'
import { buildTemplateKey, type TestSpecType } from '../suite-types'
import { isKnownSchemaSuiteId } from './schema-suite-ids'
import { renderTemplate, type SchemaFragments } from './template-render'

type SchemaCaseVariant = 'before' | 'after'

/**
 * Returns true when a suiteId is a schema suite backed by a template.
 */
export const isSchemaSuite = (specType: TestSpecType, suiteId: string): boolean => {
  if (!isKnownSchemaSuiteId(specType, suiteId)) {
    return false
  }
  return SchemaSuiteTemplateMap.has(buildTemplateKey(specType, suiteId))
}

/**
 * Composes a schema suite case by rendering a template with schema fragments.
 * Throws if the template or schema case is missing (data integrity error).
 */
export const composeSchemaCase = (
  specType: TestSpecType,
  suiteId: string,
  testId: string,
  variant: SchemaCaseVariant,
): string => {
  const templateKey = buildTemplateKey(specType, suiteId)
  const template = SchemaSuiteTemplateMap.get(templateKey)
  if (!template) {
    throw new Error(`Schema suite template not found: ${templateKey}`)
  }

  const schemaCase = JsonSchemaCaseMap.get(testId)
  if (!schemaCase) {
    throw new Error(`JSON schema case not found: ${testId}`)
  }

  const fragments: SchemaFragments = schemaCase[variant]
  return renderTemplate(template, fragments)
}
