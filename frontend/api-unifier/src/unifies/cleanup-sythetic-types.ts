import { UnifyFunction } from '../types'
import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { combineJsonSchemaWithMetaJso } from './empty-schema'
import { setJsoProperty } from '../utils'
import { mergeOrigins, resolveOriginsMetaRecord } from '../origins'

export const cleanUpSyntheticJsonSchemaTypes: UnifyFunction =
  {
    forward: (value, { options }) => {
      if (options.allowNotValidSyntheticChanges) {
        return value
      }
      if (!isObject(value)) {
        return value
      }
      const jsoCandidate = { ...value }
      const empty = options.syntheticMetaDefinitions.omitIfAssignableToEmptyJsonSchema(jsoCandidate)
      if (empty) {
        return combineJsonSchemaWithMetaJso(jsoCandidate, options.nativeMetaDefinitions.emptyJsonSchema(empty), options)
      }
      const invertedEmpty = options.syntheticMetaDefinitions.omitIfAssignableToInvertedEmptyJsonSchema(jsoCandidate)
      if (invertedEmpty) {
        return combineJsonSchemaWithMetaJso(jsoCandidate, options.nativeMetaDefinitions.invertedEmptyJsonSchema(invertedEmpty), options)
      }
      return value
    },
    backward: (value, { path, options }) => {
      if (!isObject(value)) {
        return
      }
      if (options.allowNotValidSyntheticChanges) {
        return
      }
      const empty = options.nativeMetaDefinitions.omitIfAssignableToEmptyJsonSchema(value, options.skip ? (v, p) => options.skip!(v, [...path, ...p]) : undefined)
      if (empty) {
        const emptySchema = options.syntheticMetaDefinitions.emptyJsonSchema(empty)

        mergeOrigins(value, [emptySchema], options.originsFlag)
        const originsMetaRecord = resolveOriginsMetaRecord(value, options.originsFlag)
        Object.assign(value, emptySchema)
        if (options.originsFlag) {
          setJsoProperty(value, options.originsFlag, originsMetaRecord)
        }
        //actually assign should be deep
        return
      }
      const invertedEmpty = options.nativeMetaDefinitions.omitIfAssignableToInvertedEmptyJsonSchema(value, options.skip ? (v, p) => options.skip!(v, [...path, ...p]) : undefined)
      if (invertedEmpty) {
        const invertedEmptyJsonSchema = options.syntheticMetaDefinitions.invertedEmptyJsonSchema(invertedEmpty)
        mergeOrigins(value, [invertedEmptyJsonSchema], options.originsFlag)
        const originsMetaRecord = resolveOriginsMetaRecord(value, options.originsFlag)
        Object.assign(value, invertedEmptyJsonSchema) //actually assign should be deep
        if (options.originsFlag) {
          setJsoProperty(value, options.originsFlag, originsMetaRecord)
        }
      }
    },
  }

export const forwardOnlyCleanUpSyntheticJsonSchemaTypes: UnifyFunction = (value, { options }) => {
  if (options.allowNotValidSyntheticChanges) {
    return value
  }
  if (!isObject(value)) {
    return value
  }
  const jsoCandidate = { ...value }
  const empty = options.syntheticMetaDefinitions.omitIfAssignableToEmptyJsonSchema(jsoCandidate)
  if (empty) {
    return jsoCandidate //cause it default and this code invoke in NO unify case
  }
  const invertedEmpty = options.syntheticMetaDefinitions.omitIfAssignableToInvertedEmptyJsonSchema(jsoCandidate)
  if (invertedEmpty) {
    return combineJsonSchemaWithMetaJso(jsoCandidate, options.nativeMetaDefinitions.invertedEmptyJsonSchema(invertedEmpty), options)
  }
  return value
}