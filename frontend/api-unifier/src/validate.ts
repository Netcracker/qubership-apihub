import {
  InternalValidationOptions,
  NormalizationRule,
  ResolveOptions,
  ValidateOptions,
  ValidateState,
  ValidateSyncCloneHook,
} from './types'
import { isArray, isObject, JSON_ROOT_KEY, syncClone } from '@netcracker/qubership-apihub-json-crawl'
import { resolveSpec } from './spec-type'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { RULES } from './rules'
import { cleanSeveralOrigins } from './origins'

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
    const { validate = [] } = rules
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
