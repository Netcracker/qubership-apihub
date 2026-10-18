import {
  InternalValidationOptions,
  NormalizationRule,
  ResolveOptions,
  ValidateOptions,
  ValidateState,
  ValidateSyncCloneHook,
} from './types'
import { isArray, isObject, JSON_ROOT_KEY, syncClone } from '@netcracker/qubership-apihub-json-crawl'
import { resolveSpec, SPEC_TYPE_OPEN_API_30 } from './spec-type'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { RULES } from './rules'
import { cleanSeveralOrigins } from './origins'
import { OPEN_API_PROPERTY_COMPONENTS, OPEN_API_PROPERTY_PATH_ITEMS } from './rules/openapi.const'

/**
 * Preprocesses an OpenAPI specification prior to reference resolution/origin definition.
 *
 * For OpenAPI 3.0 documents, `components.pathItems` is not a valid field (it was
 * added in OAS 3.1). Some tools may still emit it. To keep the input compliant,
 * deterministic, and to avoid misinterpreting invalid nodes as real API paths,
 * this function removes `components.pathItems` for OAS 3.0 and emits an optional
 * validation message via `options.onValidateError`.
 */
export function preValidate(source: unknown, options?: ValidateOptions & ResolveOptions): void {
  const spec = resolveSpec(source)
  if (spec.type !== SPEC_TYPE_OPEN_API_30 || !isObject(source)) {
    return
  }
  if (OPEN_API_PROPERTY_COMPONENTS in source && isObject(source.components)) {
    const components = source.components as Record<string, unknown>
    if (Reflect.deleteProperty(components, OPEN_API_PROPERTY_PATH_ITEMS)) {
      (options as ValidateOptions)?.onValidateError?.(`Invalid property 'components.pathItems' for OpenAPI 3.0. The property has been removed to maintain 3.0 compliance.`, ['components', 'pathItems'], 'pathItems')
    }
  }
}

const createValidationHook: (options: InternalValidationOptions) => ValidateSyncCloneHook = (options) => {
  const validateHook: ValidateSyncCloneHook = ({ key, path, value, rules, state }) => {
    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }
    const safeKey = key ?? JSON_ROOT_KEY
    if (typeof safeKey === 'symbol' && options.ignoreSymbols.has(safeKey)) {
      return { value, state: { ...state, ignoreTreeUnderSymbols: true, propertiesToCleanup: [] } } //set state to ignore next work
    }
    if (!rules) {
      options.onValidateError?.(`Key '${safeKey.toString()}' unexpected here`, path, value)
      state.propertiesToCleanup.push(key)
      return { done: true }
    }
    const { validate } = rules
    if (!validate) {
      options.onValidateError?.(`Key '${safeKey.toString()}' unexpected here`, path, value)
      state.propertiesToCleanup.push(key)
      return { done: true }
    }
    const validatorsArray = isArray(validate) ? validate : [validate]
    try {
      const valid = validatorsArray.reduce((valid, f) => valid && f(value), true)
      if (!valid) {
        options.onValidateError?.(`Value under '${safeKey.toString()}' excluded because doesn't match validation rule`, path, value)
        state.propertiesToCleanup.push(key)
        return { done: true }
      }
      const nestedPropertiesToCleanup: PropertyKey[] = []
      return {
        value,
        state: { ...state, propertiesToCleanup: nestedPropertiesToCleanup },
        exitHook: () => {
          const clone = state.node[key]
          if (isObject(clone)) {
            cleanSeveralOrigins(clone, nestedPropertiesToCleanup, options.originsFlag)
          }
        },
      }
    } catch (e) {
      options.onValidateError?.(`Value under '${safeKey.toString()}' fail to validate`, path, value, e)
      state.propertiesToCleanup.push(key)
      return { done: true }
    }
  }
  return validateHook
}

export const validate = (value: unknown, options?: ValidateOptions & ResolveOptions) => {
  const spec = resolveSpec(value)
  const internalOptions = {
    ...options,
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options?.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options?.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options?.syntheticTitleFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options?.syntheticAllOfFlag] : []),
      ...(options?.firstReferenceKeyProperty ? [options.firstReferenceKeyProperty] : []),
      ...(options?.lastReferenceKeyProperty ? [options.lastReferenceKeyProperty] : []),
    ]),
  } satisfies InternalValidationOptions
  const cycledJsoHandlerHook = createCycledJsoHandlerHook<ValidateState, NormalizationRule>()
  const propertiesToCleanup: PropertyKey[] = []
  const result = syncClone(value, [
    cycledJsoHandlerHook,
    createValidationHook(internalOptions),
  ], { rules: RULES[spec.type] || {}, state: { ignoreTreeUnderSymbols: false, propertiesToCleanup } })
  if (isObject(result)) {
    cleanSeveralOrigins(result, propertiesToCleanup, internalOptions.originsFlag)
  }
  return result
}
