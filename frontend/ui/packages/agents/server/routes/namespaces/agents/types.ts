export type Cron = string
export type Schedules = Cron[]
export type Emails = string[]

export type AgentsDto = ReadonlyArray<{
  agentDeploymentCloud: string
  agentDeploymentNamespace: string
  agentId: string
  agentUrl: string
  backendVersion: string
  frontendVersion: string
  lastActive: string
  status: string
  name: string
}>
