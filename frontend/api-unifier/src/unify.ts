import {
  DEFAULT_OPTION_ALLOW_NOT_VALID_SYNTHETIC_CHANGES,
  DEFAULT_OPTION_LIFT_COMBINERS,
  DEFAULT_OPTION_MERGE_ALL_OF,
  DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
  DEFAULT_OPTION_ORIGINS_FOR_DEFAULTS,
  DEFAULT_OPTION_RESOLVE_REF,
  DeUnifyOptions,
  InternalDeUnifyOptions,
  InternalUnifyOptions,
  LiftCombinersOptions,
  MutationFunction,
  NormalizationRule,
  ResolveOptions,
  TransformFunction,
  UnifyContext,
  UnifyFunction,
  UnifyOptions,
  UnifyState,
  UnifySyncCloneHook,
} from './types'
import { isArray, JSON_ROOT_KEY, syncClone } from '@netcracker/qubership-apihub-json-crawl'
import { resolveSpec } from './spec-type'
import { createCycledJsoHandlerHook } from './cycle-jso'
import { RULES } from './rules'
import { createEvaluationCacheService, createPropertySpreadWithCacheService } from './cache'
import {
  createNativeMetaDefinitions,
  createNativeMetaDefinitionsForDeUnify,
  createSyntheticMetaDefinitions,
} from './unifies/meta-types'
import { createSelfOriginsCloneHook } from './origins'
import { JSON_SCHEMA_PROPERTY_ALL_OF } from './rules/jsonschema.const'

function toForwardMutationFunction(value: UnifyFunction): TransformFunction {
  return typeof value === 'function' ? value : value.forward
}

function toBackwardMutationFunction(value: UnifyFunction): MutationFunction | undefined {
  return typeof value === 'function' ? undefined : value.backward
}

const createUnifyHook: (options: InternalUnifyOptions, mandatoryOnly: boolean) => UnifySyncCloneHook = (options, mandatoryOnly) => {
  const unifyHook: UnifySyncCloneHook = ({ key, path, value, rules, state }) => {
    const safeKey = key ?? JSON_ROOT_KEY
    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }
    if (typeof safeKey === 'symbol') {
      return { value, state: { ...state, ignoreTreeUnderSymbols: true } } //set state to ignore next work
    }
    if (!rules) {
      return { value }
    }
    const { unify, mandatoryUnify } = rules
    const activeUnify = mandatoryOnly ? mandatoryUnify : unify
    if (!activeUnify) {
      return { value }
    }
    const unifiesFunctionsArray = (isArray(activeUnify) ? activeUnify : [activeUnify]).map(toForwardMutationFunction)
    if (unifiesFunctionsArray.length === 0) {
      return { value }
    }
    try {
      const context: UnifyContext<InternalUnifyOptions> = {
        origins: state.selfOriginResolver(key),
        options,
        path,
      }
      const unifiedValue = unifiesFunctionsArray.reduce((v, f) => f(v, context), value)
      return { value: unifiedValue }
    } catch (e) {
      options.onUnifyError?.(`Value under '${safeKey}' fail to unify`, path, value, e)
      return { done: true }
    }
  }
  return unifyHook
}

const createDeUnifyHook: (options: InternalDeUnifyOptions, mandatoryOnly: boolean) => UnifySyncCloneHook = (options, mandatoryOnly) => {
  const deUnifyHook: UnifySyncCloneHook = ({ key, path, value, rules, state }) => {
    if (state.ignoreTreeUnderSymbols) {
      return { value }
    }
    const safeKey = key ?? JSON_ROOT_KEY
    if (typeof safeKey === 'symbol' && options.ignoreSymbols.has(safeKey)) {
      return { value, state: { ...state, ignoreTreeUnderSymbols: true } } //set state to ignore next work
    }
    if (!rules) {
      return { value }
    }
    const { unify, mandatoryUnify } = rules
    const activeUnify = mandatoryOnly ? mandatoryUnify : unify
    if (!activeUnify) {
      return { value }
    }
    const deUnifiesFunctionsArray = (isArray(activeUnify) ? activeUnify : [activeUnify])
      .flatMap<MutationFunction>(f => {
        const nf = toBackwardMutationFunction(f)
        return nf ? [nf] : []
      })
      .reverse()
    if (deUnifiesFunctionsArray.length === 0) {
      return { value }
    }
    return {
      value: value,
      exitHook: () => {
        try {
          const context: UnifyContext<InternalDeUnifyOptions> = {
            origins: state.selfOriginResolver(key),
            options,
            path,
          }
          const copiedValue = state.node[safeKey]
          deUnifiesFunctionsArray.forEach(f => f(copiedValue, context))
        } catch (e) {
          options.onUnifyError?.(`Value under '${safeKey.toString()}' fail to deunify`, path, value, e)
        }
      },
    }
  }
  return deUnifyHook
}

