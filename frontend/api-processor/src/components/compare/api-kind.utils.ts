import {
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  APIHUB_API_COMPATIBILITY_KIND_NO_BWC,
  ApihubApiCompatibilityKind,
  isNoBwcLike,
} from '../../consts'

/**
 * The api kind scope element value for one or more resolved api-kinds: no-bwc if any of them is no-bwc-like.
 * Pass one kind for a removal, keyed on the previous side, or both for a modification.
 */
export const toApiKind = (...apiKinds: (ApihubApiCompatibilityKind | undefined)[]): ApihubApiCompatibilityKind =>
  (apiKinds.some(isNoBwcLike)
    ? APIHUB_API_COMPATIBILITY_KIND_NO_BWC
    : APIHUB_API_COMPATIBILITY_KIND_BWC)
