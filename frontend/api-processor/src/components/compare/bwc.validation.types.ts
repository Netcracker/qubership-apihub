import { ApihubApiCompatibilityKind } from '../../consts'
import { ApiCompatibilityScopeFunction } from '@netcracker/qubership-apihub-api-diff'

export type ApiCompatibilityScopeFunctionFactory = (
  prevDocumentApiKind?: ApihubApiCompatibilityKind,
  currDocumentApiKind?: ApihubApiCompatibilityKind,
) => ApiCompatibilityScopeFunction
