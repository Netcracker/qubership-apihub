export const SERVICES_PAGE = 'services'
export const SNAPSHOTS_PAGE = 'snapshots'
export const AUTOMATION_PAGE = 'automation'
export const SECURITY_REPORTS_PAGE = 'security'

export const AUTHENTICATION_REPORTS_PAGE = 'authentication-report'

export const ROUTING_REPORTS_PAGE = 'routing-report'

export const AGENT_PAGE_PATH_PATTERN = '/agents/:agentId'
export const NAMESPACE_PAGE_PATH_PATTERN = '/agents/:agentId/:namespaceId'

export type NamespacePageRoute =
  | typeof SERVICES_PAGE
  | typeof SNAPSHOTS_PAGE
  | typeof AUTOMATION_PAGE
  | typeof SECURITY_REPORTS_PAGE
