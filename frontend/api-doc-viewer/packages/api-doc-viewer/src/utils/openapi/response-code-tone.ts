import { OpenApiResponseCodeClass, OpenApiResponseCodeClasses } from "@netcracker/qubership-apihub-next-data-model/shared/openapi/types/response-code"

/**
 * Response-code selector tone class per code class - the single place to map a class to a color;
 * the colors themselves live in `components/shared-styles/colors/openapi.css`. `undefined` = the
 * neutral grey `Selector` look (`default`, unknown codes).
 */
export const OPENAPI_RESPONSE_CODE_TONE_CLASSES: Readonly<Record<OpenApiResponseCodeClass, string | undefined>> = {
  [OpenApiResponseCodeClasses.INFORMATIONAL]: 'openapi-response-code_1xx',
  [OpenApiResponseCodeClasses.SUCCESS]: 'openapi-response-code_2xx',
  [OpenApiResponseCodeClasses.REDIRECTION]: 'openapi-response-code_3xx',
  [OpenApiResponseCodeClasses.CLIENT_ERROR]: 'openapi-response-code_4xx',
  [OpenApiResponseCodeClasses.SERVER_ERROR]: 'openapi-response-code_5xx',
  [OpenApiResponseCodeClasses.DEFAULT]: undefined,
  [OpenApiResponseCodeClasses.UNKNOWN]: undefined,
}

export function resolveResponseCodeToneClass(codeClass: OpenApiResponseCodeClass | undefined): string | undefined {
  return codeClass ? OPENAPI_RESPONSE_CODE_TONE_CLASSES[codeClass] : undefined
}
