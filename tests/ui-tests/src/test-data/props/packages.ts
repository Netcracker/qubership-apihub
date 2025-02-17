import type {
  BasePackageParams,
  GroupParams,
  PackageKind,
  PackageParams,
  TestMetaBasePackage,
  WorkspaceParams,
} from './params'
import type { PackageApiKey } from '@shared/entities'
import { TEST_PREFIX } from '@test-data'
import process from 'node:process'

export abstract class BasePackage {
  readonly name: string
  readonly alias: string
  readonly description?: string
  readonly testMeta?: TestMetaBasePackage

  protected constructor(params: BasePackageParams) {
    this.name = params.name
    this.alias = params.alias
    this.description = params.description
    this.testMeta = params.testMeta
  }
}

export class Workspace extends BasePackage {
  readonly kind: PackageKind = 'workspace'
  readonly packageId = this.alias
  readonly defaultRole?: string
  readonly apiKeys?: PackageApiKey[]

  constructor(params: WorkspaceParams, nameOptions?: NameOptions) {
    const _name = setName(params.name, 'WSP', nameOptions)
    super({ ...params, name: _name })
    this.defaultRole = params.defaultRole
    this.apiKeys = params.apiKeys
  }
}

export class Group extends Workspace {
  readonly kind: PackageKind = 'group'
  readonly parentId: string
  readonly packageId: string
  readonly parent: Workspace | Group
  readonly parents: Array<Workspace | Group>

  constructor(params: GroupParams, nameOptions?: NameOptions) {
    const _name = setName(params.name, 'GRP', nameOptions)
    super({ ...params, name: _name })
    this.parent = params.parent
    this.parents = params.parent instanceof Group ? [...params.parent.parents, this.parent] : [this.parent]
    this.parentId = this.parent.packageId
    this.packageId = `${this.parentId}.${this.alias}`
  }

  get workspace(): Workspace {
    return this.parents[0]
  }

  get parentPath(): string {
    return this.parents.map(p => p.name).join(' / ')
  }
}

export class Package extends Group {
  readonly kind: PackageKind = 'package'
  readonly serviceName?: string
  readonly releaseVersionPattern?: string
  readonly restGroupingPrefix?: string

  constructor(params: PackageParams, nameOptions?: NameOptions) {
    const _name = setName(params.name, 'PKG', nameOptions)
    super({ ...params, name: _name })
    this.serviceName = params.serviceName
    this.releaseVersionPattern = params.releaseVersionPattern
    this.restGroupingPrefix = params.restGroupingPrefix
  }

  get baselinePackage(): string {
    return ` ${this.packageId} / ${this.name}`
  }
}

export class Dashboard extends Package {
  readonly kind: PackageKind = 'dashboard'

  constructor(params: PackageParams, nameOptions?: NameOptions) {
    const _name = setName(params.name, 'DSH', nameOptions)
    super({ ...params, name: _name })
  }
}

interface NameOptions {
  testPrefix?: boolean
  kindPrefix?: boolean
  testId?: 'reusable' | 'non-reusable'
}

function setName(name: string, kindPrefix: string, nameOptions?: NameOptions): string {
  const _testPrefix = nameOptions?.testPrefix ? TEST_PREFIX : ''
  const _kindPrefix = nameOptions?.kindPrefix ? `${kindPrefix}-` : ''
  const _testId = nameOptions?.testId === 'reusable' ? `-${process.env.TEST_ID_R}` : nameOptions?.testId === 'non-reusable' ? `-${process.env.TEST_ID_N}` : ''
  return `${_testPrefix}${_kindPrefix}${name}${_testId}`
}
