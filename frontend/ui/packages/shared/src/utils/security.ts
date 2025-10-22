import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters, UseMutateFunction } from '@tanstack/react-query'
import type { IdentityProviderDto, SystemConfigurationDto } from '../types/system-configuration'
import { isInternalIdentityProvider } from '../types/system-configuration'
import {
  SEARCH_PARAM_NO_AUTO_LOGIN,
  SESSION_STORAGE_KEY_LAST_IDENTITY_PROVIDER_ID,
  SESSION_STORAGE_KEY_SYSTEM_CONFIGURATION,
} from './constants'
import { getRedirectUri, redirectTo, redirectToLogin } from './redirects'
import { optionalSearchParams } from './search-params'
import { stopThread } from './threads'

// TODO 16.05.25 // Temporarily copy-pasted from ./requests.ts
// Get rid of copy-pasting these constants
const API_V3 = '/api/v3'

export const TokenRefreshResults = {
  NO_PROVIDER: 'no-provider',
  NO_ENDPOINT: 'no-endpoint',
  TOKEN_REFRESHED: 'token-refreshed',
  UNKNOWN: 'unknown',
} as const
export type TokenRefreshResult = (typeof TokenRefreshResults)[keyof typeof TokenRefreshResults]

export function isTokenRefreshed(maybeTokenRefreshResult: unknown): maybeTokenRefreshResult is typeof TokenRefreshResults.TOKEN_REFRESHED {
  return maybeTokenRefreshResult === TokenRefreshResults.TOKEN_REFRESHED
}

export class WorkerUnauthorizedError extends Error {
  readonly responseStatus: number = 401

  constructor() {
    super('HTTP 401 Unauthorized')
    this.name = 'WorkerUnauthorizedError'
  }
}

export function isInWebWorker(self: unknown): self is WorkerGlobalScope {
  return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
}

export async function handleAuthentication(responseStatus: number): Promise<TokenRefreshResult | undefined> {
  const searchParams = new URLSearchParams(location.search)
  // noAutoLogin = true in 2 cases:
  // 1. user manually logged out just now
  // 2. user logged in just now and automatically redirect to login page
  const allowedAutoLogin = !searchParams.get(SEARCH_PARAM_NO_AUTO_LOGIN)

  let tokenRefreshResult: TokenRefreshResult | undefined

  if (responseStatus === 401 && allowedAutoLogin) {
    let lastProviderId: string | null | undefined
    let systemConfigurationDto: SystemConfigurationDto | undefined
    if (isInWebWorker(self)) {
      ({
        systemConfigurationDto,
        lastIdentityProviderId: lastProviderId,
      } = self)
    }

    // must be always present,
    // because protected API is not fetched until system configuration is loaded
    systemConfigurationDto = systemConfigurationDto || JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY_SYSTEM_CONFIGURATION)!) as SystemConfigurationDto

    const { authConfig } = systemConfigurationDto

    // trying to refresh token by auto-login provider
    const { autoLogin } = authConfig
    if (autoLogin) {
      const [autoLoginProvider] = authConfig.identityProviders
      tokenRefreshResult = await handleUnauthorizedByProvider(autoLoginProvider)
      if (isTokenRefreshed(tokenRefreshResult)) {
        return tokenRefreshResult
      }
    } else {
      // trying to refresh token by last used provider
      lastProviderId = lastProviderId || localStorage.getItem(SESSION_STORAGE_KEY_LAST_IDENTITY_PROVIDER_ID)
      const lastProvider = lastProviderId
        ? authConfig.identityProviders.find(idp => idp.id === lastProviderId)
        : undefined

      tokenRefreshResult = await handleUnauthorizedByProvider(lastProvider)
      if (isTokenRefreshed(tokenRefreshResult)) {
        return tokenRefreshResult
      }
    }

    // the first login in clear browser
    if (tokenRefreshResult === TokenRefreshResults.NO_PROVIDER) {
      redirectToLogin()
    }
  }

  return tokenRefreshResult
}

