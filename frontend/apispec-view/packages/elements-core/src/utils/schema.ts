import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier';
import { getOriginalObject } from '@stoplight/elements-core';
import { hashCode } from '@stoplight/elements-core/utils/string';
import { JSONSchema7 } from 'json-schema';

export function schemaHashCode(schema: JSONSchema7): number {
  return hashCode(stringifyCyclicJso(getOriginalObject(schema)));
}
