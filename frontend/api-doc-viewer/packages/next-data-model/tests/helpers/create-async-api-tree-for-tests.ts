import { denormalize, normalize, NormalizeOptions } from "@netcracker/qubership-apihub-api-unifier";
import { isObject } from "@netcracker/qubership-apihub-json-crawl";
import { AsyncApiTreeBuilder } from "../../src/building-service/async-api/tree/builder";
import { AsyncApiTree } from "../../src/model/async-api/tree/tree.impl";

export const TEST_REFERENCE_NAME_PROPERTY_KEY = Symbol('referenceName')

const NORMALIZATION_OPTIONS: NormalizeOptions = {
  unify: true,
  validate: true,
  liftCombiners: true,
}

export function createAsyncApiTreeForTests(source: unknown, operationKeys?: Partial<{
  operationType: string // send, receive
  operationKey: string // e.g. send-fruit, receive-fruit
  messageKey: string // e.g. send-fruit-message, receive-fruit-message
}>): AsyncApiTree | null {
  if (!isObject(source)) {
    return null
  }

  const normalizedSource = normalize(source, { ...NORMALIZATION_OPTIONS, lastReferenceKeyProperty: TEST_REFERENCE_NAME_PROPERTY_KEY })
  const mergedSource = denormalize(normalizedSource, NORMALIZATION_OPTIONS)

  const builder = new AsyncApiTreeBuilder(mergedSource, TEST_REFERENCE_NAME_PROPERTY_KEY, operationKeys)
  return builder.build()
}
