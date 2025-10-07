import {
  DEFAULT_OPTION_ALLOW_NOT_VALID_SYNTHETIC_CHANGES,
  DEFAULT_OPTION_LIFT_COMBINERS,
  DEFAULT_OPTION_MERGE_ALL_OF,
  DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
  DEFAULT_OPTION_RESOLVE_REF,
  DEFAULT_OPTION_UNIFY,
  DEFAULT_OPTION_VALIDATE,
  DenormalizeOptions,
  NormalizeOptions,
} from './types'
import { deDefineOriginsAndResolvedRefSymbols, defineOriginsAndResolveRef } from './define-origins-and-resolve-ref'
import { preValidate, validate } from './validate'
import { merge } from './merge'
import { cleanUpSynthetic, deCleanUpSynthetic, deUnify, unify } from './unify'
import { deHash, hash } from './hash'
import { removeOasExtensions } from './remove-oas-extensions'
import { deserialize, serialize } from './test'

export const normalize = (value: unknown, options: NormalizeOptions = {}) => {
  const optionsWithDefaults = createOptionsWithDefaults(options)
  let spec = value
  if (optionsWithDefaults.validate) { preValidate(spec, options) }
  if (optionsWithDefaults.resolveRef || (!optionsWithDefaults.originsAlreadyDefined && optionsWithDefaults.originsFlag)) {spec = defineOriginsAndResolveRef(spec, optionsWithDefaults)}
  if (optionsWithDefaults.validate) { spec = validate(spec, optionsWithDefaults) }
  if (optionsWithDefaults.mergeAllOf) { spec = merge(spec, optionsWithDefaults) }
  if (optionsWithDefaults.unify) { spec = unify(spec, optionsWithDefaults) }
  if (optionsWithDefaults.mergeAllOf && !optionsWithDefaults.unify && !optionsWithDefaults.allowNotValidSyntheticChanges) { spec = cleanUpSynthetic(spec, optionsWithDefaults) }
  if (optionsWithDefaults.removeOasExtensions) { spec = removeOasExtensions(spec, optionsWithDefaults) }
  if (optionsWithDefaults.hashFlag) { spec = hash(spec, optionsWithDefaults) }

  const symbolToStringMapping = new Map<symbol, string>()
  const stringToSymbolMapping = new Map<string, symbol>()

  if(options?.originsFlag){
    symbolToStringMapping.set(options.originsFlag, '__originsFlag')
    stringToSymbolMapping.set('__originsFlag', options.originsFlag)
  }
  if(options?.inlineRefsFlag){
    symbolToStringMapping.set(options.inlineRefsFlag, '__inlineRefsFlag')
    stringToSymbolMapping.set('__inlineRefsFlag', options.inlineRefsFlag)
  }
  if(options?.hashFlag){
    symbolToStringMapping.set(options.hashFlag, '__hashFlag')
    stringToSymbolMapping.set('__hashFlag', options.hashFlag)
  }
  if(options?.syntheticTitleFlag){
    symbolToStringMapping.set(options.syntheticTitleFlag, '__syntheticTitleFlag')
    stringToSymbolMapping.set('__syntheticTitleFlag', options.syntheticTitleFlag)
  }
  if(options?.syntheticAllOfFlag){
    symbolToStringMapping.set(options.syntheticAllOfFlag, '__syntheticAllOfFlag')
    stringToSymbolMapping.set('__syntheticAllOfFlag', options.syntheticAllOfFlag)
  }
  if(options?.defaultsFlag){
    symbolToStringMapping.set(options.defaultsFlag, '__defaultsFlag')
    stringToSymbolMapping.set('__defaultsFlag', options.defaultsFlag)
  }

  const serialized = serialize(spec, symbolToStringMapping)
  const deserialized = deserialize(serialized, stringToSymbolMapping)
  return deserialized
}

export const denormalize = (value: unknown, options: DenormalizeOptions = {}) => {
  const optionsWithDefaults = createOptionsWithDefaults(options)
  let spec = value
  if (optionsWithDefaults.hashFlag) { spec = deHash(spec, optionsWithDefaults) }
  if (optionsWithDefaults.mergeAllOf && !optionsWithDefaults.unify && !optionsWithDefaults.allowNotValidSyntheticChanges) { spec = deCleanUpSynthetic(spec, optionsWithDefaults) }
  if (optionsWithDefaults.unify) { spec = deUnify(spec, optionsWithDefaults) }
  //if in future we found way to denormalize following operation it should be in this order
  // if (shouldMergeAllOf) {spec = merge(spec, options)}
  // if (shouldValidate) {spec = validate(spec, options)}
  if (optionsWithDefaults.resolveRef || (!optionsWithDefaults.originsAlreadyDefined && optionsWithDefaults.originsFlag)) { spec = deDefineOriginsAndResolvedRefSymbols(spec, optionsWithDefaults) }
  return spec
}

type OptionsWithDefaults<O extends NormalizeOptions> = O & {
  resolveRef: boolean,
  validate: boolean,
  mergeAllOf: boolean,
  liftCombiners: boolean,
  unify: boolean,
  allowNotValidSyntheticChanges: boolean,
  originsAlreadyDefined: boolean,
}

function createOptionsWithDefaults<O extends NormalizeOptions>(options: O): OptionsWithDefaults<O> {
  return {
    resolveRef: DEFAULT_OPTION_RESOLVE_REF,
    validate: DEFAULT_OPTION_VALIDATE,
    mergeAllOf: DEFAULT_OPTION_MERGE_ALL_OF,
    unify: DEFAULT_OPTION_UNIFY,
    liftCombiners: DEFAULT_OPTION_LIFT_COMBINERS,
    allowNotValidSyntheticChanges: DEFAULT_OPTION_ALLOW_NOT_VALID_SYNTHETIC_CHANGES,
    originsAlreadyDefined: DEFAULT_OPTION_ORIGINS_ALREADY_DEFINED,
    ...options,
  }
}
