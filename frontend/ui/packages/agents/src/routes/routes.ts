/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
