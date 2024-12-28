import {
  ChainItem,
  HasSelfOriginsResolver,
  Jso,
  OriginLeafs,
  OriginsMetaRecord,
} from './types'
import { anyArrayKeys, isArray, isObject, SyncCloneHook, syncCrawl } from '@netcracker/qubership-apihub-json-crawl'
import { createSelfMetaCloneHook, getJsoProperty, setJsoProperty, stringifyCyclicJso } from './utils'

function stringifyOrigins(origins: OriginLeafs, instanceMap: Map<ChainItem, number>, addInstances: boolean) {
  return origins.map(origin => {
    const path: string[] = []
    let currentOrigin: ChainItem | undefined = origin
    while (currentOrigin) {
      let instanceNumber = instanceMap.get(currentOrigin)
      if (instanceNumber === undefined) {
        instanceMap.set(currentOrigin, instanceNumber = instanceMap.size)
      }
      const inst = addInstances ? `[${instanceNumber}]` : ''
      path.push(`${currentOrigin.value.toString()}${inst}`)
      currentOrigin = currentOrigin.parent
    }
    return path.reverse().join('/')

  })
}

export function convertOriginToHumanReadable<T>(t: T, originsFlag: symbol, addInstances = false): T {
  const instanceMap: Map<ChainItem, number> = new Map()
  const cycleGuard: Set<unknown> = new Set()
  syncCrawl(t, ({ value }) => {
    if (cycleGuard.has(value)) {
      return { done: true }
    }
    cycleGuard.add(value)
    if (!isObject(value)) {
      return { value }
    }
    if (originsFlag in value) {
      const metaRecord = value[originsFlag] as OriginsMetaRecord
      Object.entries(metaRecord).forEach(([propertyKey, origins]) => {
        if (typeof origins === 'string') {//already converted
          return
        }
        metaRecord[propertyKey] = stringifyOrigins(origins, instanceMap, addInstances) as any//juso for nice output
      })
    }
  })
  return t
}

export function stringifyCyclicJsoWithOrigins(jso: unknown, originsFlag: symbol, addInstances = false): string {
  const instanceMap: Map<ChainItem, number> = new Map()
  return stringifyCyclicJso(jso, {
    filter: (_, key) => typeof key !== 'symbol',
    pairExtraInfo: (jso, key) => {
      const record = getJsoProperty(jso, originsFlag) as OriginsMetaRecord
      if (!record) {
        return 'missing origins record'
      }
      const origins = record[key]
      if (!origins) {
        return `missing origins for property '${key.toString()}'`
      }
      return origins.length !== 0 ? stringifyOrigins(origins, instanceMap, addInstances).join(', ') : '<empty>'
    },
    jsoExtraInfo: jso => {
      const record = getJsoProperty(jso, originsFlag) as OriginsMetaRecord
      const keys = new Set(Object.keys(jso))
      if (!record && keys.size > 0) {
        return 'missing origins record'
      }
      const extraKeys = Object.keys(record ?? {}).filter(key => !keys.has(key))
      return extraKeys.length === 0 ? '' : `found extra origins: ${extraKeys.map(key => `[${key}]=${stringifyOrigins(record[key] as OriginLeafs, instanceMap, addInstances)}`).join('; ')}`
    },
  })
}

//Ideology -origins record should always be copied on change
export function concatenateArraysInProperty(source: Jso, target: Jso, propertyKey: PropertyKey, originsFlag: symbol | undefined): void {
  const sourceArray = getJsoProperty(source, propertyKey)
  if (!isArray(sourceArray)) {
    return
  }
  let targetArray = getJsoProperty(target, propertyKey) as unknown[]
  if (targetArray === undefined) {
    targetArray = []
    copyOrigins(source, target, propertyKey, propertyKey, originsFlag)
  }
  if (!isArray(targetArray)) {
    return
  }
  setJsoProperty(target, propertyKey, targetArray)
  const sourceNumberKeys = anyArrayKeys(sourceArray).flatMap(key => typeof key === 'number' ? [key] : [])
  sourceNumberKeys.forEach(sourceKey => {
    const targetIndex = targetArray.length
    targetArray[targetIndex] = sourceArray[sourceKey]
    copyOrigins(sourceArray, targetArray, sourceKey, targetIndex, originsFlag)//may have not good performance cause always copy
  })
}

export function resolveOriginsMetaRecord(source: Jso, originsFlag: symbol | undefined): OriginsMetaRecord | undefined {
  if (!originsFlag) {
    return undefined
  }
  return getJsoProperty(source, originsFlag) as OriginsMetaRecord
}

export function resolveOrigins(source: Jso, propertyKey: PropertyKey, originsFlag: symbol | undefined): OriginLeafs | undefined {
  const originsRecord = resolveOriginsMetaRecord(source, originsFlag)
  if (!originsRecord) {
    return undefined
  }
  return originsRecord[propertyKey]
}

