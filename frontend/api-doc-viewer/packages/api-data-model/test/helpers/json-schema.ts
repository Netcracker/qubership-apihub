import { normalize, denormalize } from '@netcracker/qubership-apihub-api-unifier';
import { createJsonSchemaTree } from '../../src';
import { TEST_SYNTHETIC_TITLE_FLAG } from './utils';

export function createJsonSchemaTreeForTests(schema: unknown, source: any = schema) {
  const normalizedSchema = normalize(schema, {
    source,
    syntheticTitleFlag: TEST_SYNTHETIC_TITLE_FLAG,
    validate: true,
    liftCombiners: true,
  })
  const mergedSchema = denormalize(normalizedSchema, {
    unify: true,
  })
  return createJsonSchemaTree(mergedSchema)
}
