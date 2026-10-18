import type { CrawlChildType, CrawlRules, CrawlRulesKey, JsonPath, CrawlPrefixRules } from './types'

export const getNodeRules = <R extends {} = {}>(
  rules = {} as CrawlRules<R>,
  key: PropertyKey,
  path: JsonPath,
  value: unknown,
): CrawlRules<R> | undefined => {
  const keyString = key.toString()
  const rulesKey: CrawlRulesKey = `/${keyString}`
  

  const globalRules = (typeof rules['/**'] === 'function' ? rules['/**']({ key, path, value }) : rules['/**']) as CrawlRules<R> | undefined
  const localRules = (typeof rules['/*'] === 'function' ? rules['/*']({ key, path, value }) : rules['/*']) as CrawlRules<R> | undefined
  
  // Extract and process prefix rules
  let prefixRules: CrawlRules<R> | undefined
  if (rules['/^']) {
    const prefixRulesMap = (typeof rules['/^'] === 'function' ? rules['/^']({ key, path, value }) : rules['/^']) as CrawlPrefixRules<R> | undefined
    
    if (prefixRulesMap) {
      // Find all matching prefixes
      const matchingPrefixes = Object.keys(prefixRulesMap).filter(prefix => 
        prefix.length > 0 && keyString.startsWith(prefix)
      )
      
      // Select the longest matching prefix (most specific)
      if (matchingPrefixes.length > 0) {
        const longestPrefix = matchingPrefixes.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        )
        
        const prefixRule = prefixRulesMap[longestPrefix]
        prefixRules = (typeof prefixRule === 'function' ? prefixRule({ key, path, value }) : prefixRule) as CrawlRules<R>
      }
    }
  }

  let node = {} as CrawlChildType<R>
  if (rulesKey in rules) {
    node = rules[rulesKey] as CrawlChildType<R>
  } else if (!globalRules && !localRules && !prefixRules) {
    return
  }

  let matchedRules: CrawlRules<R> | undefined = typeof node === 'function' ? node({ key, path, value }) : node

  // Apply rules in reverse priority order so higher priority rules override lower ones
  // matchedRules starts as specific rules (highest priority)
  
  if (prefixRules) {
    matchedRules = { ...prefixRules, ...(matchedRules ?? {}) }
  }  
  if (localRules) {
    matchedRules = { ...localRules, ...(matchedRules ?? {}) }
  }
  if (globalRules) {
    return { '/**': rules['/**'], ...globalRules, ...(matchedRules ?? {}) }
  }

  return matchedRules
}

export const mergeRules = <T extends {}, R extends {} = {}>(rules: CrawlRules<R>[]): CrawlRules<R> => {
  const _rules: any = {}

  const keys: Set<string> = rules.reduce((set, r) => {
    Object.keys(r).forEach((key) => set.add(key))
    return set
  }, new Set<string>())

  for (const key of keys.keys()) {
    const arr: any = rules.filter((v) => key in v)
    if (arr.length === 1) {
      _rules[key] = arr[0][key]
      continue
    }

    if (key.charAt(0) === '/') {
      // merge rules path
      _rules[key] = (path: JsonPath, state: T) => {
        const _arr = arr.map((v: any) => typeof v[key] === 'function' ? v[key](path, state) : v[key])
        return mergeRules(_arr)
      }
    } else {
      throw new Error(`Cannot merge rules. Duplicate key: ${key}. Rules should not have same Rule key`)
    }
  }

  return _rules
}
