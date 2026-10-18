/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Ajv, { ErrorObject, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

const ajv = new Ajv({ strict: false })
addFormats(ajv)

const validateFunctions = new WeakMap<object, ValidateFunction>()

export const validateDocument = (schema: any, data: any): ErrorObject[] => {
  if (!validateFunctions.has(schema)) {
    validateFunctions.set(schema, ajv.compile(schema))
  }
  const validate = validateFunctions.get(schema)!
  try {
    validate(data)
    return [...validate.errors || []]
  } catch (error) {
    return [error as any]
  }
}

export function isJson(value: string): boolean {
  try {
    JSON.parse(value)
  } catch (e) {
    return false
  }
  return true
}

export function isYaml(value: string): boolean {
  try {
    loadYaml(value)
  } catch (e) {
    return false
  }
  return true
}
