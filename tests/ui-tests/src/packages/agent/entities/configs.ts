import type { AgentVersionStatusTitles } from './statuses'

export interface SnapshotConfig {
  name: string
  baseline: string
  services?: string[]
  allServices?: boolean
}

export interface PromoteConfig {
  version: string
  status: AgentVersionStatusTitles
  services?: string[]
  allServices?: boolean
}

export interface AgentConfig {
  cloud?: string
  namespace?: string
  workspaceId?: string
  tab?: AgentTab
}

type AgentTab = 'services'
  | 'snapshots'
  | 'automation'
  | 'security/authentication-report'
  | 'security/routing-report'
