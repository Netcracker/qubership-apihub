import { isObject, JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export const PREDICATE_ANY_VALUE = Symbol('?')
export const PREDICATE_UNCLOSED_END = Symbol('**')

export interface GrepValuePredicate {
  readonly name: string
}

export const grepValue = (name: string) => {
  return { name } as GrepValuePredicate
}

export type PathPredicate = (PropertyKey | GrepValuePredicate)[]

export type GrepValues = Record<GrepValuePredicate['name'], PropertyKey>

export type MatchResult = {
  path: JsonPath
  predicate: PathPredicate
  grepValues: GrepValues
}

function matchPath(path: JsonPath, predicates: PathPredicate[]): MatchResult | undefined {
  const predicateMap = new Map<number, PathPredicate>(predicates.map((value, index) => [index, value]))
  const state = path.reduce((state, pathItem, currentIndex) => {
    state.predicateMap.forEach((predicate, key, map) => {
      if (predicate.length === 0) {
        currentIndex === path.length ? map.set(key, predicate) : map.delete(key)
      }
      const predicateCopy = [...predicate]
      const currentItemPredicate = predicateCopy.shift()
      if (isObject(currentItemPredicate)) {
        const name = (currentItemPredicate as GrepValuePredicate).name
        state.result[name] = pathItem
        map.set(key, predicateCopy)
      } else {
        switch (currentItemPredicate) {
          case PREDICATE_ANY_VALUE: {
            return map.set(key, predicateCopy)
          }
          case PREDICATE_UNCLOSED_END: {
            return map.set(key, [PREDICATE_UNCLOSED_END, ...predicateCopy])
          }
          default: {
            if (pathItem === currentItemPredicate) {
              map.set(key, predicateCopy)
            } else {
              map.delete(key)
            }
          }
        }
      }
    })
    return { ...state, predicateMap: predicateMap }
  }, { result: {} as GrepValues, predicateMap })
  if (state.predicateMap.size === 0) {
    return undefined
  }

  return {
    path: path,
    predicate: predicates[state.predicateMap.keys().next().value],
    grepValues: state.result
  }
}

export const matchPaths: (paths: JsonPath[], predicated: PathPredicate[]) => MatchResult | undefined = (paths, predicates) => {
  return paths.reduce((matchResult, path) => {
    if (matchResult) {
      return matchResult
    }
    return matchPath(path, predicates)
  }, undefined as MatchResult | undefined)
}

export const calculateMatchingDepth = ({ predicate }: MatchResult): number => {
  let gap = 1
  if (predicate[predicate.length - 1] === PREDICATE_UNCLOSED_END) {
    gap += 1
  }
  return predicate.length - gap
}

