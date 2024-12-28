import { isArray } from '@netcracker/qubership-apihub-json-crawl'

type Footprint = string

export interface EvaluationCacheService {
  cacheEvaluationResultByFootprint<Source, Result>(
    jso: Source,
    evaluate: (jso: Source) => Result,
    cyclicGuardResult?: Result,
    mergeResultWithGuard?: (result: Result, guard: Result) => Result
  ): Result
}

export interface PropertySpreadWithCacheService<K extends PropertyKey, V> {
  spreadOrReuse(jso: Record<PropertyKey, unknown> & { [key in K]: V }): [V | undefined, Record<PropertyKey, unknown>]
}

export const createEvaluationCacheService: () => EvaluationCacheService = () => {
  const instanceMap: Map<unknown, Footprint> = new Map()
  const cache: Map<Footprint, unknown> = new Map()

  const instanceToFootprint = (jso: unknown): Footprint => {
    const instanceId = instanceMap.get(jso)
    if (instanceId !== undefined) {
      return instanceId
    }
    const id = (instanceMap.size + 1).toString()
    instanceMap.set(jso, id)
    return id
  }

  const uniqueInstancesFootprint = (jso: unknown): Footprint => {
    const rawItems = isArray(jso) ? jso.map(instanceMap => instanceToFootprint(instanceMap)) : [instanceToFootprint(jso)]
    const usedItems = new Set(rawItems)
    return rawItems.reduceRight((collector, currentValue) => {
      if (usedItems.has(currentValue)) {
        collector.push(currentValue)
        usedItems.delete(currentValue)
      }
      return collector
    }, [] as Footprint[]).join()
  }

  function cacheEvaluationResultByFootprint<Source, Result>(jso: Source, evaluate: (jso: Source) => Result, cyclicGuardResult?: Result, mergeResultWithGuard?: (result: Result, guard: Result) => Result): Result {
    const footprint = uniqueInstancesFootprint(jso)
    let instance = cache.get(footprint) as Result
    if (instance === undefined) {
      cache.set(footprint, cyclicGuardResult)
      instance = evaluate(jso)
      if (cyclicGuardResult !== undefined && mergeResultWithGuard !== undefined) {
        instance = mergeResultWithGuard(instance, cyclicGuardResult)
      }
      cache.set(footprint, instance)
    }
    return instance
  }

  return {
    cacheEvaluationResultByFootprint,
  }
}

export function createPropertySpreadWithCacheService<K extends PropertyKey, V>(propertyKey: K): PropertySpreadWithCacheService<K, V> {
  const cache: Map<Record<PropertyKey, unknown> & { [key in K]: V }, [V, Record<PropertyKey, unknown>]> = new Map()
  function spreadOrReuse(jso: Record<PropertyKey, unknown> & { [key in K]: V }): [V | undefined, Record<PropertyKey, unknown>] {
    const result = cache.get(jso)
    if (result) {
      return result
    }
    const jsoCopy = { ...jso }
    const firstArg = jso[propertyKey]
    if (firstArg === undefined) {
      return [undefined, jso]
    }
    delete jsoCopy[propertyKey]
    const spread: [V, Record<PropertyKey, unknown>] = [firstArg, jsoCopy]
    cache.set(jso, spread)
    return spread
  }
  return {
    spreadOrReuse
  }
}