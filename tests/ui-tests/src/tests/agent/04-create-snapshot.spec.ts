import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { AGENT_SUCCESS_STATUS_ICON, COMPLETE_PUBLISH_STATUS } from '@shared/entities'
import { SUCCESS_STEP_STATUS } from '@agent/entities'
import { AgentPage } from '@agent/pages'
import { VersionPackagePage } from '@portal/pages/PortalPage/VersionPage/VersionPackagePage'
import { LONG_EXPECT, SNAPSHOT_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  SEARCH_SERVICE_LABEL,
  SNAPSHOT_NO_BASELINE,
  SNAPSHOT_NO_CHANGES,
  TEST_DOC,
  TEST_NAMESPACE_2,
  TEST_SERVICE,
  TEST_SERVICE2,
  TEST_SERVICE_1_IMM,
  TEST_SERVICE_2_IMM,
  TEST_SERVICE_LABEL,
} from '@test-data/agent'
import { isLocalHost } from '@services/utils'

test.describe('03. Create Snapshot', () => {
  const config = { namespace: TEST_NAMESPACE_2 }
  const testService1 = TEST_SERVICE_1_IMM
  const testService2 = TEST_SERVICE_2_IMM

  test('[E2E-A-SNP-1-N] Snapshot Name = none. Baseline = no-changes. All services.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3652` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_CHANGES

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step('Select All services', async () => {
        await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

        await servicesTab.allServicesCbx.click()

        await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
      })
    })

  test('[E2E-A-SNP-2-N] Snapshot Name = none. Baseline = no-changes. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3655` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_CHANGES

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step(`Select "${TEST_SERVICE}" service`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).checkbox.click()

        await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
      })
    })

  test('[E2E-A-SNP-3-N] Snapshot Name = any_name. Baseline = none. All services.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3658` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_CHANGES

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
        await servicesTab.baselineAc.focus()
      })

      await test.step('Select All services', async () => {
        await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

        await servicesTab.allServicesCbx.click()

        await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
      })
    })

  test('[E2E-A-SNP-4-N] Snapshot Name = any_name. Baseline = none. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3614` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_CHANGES

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
        await servicesTab.baselineAc.focus()
      })

      await test.step(`Select "${TEST_SERVICE}" service`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).checkbox.click()

        await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
      })
    })

  test('[E2E-A-SNP-5] Snapshot: Re-mark all services.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3631` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_BASELINE

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
      })

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step('Select All services', async () => {
        await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

        await servicesTab.allServicesCbx.click()

        await expect(servicesTab.createSnapshotBtn).toBeEnabled()
        await expect(servicesTab.allServicesCbx).toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE2).checkbox).toBeChecked()
      })

      await test.step('Reset snapshot creation', async () => {
        await servicesTab.resetBtn.click()

        await expect(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect(servicesTab.allServicesCbx).not.toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).not.toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE2).checkbox).not.toBeChecked()
      })

      await test.step('Select All services', async () => {
        await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

        await servicesTab.allServicesCbx.click()

        await expect(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect(servicesTab.allServicesCbx).toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE2).checkbox).toBeChecked()
      })

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
      })

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step(`Create "${snapshot.name}" snapshot`, async () => {
        await servicesTab.createSnapshotBtn.click()

        await expect(stepper.snapshotIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
        await expect.soft(stepper.backBtn).toBeEnabled()
        await expect.soft(stepper.nextBtn).toBeEnabled()
      })
    })

  test('[E2E-A-SNP-6] Snapshot: Change service.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3636` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_BASELINE

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
      })

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step(`Select "${TEST_SERVICE2}" service`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE2).checkbox.click()

        await expect(servicesTab.createSnapshotBtn).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).checkbox).toBeChecked()
      })

      await test.step('Reset snapshot creation', async () => {
        await servicesTab.resetBtn.click()

        await expect(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).checkbox).not.toBeChecked()
      })

      await test.step(`Select "${TEST_SERVICE}" service`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).checkbox.click()

        await expect(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
      })

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
      })

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step(`Create "${snapshot.name}" snapshot`, async () => {
        await servicesTab.createSnapshotBtn.click()

        await expect(stepper.snapshotIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
        await expect.soft(stepper.backBtn).toBeEnabled()
        await expect.soft(stepper.nextBtn).toBeEnabled()
      })
    })

  test('[E2E-A-SNP-7] Snapshot: Reset after Snapshot creation. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3642` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab
      const snapshot = SNAPSHOT_NO_BASELINE

      await servicesTab.gotoSnapshotStep(config)

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
      })

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step(`Select "${TEST_SERVICE}" service`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).checkbox.click()

        await expect(servicesTab.createSnapshotBtn).toBeEnabled()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
        await expect(servicesTab.allServicesCbx).toHaveAttribute('data-indeterminate', 'true')
      })

      await test.step(`Create "${snapshot.name}" snapshot`, async () => {
        await servicesTab.createSnapshotBtn.click()

        await expect(stepper.snapshotIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
        await expect.soft(servicesTab.resetBtn).toBeEnabled()
        await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(stepper.nextBtn).toBeEnabled()
        await expect(servicesTab.snapshotNameAc).toBeDisabled()
        await expect(servicesTab.baselineAc).toBeDisabled()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeDisabled()
        await expect(servicesTab.allServicesCbx).toBeDisabled()
      })

      await test.step('Reset snapshot creation', async () => {
        await servicesTab.resetBtn.click()

        await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
        await expect(servicesTab.snapshotNameAc).toBeEmpty()
        await expect(servicesTab.snapshotNameAc).toBeEnabled()
        await expect(servicesTab.baselineAc).toBeEmpty()
        await expect(servicesTab.baselineAc).toBeEnabled()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).not.toBeChecked()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeEnabled()
        await expect(servicesTab.allServicesCbx).not.toBeChecked()
        await expect(servicesTab.allServicesCbx).toBeEnabled()
      })

      await test.step(`Fill 'Snapshot Name' with "${snapshot.name}"`, async () => {
        await servicesTab.snapshotNameAc.fill(snapshot.name)
      })

      await test.step(`Select "${snapshot.baseline}" Baseline`, async () => {
        await servicesTab.baselineAc.set(snapshot.baseline)
      })

      await test.step(`Select "${TEST_SERVICE}" service`, async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).checkbox.click()
      })

      await test.step(`Create "${snapshot.name}" snapshot`, async () => {
        await servicesTab.createSnapshotBtn.click()

        await expect(stepper.snapshotIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
        await expect.soft(stepper.backBtn).toBeEnabled()
        await expect.soft(stepper.nextBtn).toBeEnabled()
      })
    })

  test('[A-SNP-1] Navigation to the \'Create Snapshot\' step',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6381` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoSnapshotStep(config)

      await expect(servicesTab.createSnapshotBtn).toBeVisible()
      await expect.soft(stepper.discoverIndicator.icon).toBeVisible()
      await expect.soft(stepper.discoverIndicator.icon).toHaveClass(/Mui-completed/)
      await expect.soft(stepper.snapshotIndicator.icon).toBeVisible()
      await expect.soft(stepper.snapshotIndicator.icon).toHaveClass(/Mui-active/)
      await expect.soft(stepper.validationIndicator.icon).toBeVisible()
      await expect.soft(stepper.validationIndicator.icon).toHaveClass(/Mui-disabled/)
      await expect.soft(stepper.promoteIndicator.icon).toBeVisible()
      await expect.soft(stepper.promoteIndicator.icon).toHaveClass(/Mui-disabled/)
      await expect.soft(stepper.backBtn).toBeEnabled()
      await expect.soft(stepper.nextBtn).toBeDisabled()
      await expect.soft(servicesTab.snapshotNameAc).toBeVisible()
      await expect.soft(servicesTab.baselineAc).toBeVisible()
      await expect.soft(servicesTab.resetBtn).toBeEnabled()
      await expect.soft(servicesTab.createSnapshotBtn).toBeDisabled()
      await expect.soft(servicesTab.searchBar).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).labelsCell).toContainText(TEST_SERVICE_LABEL)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).baselinePackageCell).toHaveText(testService1.baselinePackage!)

      await servicesTab.getServiceRow(TEST_SERVICE).expandBtn.click()

      await expect(servicesTab.getDocRow(TEST_DOC)).toBeVisible()

      await servicesTab.getServiceRow(TEST_SERVICE).collapseBtn.click()

      await expect(servicesTab.getDocRow(TEST_DOC)).not.toBeVisible()
    })

  test('[A-SNP-2] Service search at the Create Snapshot step',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6382` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await servicesTab.gotoSnapshotStep(config)

      await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

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

      await test.step('Select service during search', async () => { //Cover TestCase-B-492
        await servicesTab.searchBar.clear()
        await servicesTab.searchBar.fill(TEST_SERVICE)
        await servicesTab.getServiceRow(TEST_SERVICE).checkbox.click()
        await servicesTab.searchBar.clear()

        await expect(servicesTab.getServiceRow(TEST_SERVICE2)).toBeVisible()
        await expect(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
      })
    })

  test('[A-SNP-3] Navigation to the Snapshot package in the APIHUB at the Create Snapshot step',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6383` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const snapshot = SNAPSHOT_NO_BASELINE

      await servicesTab.gotoSnapshotStep(config)

      await servicesTab.createSnapshot(snapshot)

      if (!isLocalHost()) {
        await test.step(`Navigate to the "${snapshot.name}" snapshot in the APIHUB`, async () => {

          const context = page.context()
          const pagePromise = context.waitForEvent('page')

          await servicesTab.getServiceRow(TEST_SERVICE).viewSnapshot()

          const newPage = await pagePromise
          const packagePage = new VersionPackagePage(newPage)

          await expect.soft(packagePage.toolbar.title).toHaveText(TEST_SERVICE)
          await expect(packagePage.toolbar.versionSlt).toHaveText(snapshot.name)
        })
      }
    })

  test('[A-SNP-4] The OpenAPI document opening at the Create Snapshot step',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6384` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { specViewPopup } = servicesTab

      await servicesTab.gotoSnapshotStep(config)

      await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

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

        await expect(servicesTab.createSnapshotBtn).toBeVisible()
        await expect(specViewPopup.closeBtn).not.toBeVisible()
      })
    })
})
