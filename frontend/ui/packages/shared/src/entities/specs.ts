import type { FileKey, ServiceKey, SpecKey } from './keys'
import type { FileExtension } from '../utils/files'
import type { SpecType } from '../utils/specs'

export type Spec = Readonly<{
  key: SpecKey
  serviceKey?: ServiceKey
  name: string
  extension: FileExtension
  type: SpecType
  proxyServerUrl?: string
}>

export type SpecDto = Readonly<{
  fileId: FileKey
  name: string
  format: 'json' | 'yaml' | 'graphql'
  type: SpecType
}>

export type SpecRaw = string

export function toSpec(value: SpecDto, serviceId: ServiceKey, proxyServerUrl?: string): Spec {
  return {
    key: value.fileId,
    serviceKey: serviceId,
    name: value.name,
    extension: `.${value.format}`,
    type: value.type,
    proxyServerUrl: proxyServerUrl,
  }
}
