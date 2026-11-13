/*
 * Wording of the Agent tab titles: the app name, page names and tab names.
 * The order of the parts is in `pageTitles.ts`; separators are common to all apps
 * (`@netcracker/qubership-apihub-ui-shared/utils/document-title-labels`).
 */

import {
  AUTHENTICATION_REPORTS_PAGE,
  AUTOMATION_PAGE,
  ROUTING_REPORTS_PAGE,
  SERVICES_PAGE,
  SNAPSHOTS_PAGE,
} from './routes'

/** A namespace tab as the title names it: a security report tab replaces the Security Reports tab. */
export type NamespaceTitleTab =
  | typeof SERVICES_PAGE
  | typeof SNAPSHOTS_PAGE
  | typeof AUTOMATION_PAGE
  | typeof AUTHENTICATION_REPORTS_PAGE
  | typeof ROUTING_REPORTS_PAGE

export const AGENTS_APP_NAME = 'APIHUB Agent'

export const PAGE_TITLE_LABELS = {
  selectNamespace: 'Select Namespace',
  selectWorkspace: 'Select Workspace',
} as const

export const NAMESPACE_TAB_TITLES: Record<NamespaceTitleTab, string> = {
  [SERVICES_PAGE]: 'Services',
  [SNAPSHOTS_PAGE]: 'Snapshots',
  [AUTOMATION_PAGE]: 'Automation',
  [AUTHENTICATION_REPORTS_PAGE]: 'Authentication Report',
  [ROUTING_REPORTS_PAGE]: 'Routing Report',
}
