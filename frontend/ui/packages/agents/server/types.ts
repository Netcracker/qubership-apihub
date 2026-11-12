export type Writeable<T> = {
  -readonly [P in keyof T]: T[P]
}

export type DeepWriteable<T> = {
  -readonly [P in keyof T]: DeepWriteable<T[P]>
}

export const NONE_DISCOVERY_STATUS = 'none'
export const RUNNING_DISCOVERY_STATUS = 'running'
export const COMPLETE_DISCOVERY_STATUS = 'complete'
export const ERROR_DISCOVERY_STATUS = 'error'

export type DiscoveryStatus =
  | typeof NONE_DISCOVERY_STATUS
  | typeof RUNNING_DISCOVERY_STATUS
  | typeof COMPLETE_DISCOVERY_STATUS
  | typeof ERROR_DISCOVERY_STATUS

export type State = {
  discovery: {
    status: DiscoveryStatus
  }
}

export const NONE_PUBLISH_STATUS = 'none'
export const RUNNING_PUBLISH_STATUS = 'running'
export const COMPLETE_PUBLISH_STATUS = 'complete'
export const ERROR_PUBLISH_STATUS = 'error'

export type PublishStatus =
  | typeof NONE_PUBLISH_STATUS // technical status
  | typeof RUNNING_PUBLISH_STATUS
  | typeof COMPLETE_PUBLISH_STATUS
  | typeof ERROR_PUBLISH_STATUS

export type PublishDetails = PublishDetailsDto

export type PublishDetailsDto = {
  publishId: string
  status: PublishStatus
  message?: string
}
