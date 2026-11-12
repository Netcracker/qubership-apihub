import {
  breaking,
  DiffType,
  ReclassificationRule,
  risky,
} from '@netcracker/qubership-apihub-api-diff'
import { ApihubApiCompatibilityKind, isNoBwcLike } from '../../consts'

/** Api kind a node was reached under. */
export const CUSTOM_SCOPE_ELEMENT_API_KIND = 'apiKind'

/** Group of operations a removal of a long-deprecated element was reached from. */
export const CUSTOM_SCOPE_ELEMENT_DEPRECATION = 'deprecation'

export const apiKindReclassificationRule: ReclassificationRule = ({ type, customScope }): DiffType | undefined => {
  // A cast rather than a check: api-diff types every custom scope value as a string, and the only provider
  // writing under this name is the api kind one each `*.changes.ts` declares, which `apiDiff` keeps sole by
  // rejecting a second provider of the same name
  const apiKind = customScope?.[CUSTOM_SCOPE_ELEMENT_API_KIND] as ApihubApiCompatibilityKind | undefined
  return type === breaking && isNoBwcLike(apiKind) ? risky : undefined
}
