import type {
  RestAgentConfig,
  RestOperationGroupUpdate,
  RestPackageCreate,
  RestPackageUpdate,
  RestPublishConfig,
  RestPublishFile,
} from '@services/rest/rest.types'
import type { TestFile } from '@shared/entities'

export type TdmPublishVersion = {
  pkg: {
    packageId: string
    name?: string
  }
  files?: TdmPublishFile[]
} & Omit<RestPublishConfig, 'packageId' | 'files'>

export type TdmPublishFile = {
  file: TestFile
} & Partial<RestPublishFile>

export type TdmPackageCreate = RestPackageCreate

export type TdmPackageUpdate = RestPackageUpdate & {
  name: string
}

export type TdmOperationGroup = RestOperationGroupUpdate

export type TdmAgentConfig = RestAgentConfig & {
  cloud?: string
}
