import type { PromoteConfig } from '@agent/entities'
import { DRAFT_VERSION_STATUS_TITLE, RELEASE_VERSION_STATUS_TITLE } from '@shared/entities'
import { requireEnv } from '@test-setup'

export const TEST_CLOUD = requireEnv('AGENT_TEST_CLOUD')

// For Full E2E and Reports scopes (running discovery)
export const TEST_NAMESPACE_1 = 'api-hub-ci'
// For General, Discovery, Snapshots, Validation, Promote, History scopes
export const TEST_NAMESPACE_2 = 'api-hub-preprod'

export const SEARCH_NAMESPACE = {
  queryPart1: 'api-',
  queryPart2: 'hub-ci',
  queryPart3: 'hub',
  targetNamespace: 'api-hub-ci',
  hiddenNamespace: 'default',
}

export const TEST_SERVICE = 'apihub-agent-test-service'
export const TEST_SERVICE2 = 'apihub-backend'

export const TEST_SERVICE_LABEL = 'app.kubernetes.io/part-of: APIHUB'

export const SEARCH_SERVICE_LABEL = 'app.kubernetes.io/part-of: APIHUB'

export const TEST_DOC = 'Petstore'

export const VERSIONS_FOR_PROMOTE: Record<string, PromoteConfig> = {
  VERSION_DRAFT: {
    version: 'draft-version',
    status: DRAFT_VERSION_STATUS_TITLE,
    services: [TEST_SERVICE],
  },
  VERSION_DRAFT_SERVICE_2: {
    version: 'draft-version-service2',
    status: DRAFT_VERSION_STATUS_TITLE,
    services: [TEST_SERVICE2],
  },
  VERSION_DRAFT_ALL_SERVICES: {
    version: 'draft-version-all-services',
    status: DRAFT_VERSION_STATUS_TITLE,
    allServices: true,
  },
  VERSION_RELEASE: {
    version: '2099.1',
    status: RELEASE_VERSION_STATUS_TITLE,
    services: [TEST_SERVICE],
  },
  VERSION_RELEASE_INCORRECT: {
    version: '2099.5',
    status: RELEASE_VERSION_STATUS_TITLE,
    services: [TEST_SERVICE],
  },
  VERSION_RELEASE_ALL_SERVICES: {
    version: '2099.2',
    status: RELEASE_VERSION_STATUS_TITLE,
    allServices: true,
  },
}
