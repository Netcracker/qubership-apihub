import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { AgentPage } from '@agent/pages'
import { LONG_EXPECT, TICKET_BASE_URL } from '@test-setup'
import {
  SEARCH_SERVICE_LABEL,
  TEST_DOC,
  TEST_NAMESPACE_2,
  TEST_SERVICE,
  TEST_SERVICE2,
  TEST_SERVICE_1,
  TEST_SERVICE_2_IMM,
} from '@test-data/agent'
import { VersionPackagePage } from '@portal/pages/PortalPage/VersionPage/VersionPackagePage'
import { isLocalHost } from '@services/utils'

test.describe('02. Discover Services and Docs', () => {
  const config = { namespace: TEST_NAMESPACE_2 }
  const testService2 = TEST_SERVICE_2_IMM

  test('[A-DSC-2] Service search at the Discovery step',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6378` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await agentPage.gotoServicesTab(config)
      await servicesTab.discoverIfNot()

      await test.step(`Enter the "${TEST_SERVICE}" service name to the 'Searchbar'`, async () => {
        await servicesTab.searchBar.type(TEST_SERVICE)

        await expect.soft(servicesTab.getServiceRow()).toHaveCount(1)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      })

      await test.step('Clear search query', async () => {
        await servicesTab.searchBar.clear()

        await expect(servicesTab.searchBar).toBeEmpty()
      })

      await test.step(`Enter the "${SEARCH_SERVICE_LABEL}" label to the 'Searchbar'`, async () => {
        await servicesTab.searchBar.type(SEARCH_SERVICE_LABEL)

        await expect.soft(servicesTab.getServiceRow()).toHaveCount(1)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      })

      await test.step('Clear search query', async () => {
        await servicesTab.searchBar.clear()

        await expect(servicesTab.searchBar).toBeEmpty()
      })

      await test.step(`Enter the "${testService2.packageId}" Baseline Package ID to the 'Searchbar'`, async () => {
        await servicesTab.searchBar.fill(testService2.packageId)

        await expect.soft(servicesTab.getServiceRow()).toHaveCount(1)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2)).toBeVisible()
      })

      await test.step('Clear search query', async () => {
        await servicesTab.searchBar.clear()

        await expect(servicesTab.searchBar).toBeEmpty()
      })

      await test.step(`Enter the "${testService2.name}" Baseline Package Name to the 'Searchbar'`, async () => {
        await servicesTab.searchBar.fill(testService2.name)

        await expect.soft(servicesTab.getServiceRow()).toHaveCount(1)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2)).toBeVisible()
      })
    })

  test('[A-DSC-3] Navigation to the package in the APIHUB at the Discovery step',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6379` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await agentPage.gotoServicesTab(config)
      await servicesTab.discoverIfNot()

      if (!isLocalHost()) {
        await test.step(`Navigate to the "${TEST_SERVICE}" package in APIHUB`, async () => {

          const context = page.context()
          const pagePromise = context.waitForEvent('page')

          await servicesTab.getServiceRow(TEST_SERVICE).viewPackage()

          const newPage = await pagePromise
          const packagePage = new VersionPackagePage(newPage)

          await expect.soft(packagePage.toolbar.title).toHaveText(TEST_SERVICE_1.name)
        })
      }
    })

  test('[A-DSC-4] The OpenAPI document opening at the Discovery step',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6380` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { specViewPopup } = servicesTab

      await agentPage.gotoServicesTab(config)
      await servicesTab.discoverIfNot()

      await test.step(`Open "${TEST_DOC}" OpenAPI document`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).expandBtn.click()
        await servicesTab.getDocRow(TEST_DOC).link.click()

        await expect(specViewPopup.apiSpecView).toBeVisible({ timeout: LONG_EXPECT })
      })

      await test.step('Switch to \'Raw\' view', async () => {
        await specViewPopup.rawBtn.click()

        await expect.soft(specViewPopup.rawView).toBeVisible({ timeout: LONG_EXPECT })
      })

      await test.step('Switch to \'Doc\' view', async () => {
        await specViewPopup.docBtn.click()

        await expect.soft(specViewPopup.apiSpecView).toBeVisible({ timeout: LONG_EXPECT })
      })

      await test.step('Close \'Spec view\' popup', async () => {
        await specViewPopup.closeBtn.click()

        await expect(servicesTab.restartDiscoveryBtn).toBeVisible()
        await expect(specViewPopup.closeBtn).not.toBeVisible()
      })
    })
})

test.describe('Specific functionality', () => {
  const config = { namespace: TEST_NAMESPACE_2 }

  test('Navigate to the Automation tab', {
    tag: '@smoke',
  }, async ({ sysadminPage: page }) => {
    const agentPage = new AgentPage(page)
    const { automationTab } = agentPage

    await agentPage.gotoServicesTab(config)

    await expect.soft(automationTab).toBeVisible()

    await test.step('Navigate to the "Automation" tab', async () => {
      await automationTab.click()

      await expect.soft(automationTab.title).toHaveText('Automation')
    })
  })

  test('Navigate to the Gateway Routing Report tab', {
    tag: '@smoke',
  }, async ({ sysadminPage: page }) => {
    const agentPage = new AgentPage(page)
    const { reportsTab } = agentPage

    await agentPage.gotoServicesTab(config)

    await test.step('Navigate to the "Security Reports" tab', async () => {
      await reportsTab.click()

      await expect.soft(reportsTab.gatewayReportTabBtn).toBeVisible()
    })

    await test.step('Navigate to the "Gateway Routing Report" tab', async () => {
      await reportsTab.gatewayReportTabBtn.click()

      await expect(reportsTab.runReportBtn).toBeEnabled()
    })
  })
})
