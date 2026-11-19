import type { DiscoveryStatus } from '../../../types'

const DRAFT_VERSION_STATUS = 'draft'
const RELEASE_VERSION_STATUS = 'release'

type VersionStatus =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS

type VersionStatuses = ReadonlyArray<VersionStatus>

export type SpecDto = Readonly<{
  fileId: string
  name: string
  format: 'json' | 'yaml' | 'md' | 'graphql'
  type: string
}>
export type ServiceLabels = Record<string, string>
type BaselineDto = Readonly<{
  packageId: string
  name: string
  versions: ReadonlyArray<string>
  url: string
}>

export type ServiceDto = Readonly<{
  id: string
  specs: ReadonlyArray<SpecDto>
  serviceLabels?: ServiceLabels
  availablePromoteStatuses?: VersionStatuses
  baseline?: BaselineDto
}>

export type ServicesDto = Readonly<{
  status: DiscoveryStatus
  services: ReadonlyArray<ServiceDto>
}>
