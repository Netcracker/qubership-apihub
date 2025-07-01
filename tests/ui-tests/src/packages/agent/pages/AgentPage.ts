import { type Page, test as report } from '@playwright/test'
import { MainPage } from '@shared/pages/MainPage'
import type { GotoOptions } from '@shared/entities'
import { Autocomplete } from '@shared/components/base'
import { AgentAutomationTab } from './AgentPage/AgentAutomationTab'
import { AgentServicesTab } from './AgentPage/AgentServicesTab'
import { AgentSnapshotsTab } from './AgentPage/AgentSnapshotsTab'
import { AgentReportsTab } from './AgentPage/AgentReportsTab'
import type { AgentConfig } from '@agent/entities'

export class AgentPage extends MainPage {

  readonly cloudAc = new Autocomplete(this.page.getByTestId('AgentsSelector'), 'Cloud')
  readonly namespaceAc = new Autocomplete(this.page.getByTestId('NamespaceSelector'), 'Namespace')
  readonly workspaceAc = new Autocomplete(this.page.getByTestId('WorkspaceSelector'), 'Workspace')
  readonly servicesTab = new AgentServicesTab(this.page)
  readonly snapshotsTab = new AgentSnapshotsTab(this.page)
  readonly automationTab = new AgentAutomationTab(this.page)
  readonly reportsTab = new AgentReportsTab(this.page)

  constructor(readonly page: Page) {
    super(page)
  }

  async goto(url?: string, options?: GotoOptions): Promise<void> {
    if (url) {
      await super.goto(url, options)
    } else {
      await this.navigationStep('Go to the "Agent" page', '/agents')
    }
  }

  async selectCloud(cloudName: string): Promise<void> {
    await this.openCloudSelect()
    await report.step(`Select "${cloudName}" cloud`, async () => {
      await this.cloudAc.getListItem(cloudName).click()
    })
  }

  async selectNamespace(namespaceName: string): Promise<void> {
    await this.openNamespaceSelect()
    await report.step(`Select "${namespaceName}" namespace`, async () => {
      await this.namespaceAc.getListItem(namespaceName).click()
    })
  }

  async gotoServicesTab(config?: AgentConfig): Promise<void> {
    const agentRoute = this.getAgentRoute(config)
    await report.step('Navigate to the "Services" tab', async () => {
      await this.goto(agentRoute)
    })
  }

  async gotoAuthReportTab(config?: AgentConfig): Promise<void> {
    const agentRoute = this.getAgentRoute({ ...config, tab: 'security/authentication-report' })
    await report.step('Navigate to the "Authentication Check Report" tab', async () => {
      await this.goto(agentRoute)
    })
  }

  async gotoGatewayReportTab(config?: AgentConfig): Promise<void> {
    const agentRoute = this.getAgentRoute({ ...config, tab: 'security/routing-report' })
    await report.step('Navigate to the "Gateway Routing Report" tab', async () => {
      await this.goto(agentRoute)
    })
  }

  private async openCloudSelect(): Promise<void> {
    await report.step('Open \'Cloud\' select', async () => {
      await this.cloudAc.click()
    })
  }

  private async openNamespaceSelect(): Promise<void> {
    await report.step('Open \'Namespace\' select', async () => {
      await this.namespaceAc.click()
    })
  }

  private getAgentRoute(config?: AgentConfig): string {
    const cloud = config?.cloud // || TEST_CLOUD
    const namespace = config?.namespace // || TEST_NAMESPACE_1
    const workspaceId = config?.workspaceId // || A_WS_IMM.packageId
    const tab = config?.tab || 'services'
    return `/agents/${cloud}/${namespace}/${tab}?workspace=${workspaceId}`
  }
}