export function copyProperty(source: Jso, target: Jso, propertyKey: PropertyKey, originsFlag: symbol | undefined): void {
  setJsoProperty(target, propertyKey, getJsoProperty(source, propertyKey))
  copyOrigins(source, target, propertyKey, propertyKey, originsFlag)
}

export function copyOrigins(source: Jso, target: Jso, sourcePropertyKey: PropertyKey, targetPropertyKey: PropertyKey, originsFlag: symbol | undefined): void {
  if (!originsFlag) {
    return
  }
  const sourceOriginsRecord = resolveOriginsMetaRecord(source, originsFlag)
  if (!sourceOriginsRecord) {
    return
  }

  setOrigins(target, targetPropertyKey, originsFlag, sourceOriginsRecord[sourcePropertyKey])
}

export function mergeOrigins(target: Jso, sources: Jso[], originsFlag: symbol | undefined): void {
  if (!originsFlag) {
    return
  }
  const newRecords = [target, ...sources].reduce((aggregator: OriginsMetaRecord, jso: Jso) => {
    const jsoOrigins = resolveOriginsMetaRecord(jso, originsFlag) ?? {}
    Object.keys(jsoOrigins).forEach(propertyKey => {
      let existingLeafs = aggregator[propertyKey]
      if (!existingLeafs) {
        existingLeafs = []
        aggregator[propertyKey] = existingLeafs
      }
      (jsoOrigins[propertyKey] ?? []).filter(origin => !existingLeafs.includes(origin)).forEach(origin => existingLeafs.push(origin))
    })
    return aggregator
  }, {} as OriginsMetaRecord)
  setJsoProperty(target, originsFlag, newRecords)
}

export function setOrigins(jso: Jso, propertyKey: PropertyKey, originsFlag: symbol | undefined, origins: OriginLeafs | undefined): void {
  if (!originsFlag) {
    return
  }
  if (!origins) {
    return
  }
  const newOriginsRecord: OriginsMetaRecord = { ...(resolveOriginsMetaRecord(jso, originsFlag) ?? {}) }
  newOriginsRecord[propertyKey] = origins
  setJsoProperty(jso, originsFlag, newOriginsRecord)
}

export function cleanSeveralOrigins(jso: Jso, propertyKeys: PropertyKey[], originsFlag: symbol | undefined): void {
  if (!originsFlag) {
    return
  }
  const originsRecord = resolveOriginsMetaRecord(jso, originsFlag)
  if (!originsRecord) {
    return
  }
  if (!propertyKeys.some(key => key in originsRecord)) {
    return
  }
  const newOriginsRecord: OriginsMetaRecord = { ...originsRecord }
  propertyKeys.forEach(key => delete newOriginsRecord[key])
  setJsoProperty(jso, originsFlag, newOriginsRecord)
}

export function cleanOrigins(jso: Jso, propertyKey: PropertyKey, originsFlag: symbol | undefined): void {
  cleanSeveralOrigins(jso, [propertyKey], originsFlag)
}

export function cleanAllOrigins(jso: Jso, originsFlag: symbol | undefined): void {
  if (!originsFlag) {
    return
  }
  setJsoProperty(jso, originsFlag, {})
}

export function setOriginsForArray(array: unknown[], originsFlag: symbol | undefined, originsArray: (OriginLeafs | undefined)[]): void {
  if (!originsFlag) {
    return
  }
  const newOriginsRecord: OriginsMetaRecord = { ...(resolveOriginsMetaRecord(array, originsFlag) ?? {}) }
  originsArray.forEach((item, index) => { if (item) { newOriginsRecord[index] = item } })
  setJsoProperty(array, originsFlag, newOriginsRecord)
}

export function copyOriginsForArray(sourceArray: unknown[], targetArray: unknown[], originsFlag: symbol | undefined): void {
  if (!originsFlag) {
    return
  }
  const sourceOriginsRecord = resolveOriginsMetaRecord(sourceArray, originsFlag)
  if (!sourceOriginsRecord) {
    return
  }
  const newOriginsRecord: OriginsMetaRecord = { ...(resolveOriginsMetaRecord(targetArray, originsFlag) ?? {}) }
  targetArray.forEach((_, index) => { newOriginsRecord[index] = sourceOriginsRecord[index] })
  setJsoProperty(targetArray, originsFlag, newOriginsRecord)
}

export const createSelfOriginsCloneHook: <T extends HasSelfOriginsResolver, R extends {}>(originsFlag: symbol | undefined) => SyncCloneHook<T, R> = <State extends HasSelfOriginsResolver, Rules extends {}>(originsFlag: symbol | undefined) => {
  return createSelfMetaCloneHook<OriginLeafs, 'selfOriginResolver', State, Rules>('selfOriginResolver', originsFlag, [])
}