async function handleUnauthorizedByProvider(identityProvider: IdentityProviderDto | undefined): Promise<TokenRefreshResult> {
  if (!identityProvider) {
    return TokenRefreshResults.NO_PROVIDER
  }

  let requestEndpoint = ''
  if (isInternalIdentityProvider(identityProvider)) {
    // Parameter "redirectUri" is used to redirect when the user is not authenticated and token can't be refreshed
    // In that case we should redirect to the login page with its own "redirectUri"
    // which will be used after logging in via internal identity provider to redirect to the original page.
    const searchParamsLoginPage = optionalSearchParams({ noAutoLogin: { value: true }, redirectUri: { value: getRedirectUri() } })
    const searchParamsAuthLocalRefresh = optionalSearchParams({ redirectUri: { value: `${location.origin}/login?${searchParamsLoginPage}` } })
    requestEndpoint = `${API_V3}/auth/local/refresh?${searchParamsAuthLocalRefresh}`
  } else if (identityProvider.loginStartEndpoint) {
    // In case of external identity provider, we don't have control over the redirections and we provide
    // just "redirectUri" with value of the current page OR main page (if current page is login page),
    // because internal redirections will be managed by the backend and the provider.
    const searchParamsAuthWithStartEndpoint = optionalSearchParams({ redirectUri: { value: getRedirectUri() } })
    requestEndpoint = `${identityProvider.loginStartEndpoint}?${searchParamsAuthWithStartEndpoint}`
  } else {
    return TokenRefreshResults.NO_ENDPOINT
  }
  const response = await fetch(
    requestEndpoint,
    {
      method: 'GET',
      redirect: 'manual',
    },
  )
  if (response.ok) {
    return TokenRefreshResults.TOKEN_REFRESHED
  }
  if (response.type === 'opaqueredirect') {
    const url = response.url.replace(location.origin, '')
    redirectTo(url)
    /**
     * TL;DR: Redirections are asyncronous global tasks
     * Details:
     * - https://html.spec.whatwg.org/multipage/browsing-the-web.html#navigate
     * - Some part of navigation algorithm is run synchronously until the point 8 from specs.
     * - Since this moment, if surrounding (!) code is running, it will be finished first.
     * - Surrounding code includes both synchronous and asynchronous code.
     * - Continuing navigation will be planned as a global task.
     * - After surrounding code is finished, navigation will be executed,
     *   BUT:
     *   If any microtask will never be resolved, navigation will be executed anyway
     *   after the last reached surrounding code is executed.
     * - So, as the result, we can stop thread to wait for the redirection with infinite promise.
     */
    await stopThread('Waiting for redirection...')
  }
  console.error('Can\'t refresh token. Response:', response)
  return TokenRefreshResults.UNKNOWN
}

function isWorkerUnauthorizedError(error: unknown): error is WorkerUnauthorizedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'WorkerUnauthorizedError' &&
    'responseStatus' in error &&
    typeof error.responseStatus === 'number'
  )
}

type MutationUnauthorizedHandler<TError, TVariables, TContext>
  = (error: TError, variables: TVariables, context: TContext) => Promise<TokenRefreshResult | undefined>

export function onMutationUnauthorized<TData = unknown, TError extends Error = Error, TVariables = void, TContext = unknown>(
  mutate: UseMutateFunction<TData, TError, TVariables, TContext>,
): MutationUnauthorizedHandler<TError, TVariables, TContext> {

  return async (error, variables): Promise<TokenRefreshResult | undefined> => {
    if (isWorkerUnauthorizedError(error)) {
      const tokenRefreshResult = await handleAuthentication(error.responseStatus)
      if (tokenRefreshResult === TokenRefreshResults.TOKEN_REFRESHED) {
        mutate(variables)
      }
      return tokenRefreshResult
    }
  }
}

type QueryUnauthorizedHandler<TError> = (error: TError) => Promise<TokenRefreshResult | undefined>

export function onQueryUnauthorized<TData = unknown, TError extends Error = Error>(
  refetch: <TPageData>(options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined) => Promise<QueryObserverResult<TData, TError>>,
): QueryUnauthorizedHandler<TError> {

  return async (error): Promise<TokenRefreshResult | undefined> => {
    if (isWorkerUnauthorizedError(error)) {
      const tokenRefreshResult = await handleAuthentication(error.responseStatus)
      if (tokenRefreshResult === TokenRefreshResults.TOKEN_REFRESHED) {
        refetch()
      }
      return tokenRefreshResult
    }
  }
}
