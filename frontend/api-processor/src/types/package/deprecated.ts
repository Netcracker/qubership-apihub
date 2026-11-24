import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export type Hash = string

export interface PackageDeprecatedItem {
  declarationJsonPaths: JsonPath[]        //declarative path to deprecated item
  description?: string                    // human-readable location of deprecated item
  deprecatedInPreviousVersions: string[]  // list of previous version with same deprecated item
  deprecatedInfo?: string                 // meta from x-deprecated-meta
  tolerantHash?: Hash                     // value of tolerant hash for Schema Object or Parameter Object that was deprecated
  hash?: Hash                             // value of hash for Schema Object or Parameter Object that was deprecated, need for detecting semi-breaking in UI
}
