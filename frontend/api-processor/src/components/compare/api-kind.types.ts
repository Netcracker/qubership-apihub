import { CustomScopeElementContext } from '@netcracker/qubership-apihub-api-diff'
import { ApihubApiCompatibilityKind } from '../../consts'

/** Answers the api kind element of the custom scope for one node, `undefined` to inherit. */
type ApiKindValueAt = (context: CustomScopeElementContext) => ApihubApiCompatibilityKind | undefined

/** Binds a `valueAt` to the api kinds the two documents were built with. */
export type ApiKindValueAtFactory = (
  prevDocumentApiKind?: ApihubApiCompatibilityKind,
  currDocumentApiKind?: ApihubApiCompatibilityKind,
) => ApiKindValueAt
