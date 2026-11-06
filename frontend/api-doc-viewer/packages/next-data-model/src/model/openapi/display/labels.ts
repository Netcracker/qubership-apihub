import { OpenApiParameterLocation } from "../types/node-value"

const PARAMETER_GROUP_TITLES: Readonly<Record<OpenApiParameterLocation, string>> = {
  path: 'Path Parameters',
  query: 'Query Parameters',
  header: 'Headers',
  cookie: 'Cookies',
}

/**
 * Display labels of the OpenAPI layer, resolved in the data layer (never in JSX). The Security
 * section's labels are `OPENAPI_SECURITY_DISPLAY_LABELS` (`../security-presentation`).
 */
export class OpenApiDisplayLabels {
  /** Root property a Body schema is wrapped under in its nested viewer (AsyncAPI parity; `OpenApiMediaTypeSchema`). */
  public static readonly WRAPPED_BODY_SCHEMA_TITLE = 'Type'
  /** Section titles: Request (h2), Responses (h2), Body (h3, request and response), a response's Headers (h3). */
  public static readonly REQUEST_TITLE = 'Request'
  public static readonly RESPONSES_TITLE = 'Responses'
  public static readonly BODY_TITLE = 'Body'
  public static readonly RESPONSE_HEADERS_TITLE = 'Headers'

  public static parameterGroupTitle(location: OpenApiParameterLocation): string {
    return PARAMETER_GROUP_TITLES[location]
  }
}