export const unify = (value: unknown, options?: UnifyOptions & LiftCombinersOptions & ResolveOptions) => {
  return unifyImpl(value, false, options)
}

export const cleanUpSynthetic = (value: unknown, options?: UnifyOptions & LiftCombinersOptions & ResolveOptions) => {
  return unifyImpl(value, true, options)
}

const unifyImpl = (value: unknown, mandatoryOnly: boolean, options?: UnifyOptions & LiftCombinersOptions & ResolveOptions) => {
  const spec = resolveSpec(value)
  const internalOptions = {
    resolveRef: DEFAULT_OPTION_RESOLVE_REF,
    originsAlreadyDefined: DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
    mergeAllOf: DEFAULT_OPTION_MERGE_ALL_OF,
    liftCombiners: DEFAULT_OPTION_LIFT_COMBINERS,
    allowNotValidSyntheticChanges: DEFAULT_OPTION_ALLOW_NOT_VALID_SYNTHETIC_CHANGES,
    createOriginsForDefaults: (() => DEFAULT_OPTION_ORIGINS_FOR_DEFAULTS),
    ...options,
    evaluationCacheService: createEvaluationCacheService(),
    spreadAllOfCache: createPropertySpreadWithCacheService(JSON_SCHEMA_PROPERTY_ALL_OF),
    syntheticMetaDefinitions: createSyntheticMetaDefinitions(spec.type, options?.originsFlag),
    nativeMetaDefinitions: createNativeMetaDefinitions(spec.type, options?.originsFlag),
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
      ...(options?.defaultsFlag ? [options.defaultsFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
      ...(options?.ignoreSymbols ? options.ignoreSymbols : []),
    ]),
  } satisfies InternalUnifyOptions
  const cycledJsoHandlerHook = createCycledJsoHandlerHook<UnifyState, NormalizationRule>()
  return syncClone(value, [
    cycledJsoHandlerHook,
    createUnifyHook(internalOptions, mandatoryOnly),
    cycledJsoHandlerHook,
    createSelfOriginsCloneHook(internalOptions.originsFlag),
  ],
    {
      rules: RULES[spec.type] || {},
      state: {
        ignoreTreeUnderSymbols: false,
        selfOriginResolver: () => [],
      },
    },
  )
}

export const deUnify = (value: unknown, options?: DeUnifyOptions & LiftCombinersOptions & ResolveOptions) => {
  return deUnifyImpl(value, false, options)
}

export const deCleanUpSynthetic = (value: unknown, options?: DeUnifyOptions & LiftCombinersOptions & ResolveOptions) => {
  return deUnifyImpl(value, true, options)
}

const deUnifyImpl = (value: unknown, mandatoryOnly: boolean, options?: DeUnifyOptions & LiftCombinersOptions & ResolveOptions) => {
  const spec = resolveSpec(value)
  const internalOptions = {
    resolveRef: DEFAULT_OPTION_RESOLVE_REF,
    originsAlreadyDefined: DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
    mergeAllOf: DEFAULT_OPTION_MERGE_ALL_OF,
    liftCombiners: DEFAULT_OPTION_LIFT_COMBINERS,
    allowNotValidSyntheticChanges: DEFAULT_OPTION_ALLOW_NOT_VALID_SYNTHETIC_CHANGES,
    createOriginsForDefaults: (() => DEFAULT_OPTION_ORIGINS_FOR_DEFAULTS),
    ...options,
    evaluationCacheService: createEvaluationCacheService(),
    spreadAllOfCache: createPropertySpreadWithCacheService(JSON_SCHEMA_PROPERTY_ALL_OF),
    syntheticMetaDefinitions: createSyntheticMetaDefinitions(spec.type, options?.originsFlag),
    nativeMetaDefinitions: createNativeMetaDefinitionsForDeUnify(spec.type, options?.originsFlag),
    ignoreSymbols: new Set([
      ...(options?.originsFlag ? [options.originsFlag] : []),
      ...(options?.inlineRefsFlag ? [options.inlineRefsFlag] : []),
      ...(options?.syntheticTitleFlag ? [options.syntheticTitleFlag] : []),
      ...(options?.defaultsFlag ? [options.defaultsFlag] : []),
      ...(options?.syntheticAllOfFlag ? [options.syntheticAllOfFlag] : []),
      ...(options?.ignoreSymbols ? options.ignoreSymbols : []),
    ]),
  } satisfies InternalUnifyOptions
  const cycledJsoHandlerHook = createCycledJsoHandlerHook<UnifyState, NormalizationRule>()
  return syncClone(value, [
    cycledJsoHandlerHook,
    createDeUnifyHook(internalOptions, mandatoryOnly),
    cycledJsoHandlerHook,
    createSelfOriginsCloneHook(internalOptions.originsFlag),
  ],
    {
      rules: RULES[spec.type] || {},
      state: {
        ignoreTreeUnderSymbols: false,
        selfOriginResolver: () => [],
      },
    },
  )
}
