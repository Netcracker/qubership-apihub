import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

export const ALL_VERSION = 'All'
export type VersionStatusFilter = VersionStatus | typeof ALL_VERSION
