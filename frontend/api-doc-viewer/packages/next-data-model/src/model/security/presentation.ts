import { SecurityDisplayLabels } from "./display/labels"
import { SecurityNodeVisibility } from "./node-visibility"

/**
 * What a Security section presenter needs from its API type: the labels and the row visibility.
 * One instance per API type (`OPENAPI_SECURITY_PRESENTATION`, `ASYNC_API_SECURITY_PRESENTATION`).
 */
export type SecurityPresentation = {
  readonly labels: SecurityDisplayLabels
  readonly visibility: SecurityNodeVisibility
}
