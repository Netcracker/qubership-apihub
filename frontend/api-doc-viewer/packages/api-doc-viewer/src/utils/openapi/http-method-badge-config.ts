import { OpenApiHttpMethod } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/http-method"

export type HttpMethodBadgeConfig = {
  /** Background class of the badge; its color is defined in `components/shared-styles/colors/openapi.css`. */
  readonly colorClass: string
}

/**
 * HTTP method badge classes of the address row - the single place to map a method to a color class
 * (docs/design/openapi/entities/operation.md -> "HTTP method badge config"); the colors themselves
 * live in `components/shared-styles/colors/openapi.css`.
 */
export const OPENAPI_HTTP_METHOD_BADGE_CONFIG: Readonly<Record<OpenApiHttpMethod | 'DEFAULT', HttpMethodBadgeConfig>> = {
  get: { colorClass: 'openapi-http-method-badge_get' },
  post: { colorClass: 'openapi-http-method-badge_post' },
  put: { colorClass: 'openapi-http-method-badge_put' },
  patch: { colorClass: 'openapi-http-method-badge_patch' },
  delete: { colorClass: 'openapi-http-method-badge_delete' },
  head: { colorClass: 'openapi-http-method-badge_head' },
  options: { colorClass: 'openapi-http-method-badge_options' },
  trace: { colorClass: 'openapi-http-method-badge_trace' },
  DEFAULT: { colorClass: 'openapi-http-method-badge_default' },
}

/** The address row's method badge: its text and background class. */
export type HttpMethodBadge = {
  readonly text: string
  readonly colorClass: string
}

export function resolveHttpMethodBadge(method: string): HttpMethodBadge {
  const config = Object.entries(OPENAPI_HTTP_METHOD_BADGE_CONFIG).find(([key]) => key === method.toLowerCase())?.[1]
    ?? OPENAPI_HTTP_METHOD_BADGE_CONFIG.DEFAULT
  return { text: method.toUpperCase(), colorClass: config.colorClass }
}
