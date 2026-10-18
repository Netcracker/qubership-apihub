import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { COMPLETE_PUBLISH_STATUS } from '@shared/entities'
import { SUCCESS_STEP_STATUS } from '@agent/entities'
import { AgentPage } from '@agent/pages'
import { DISCOVERY_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  A_WS_N,
  SNAPSHOT_E2E_NO_BASELINE,
  SNAPSHOT_E2E_NO_BASELINE_SERVICE_2,
  TEST_CLOUD,
  TEST_DOC,
  TEST_NAMESPACE_1,
  TEST_SERVICE,
  TEST_SERVICE2,
  TEST_SERVICE_1_VAR,
  TEST_SERVICE_LABEL,
  VERSIONS_FOR_PROMOTE,
} from '@test-data/agent'
import { SYSADMIN, TEST_CLOUD_ADMIN } from '@test-data'
import { getSysConfig } from '@test-data/props'

test.describe('09. Full E2E', async () => {
  test('[A-DRP-1] Promote version after Re-Discovery',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3429` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3558` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8678` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      const testWorkspace = A_WS_N
      const testService1 = TEST_SERVICE_1_VAR
      const testWorkspaceFullName = `${testWorkspace.name} ${testWorkspace.packageId}`

      const { VERSION_DRAFT, VERSION_DRAFT_SERVICE_2 } = VERSIONS_FOR_PROMOTE

      await test.step('Go to the Agent page', async () => {
        await agentPage.goto()
        await agentPage.selectCloud(TEST_CLOUD)

        await expect.soft(agentPage.cloudAc).toHaveValue(TEST_CLOUD)

        await agentPage.selectNamespace(TEST_NAMESPACE_1)

        await expect.soft(agentPage.namespaceAc).toHaveValue(TEST_NAMESPACE_1)

        await agentPage.workspaceAc.set(testWorkspaceFullName, { clearBefore: true })

        await expect.soft(agentPage.workspaceAc).toHaveValue(testWorkspace.name)
        await expect.soft(agentPage.servicesTab).toBeVisible()
        await expect.soft(agentPage.snapshotsTab).toBeVisible()
        await expect.soft(stepper.discoverIndicator.icon).toBeVisible()
        await expect.soft(stepper.discoverIndicator.icon).toHaveClass(/Mui-active/)
        await expect.soft(stepper.snapshotIndicator.icon).toBeVisible()
        await expect.soft(stepper.snapshotIndicator.icon).toHaveClass(/Mui-disabled/)
        await expect.soft(stepper.validationIndicator.icon).toBeVisible()
        await expect.soft(stepper.validationIndicator.icon).toHaveClass(/Mui-disabled/)
        await expect.soft(stepper.promoteIndicator.icon).toBeVisible()
        await expect.soft(stepper.promoteIndicator.icon).toHaveClass(/Mui-disabled/)
        await expect.soft(servicesTab.searchBar).toBeVisible()
      })

      await test.step('Run Discovery (automatically after  workspace changing)', async () => {
        const { defaultWorkspaceId } = await getSysConfig()

        if (!defaultWorkspaceId) {
          await servicesTab.discoverIfNot()
        }

        await expect(stepper.discoverIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: DISCOVERY_TIMEOUT })
        await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
        await expect.soft(stepper.nextBtn).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).labelsCell).toContainText(TEST_SERVICE_LABEL)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).baselinePackageCell).toHaveText(testService1.baselinePackage!)
        await expect(servicesTab.getDocRow(TEST_DOC)).toBeHidden()
      })

      await test.step('Promote Version (Service 1)', async () => {
        await servicesTab.gotoPromoteFromDiscover(SNAPSHOT_E2E_NO_BASELINE)
        await servicesTab.promoteVersion(VERSION_DRAFT)

        await expect(servicesTab.rePromoteVersionBtn).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      })

      await test.step('Navigate to the "Discover Services" step', async () => {
        await stepper.backBtn.click()

        await expect(servicesTab.noBwcErrorsBtn).toBeVisible()

        await stepper.backBtn.click()

        await expect(servicesTab.resetBtn).toBeVisible()

        await stepper.backBtn.click()

        await expect(servicesTab.restartDiscoveryBtn).toBeVisible()
      })

      await test.step('Promote Version (Service 2)', async () => {
        await servicesTab.restartDiscovery()
        await servicesTab.gotoPromoteFromDiscover(SNAPSHOT_E2E_NO_BASELINE_SERVICE_2)
        await servicesTab.promoteVersion(VERSION_DRAFT_SERVICE_2)

        await expect(servicesTab.rePromoteVersionBtn).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      })
    })
})

test.describe('08. Security Reports', () => {

  const config = { namespace: TEST_NAMESPACE_1 }

  test.skip('[A-GRR-1.1] Create Gateway Routing report',
    {
      tag: ['@smoke', '@specific'],
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8458` },
        { type: 'Skip', description: 'URL does not set automatically' },
      ],
    },
    async ({ sysadminPage: page }) => {
      test.skip(!process.env.TEST_CLOUD_ADMIN_NAME, 'Test environment is not configured for Gateway Routing report testing')

      const agentPage = new AgentPage(page)
      const { reportsTab } = agentPage
      const { runGatewayReportDialog } = reportsTab

      await test.step('Navigate to the "Gateway Routing Report" tab', async () => {
        await agentPage.gotoServicesTab(config)
        await agentPage.reportsTab.click()
        await reportsTab.gatewayReportTabBtn.click()
      })

      await test.step('Run Report', async () => {
        await reportsTab.runReportBtn.click()
        await runGatewayReportDialog.fillForm({ username: TEST_CLOUD_ADMIN.name, password: TEST_CLOUD_ADMIN.password })
        await runGatewayReportDialog.runReportBtn.click()

        await expect(reportsTab.getReportRow(1).statusCell).toHaveText('running')
        await expect(reportsTab.getReportRow(1).dateCell).not.toBeEmpty()
        await expect(reportsTab.getReportRow(1).createByCell).toHaveText(SYSADMIN.name)
        await expect(reportsTab.getReportRow(1).totalServicesCell).not.toBeEmpty()
        await expect(reportsTab.getReportRow(1).processedServicesCell).not.toBeEmpty()
      })

      await test.step('Download Report', async () => {
        const file = await reportsTab.getReportRow(1).downloadGatewayReport()

        await expectFile(file).toHaveName(`IN PROGRESS_${config.namespace} gateway routing report.xlsx`)
      })
    })

  test.skip('[A-GRR-1.2-N] Start Gateway Routing check process with missing fields (Negative)',
    {
      tag: '@specific',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8458` },
        { type: 'Skip', description: 'URL does not set automatically' },
      ],
    },
    async ({ sysadminPage: page }) => {
      test.skip(!process.env.TEST_CLOUD_ADMIN_NAME, 'Test environment is not configured for Gateway Routing report testing')

      const agentPage = new AgentPage(page)
      const { reportsTab } = agentPage
      const { runGatewayReportDialog } = reportsTab

      await test.step('Run Report without "Identity Provider URL"', async () => {
        await agentPage.gotoGatewayReportTab(config)
        await reportsTab.runReportBtn.click()
        await runGatewayReportDialog.idpUrlTxtFld.clear()
        await runGatewayReportDialog.fillForm({ username: TEST_CLOUD_ADMIN.name, password: TEST_CLOUD_ADMIN.password })
        await runGatewayReportDialog.runReportBtn.click()

        await expect(runGatewayReportDialog.idpUrlTxtFld).toBeFocused()
        await expect(runGatewayReportDialog.idpUrlTxtFld).toBeEmpty()
      })

      await test.step('Run Report without "Username"', async () => {
        await agentPage.gotoGatewayReportTab()
        await reportsTab.runReportBtn.click()
        await runGatewayReportDialog.fillForm({ password: TEST_CLOUD_ADMIN.password })
        await runGatewayReportDialog.runReportBtn.click()

        await expect(runGatewayReportDialog.usernameTxtFld).toBeFocused()
        await expect(runGatewayReportDialog.usernameTxtFld).toBeEmpty()
      })

      await test.step('Run Report without "Password"', async () => {
        await agentPage.gotoGatewayReportTab()
        await reportsTab.runReportBtn.click()
        await runGatewayReportDialog.fillForm({ username: TEST_CLOUD_ADMIN.name })
        await runGatewayReportDialog.runReportBtn.click()

        await expect(runGatewayReportDialog.passwordTxtFld).toBeFocused()
        await expect(runGatewayReportDialog.passwordTxtFld).toBeEmpty()
      })
    })

  test('[A-ACR-2.1] Create Authentication Check report',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8461` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { reportsTab } = agentPage

      await test.step('Navigate to the "Authentication Check Report" tab', async () => {
        await agentPage.gotoAuthReportTab(config)
      })

      await test.step('Run Report', async () => {
        await reportsTab.runReportBtn.click()

        await expect(reportsTab.getReportRow(1).statusCell).toHaveText('running')
        await expect(reportsTab.getReportRow(1).dateCell).not.toBeEmpty()
        await expect(reportsTab.getReportRow(1).createByCell).toHaveText(SYSADMIN.name)
        await expect(reportsTab.getReportRow(1).totalServicesCell).not.toBeEmpty()
        await expect(reportsTab.getReportRow(1).processedServicesCell).not.toBeEmpty()
      })

      await test.step('Download Report', async () => {
        const file = await reportsTab.getReportRow(1).downloadAuthReport()

        await expectFile(file).toHaveName(`IN PROGRESS_${config.namespace} authentication security report.xlsx`)
      })

      // TODO: Investigate why this step is commented out and determine whether it is still required.
      /*await test.step('Wait for Discovery', async () => {
        await agentPage.servicesTabBtn.click()
        await agentPage.reload()

        await expect(agentPage.servicesTab.discoverStep.restartDiscoveryBtn).toBeVisible({ timeout: LONG_EXPECT })
      })*/
    })
})
