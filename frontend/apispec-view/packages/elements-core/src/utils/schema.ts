import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier';
import { getOriginalObject } from '../index';
import { hashCode } from './string';
import { JSONSchema7 } from 'json-schema';

export function schemaHashCode(schema: JSONSchema7): number {
  return hashCode(stringifyCyclicJso(getOriginalObject(schema)));
}
