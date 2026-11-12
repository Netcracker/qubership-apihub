import type { Key } from '../entities/keys'

export const IdentityProviderTypes = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
} as const

export type IdentityProviderType = (typeof IdentityProviderTypes)[keyof typeof IdentityProviderTypes]

export type IdentityProviderDto = Readonly<{
  id: Key
  type: IdentityProviderType
  displayName: string
  loginStartEndpoint?: string
  imageSvg?: string
}>

export type InternalIdentityProvider = Omit<IdentityProviderDto, 'type'> & { type: typeof IdentityProviderTypes.INTERNAL }
export type ExternalIdentityProvider = Omit<IdentityProviderDto, 'type'> & { type: typeof IdentityProviderTypes.EXTERNAL }

export type SystemExtension = Readonly<{
  name: string
  baseUrl: string
  pathPrefix: string
}>

export type SystemConfigurationDto = Readonly<{
  defaultWorkspaceId: string
  authConfig: {
    identityProviders: ReadonlyArray<IdentityProviderDto>
    autoLogin?: boolean
  }
  extensions: Array<SystemExtension>
}>

export type SystemConfiguration = SystemConfigurationDto

export function isInternalIdentityProvider(idp: IdentityProviderDto): idp is InternalIdentityProvider {
  return idp.type === IdentityProviderTypes.INTERNAL
}

export function isExternalIdentityProvider(idp: IdentityProviderDto): idp is ExternalIdentityProvider {
  return idp.type === IdentityProviderTypes.EXTERNAL
}
