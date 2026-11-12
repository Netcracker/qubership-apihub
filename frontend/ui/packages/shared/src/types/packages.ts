import type { ChangeSummary, ResolvedVersion } from '@netcracker/qubership-apihub-api-processor'
import type { ApiType } from '../entities/api-types'

export type VersionChangeSummary = {
  [type in ApiType]: ChangeSummary
} & {
  all: ChangeSummary
}

export type OperationSummary = {
  [type in ApiType]: {
    endpoints: number
    deprecated: number
    created: number
    deleted: number
  }
}

export type ResolvedVersionDto = Readonly<ResolvedVersion>
