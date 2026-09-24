import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import {
  AGENT_ERROR_STATUS_ICON,
  AGENT_SUCCESS_STATUS_ICON,
  AGENT_WARNING_STATUS_ICON,
  COMPLETE_PUBLISH_STATUS,
  DRAFT_VERSION_STATUS_TITLE,
} from '@shared/entities'
import {
  BACKWARD_INCOMPATIBLE_MSG,
  BASELINE_VERSION_NOT_FOUND_MSG,
  INCORRECT_RELEASE_VERSION_FORMAT_MSG,
  SUCCESS_STEP_STATUS,
} from '@agent/entities'
import { AgentPage } from '@agent/pages'
import { VersionPackagePage } from '@portal/pages/PortalPage/VersionPage/VersionPackagePage'
import { SNAPSHOT_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  SEARCH_SERVICE_LABEL,
  SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES,
  SNAPSHOT_PRM_NO_BASELINE,
  SNAPSHOT_PRM_TWO_SERVICES,
  TEST_NAMESPACE_2,
  TEST_SERVICE,
  TEST_SERVICE2,
  TEST_SERVICE_1_IMM,
  TEST_SERVICE_2_IMM,
  TEST_SERVICE_LABEL,
  VERSIONS_FOR_PROMOTE,
} from '@test-data/agent'
import { TOOLTIP_SEVERITY_MSG } from '@test-data/shared'
import { isLocalHost } from '@services/utils'

test.describe('05. Promote Version', () => {
  const config = { namespace: TEST_NAMESPACE_2 }
  const testService1 = TEST_SERVICE_1_IMM
  const testService2 = TEST_SERVICE_2_IMM
  const {
    VERSION_DRAFT_ALL_SERVICES,
    VERSION_DRAFT,
    VERSION_RELEASE,
    VERSION_RELEASE_INCORRECT,
    VERSION_RELEASE_ALL_SERVICES,
  } = VERSIONS_FOR_PROMOTE

  test('[E2E-A-PRM-1] Promote: Draft. All services.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3641` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES, config)

      await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

      await servicesTab.promoteVersion(VERSION_DRAFT_ALL_SERVICES)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
      await expect.soft(stepper.backBtn).toBeEnabled()
      await expect(servicesTab.rePromoteVersionBtn).toBeEnabled()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
    })

  test('[E2E-A-PRM-2] Promote: Draft. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3646` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await test.step('Navigate to the Promote step', async () => {
        await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES, config)

        await expect.soft(stepper.backBtn).toBeEnabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
        await expect.soft(servicesTab.promoteVersionBtn).toBeDisabled()
        await expect.soft(servicesTab.searchBar).toBeVisible()
        await expect.soft(stepper.discoverIndicator.icon).toHaveClass(/Mui-completed/)
        await expect.soft(stepper.snapshotIndicator.icon).toHaveClass(/Mui-completed/)
        await expect.soft(stepper.validationIndicator.icon).toHaveClass(/Mui-completed/)
        await expect.soft(stepper.promoteIndicator.icon).toHaveClass(/Mui-active/)
        await expect.soft(servicesTab.versionAc).toBeEnabled()
        await expect.soft(servicesTab.versionAc).toHaveValue(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES.name)
        await expect.soft(servicesTab.previousVersionAc).toBeDisabled()
        await expect.soft(servicesTab.previousVersionAc).toHaveValue(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES.baseline)
        await expect.soft(servicesTab.statusSlt).toBeEnabled()
        await expect.soft(servicesTab.statusSlt).toHaveText(DRAFT_VERSION_STATUS_TITLE)
        await expect.soft(servicesTab.onlyAvailableServicesCbx).not.toBeChecked()
        await expect.soft(servicesTab.onlyAvailableServicesCbx).toBeEnabled()
        await expect.soft(servicesTab.allServicesCbx).not.toBeChecked()
        await expect.soft(servicesTab.allServicesCbx).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).not.toBeChecked()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).labelsCell).toContainText(TEST_SERVICE_LABEL)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).baselinePackageCell).toHaveText(testService1.baselinePackage!)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_INCOMPATIBLE_MSG)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_ERROR_STATUS_ICON)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.breakingChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.riskyChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.deprecatedChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.nonBreakingChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.annotationChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.unclassifiedChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).bwcStatusCell).toHaveText(BASELINE_VERSION_NOT_FOUND_MSG)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).bwcStatusCell).toHaveIcon(AGENT_WARNING_STATUS_ICON)
      })

      await test.step('Check changes tooltips on the changes summary', async () => {
        await servicesTab.getServiceRow(TEST_SERVICE).changesCell.breakingChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.breaking)

        await servicesTab.getServiceRow(TEST_SERVICE).changesCell.riskyChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        for (const msg of TOOLTIP_SEVERITY_MSG.risky) {
          await expect.soft(agentPage.tooltip).toContainText(msg)
        }

        await servicesTab.getServiceRow(TEST_SERVICE).changesCell.deprecatedChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.deprecated)

        await servicesTab.getServiceRow(TEST_SERVICE).changesCell.nonBreakingChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.nonBreaking)

        await servicesTab.getServiceRow(TEST_SERVICE).changesCell.annotationChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.annotation)

        await servicesTab.getServiceRow(TEST_SERVICE).changesCell.unclassifiedChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.unclassified)
      })

      await test.step('Promote Version', async () => {
        await servicesTab.fillPromoteProps(VERSION_DRAFT)

        await expect.soft(stepper.backBtn).toBeEnabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
        await expect.soft(servicesTab.promoteVersionBtn).toBeEnabled()
        await expect.soft(servicesTab.versionAc).toBeEnabled()
        await expect.soft(servicesTab.versionAc).toHaveValue(VERSION_DRAFT.version)
        await expect.soft(servicesTab.previousVersionAc).toBeDisabled()
        await expect.soft(servicesTab.previousVersionAc).toHaveValue(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES.baseline)
        await expect.soft(servicesTab.statusSlt).toBeEnabled()
        await expect.soft(servicesTab.statusSlt).toHaveText(DRAFT_VERSION_STATUS_TITLE)
        await expect.soft(servicesTab.onlyAvailableServicesCbx).not.toBeChecked()
        await expect.soft(servicesTab.onlyAvailableServicesCbx).toBeEnabled()
        await expect.soft(servicesTab.allServicesCbx).toHaveAttribute('data-indeterminate', 'true')
        await expect.soft(servicesTab.allServicesCbx).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeEnabled()

        await servicesTab.promoteVersionBtn.click()

        await expect(stepper.promoteIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
        await expect.soft(stepper.backBtn).toBeEnabled()
        await expect.soft(stepper.nextBtn).toBeDisabled()
        await expect.soft(servicesTab.rePromoteVersionBtn).toBeEnabled()
        await expect.soft(servicesTab.versionAc).toBeEnabled()
        await expect.soft(servicesTab.versionAc).toHaveValue(VERSION_DRAFT.version)
        await expect.soft(servicesTab.previousVersionAc).toBeDisabled()
        await expect.soft(servicesTab.previousVersionAc).toHaveValue(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES.baseline)
        await expect.soft(servicesTab.statusSlt).toBeEnabled()
        await expect.soft(servicesTab.statusSlt).toHaveText(DRAFT_VERSION_STATUS_TITLE)
        await expect.soft(servicesTab.onlyAvailableServicesCbx).not.toBeChecked()
        await expect.soft(servicesTab.onlyAvailableServicesCbx).toBeEnabled()
        await expect.soft(servicesTab.allServicesCbx).toHaveAttribute('data-indeterminate', 'true')
        await expect.soft(servicesTab.allServicesCbx).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeChecked()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).checkbox).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
      })

      if (!isLocalHost()) {
        await test.step('Navigate to the Promoted Version in the APIHUB', async () => {

          const context = page.context()
          const pagePromise = context.waitForEvent('page')

          await servicesTab.getServiceRow(TEST_SERVICE).viewVersion()

          const newPage = await pagePromise
          const packagePage = new VersionPackagePage(newPage)

          await expect.soft(packagePage.toolbar.title).toHaveText(testService1.name)
          await expect(packagePage.toolbar.versionSlt).toHaveText(VERSION_DRAFT.version)
        })
      }
    })

  test('[E2E-A-PRM-3] Promote: Release. All services.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-2134` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES, config)

      await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()

      await servicesTab.promoteVersion(VERSION_RELEASE_ALL_SERVICES)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
      await expect.soft(stepper.backBtn).toBeEnabled()
      await expect(servicesTab.rePromoteVersionBtn).toBeEnabled()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
    })

  test('[E2E-A-PRM-4] Promote: Release. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3629` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES, config)
      await servicesTab.promoteVersion(VERSION_RELEASE)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
      await expect.soft(stepper.backBtn).toBeEnabled()
      await expect.soft(servicesTab.rePromoteVersionBtn).toBeEnabled()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)

      if (!isLocalHost()) {
        await test.step('Navigate to the Promoted Version in the APIHUB', async () => {

          const context = page.context()
          const pagePromise = context.waitForEvent('page')

          await servicesTab.getServiceRow(TEST_SERVICE).viewVersion()

          const newPage = await pagePromise
          const packagePage = new VersionPackagePage(newPage)

          await expect.soft(packagePage.toolbar.title).toHaveText(testService1.name)
          await expect(packagePage.toolbar.versionSlt).toHaveText(VERSION_RELEASE.version)
        })
      }
    })

  test('[E2E-A-PRM-5-N] Promote: Release. Incorrect Version format.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3634` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_NO_BASELINE, config)
      await servicesTab.fillPromoteProps(VERSION_RELEASE_INCORRECT)

      await expect(servicesTab.promoteVersionBtn).toBeEnabled()

      await servicesTab.promoteVersionBtn.click()

      await expect.soft(servicesTab.promoteVersionBtn).toBeEnabled()
      await expect.soft(servicesTab.versionFormatError).toHaveText(INCORRECT_RELEASE_VERSION_FORMAT_MSG)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toBeEmpty()
    })

  test('[E2E-A-PRM-6] Re-Promote: Draft. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5039` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_MULTI_CHANGES_ALL_SERVICES, config)
      await servicesTab.fillPromoteProps(VERSION_DRAFT)
      await servicesTab.promoteVersionBtn.click()

      await expect(stepper.promoteIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
      await expect.soft(stepper.backBtn).toBeEnabled()
      await expect.soft(servicesTab.rePromoteVersionBtn).toBeEnabled()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)

      await servicesTab.rePromoteVersionBtn.click()

      await expect(stepper.promoteIndicator.status).toHaveText(SUCCESS_STEP_STATUS, { timeout: SNAPSHOT_TIMEOUT })
      await expect.soft(stepper.backBtn).toBeEnabled()
      await expect.soft(servicesTab.rePromoteVersionBtn).toBeEnabled()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveText(COMPLETE_PUBLISH_STATUS)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).publishStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
    })

  test('[A-PRM-1] Service search at the Promote step',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6388` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_TWO_SERVICES, config)

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
    })

  test('[A-PRM-2] Service selecting at the Promote step',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6389` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const testServiceCheckbox = servicesTab.getServiceRow(TEST_SERVICE).checkbox
      const { allServicesCbx } = servicesTab

      await servicesTab.gotoPromoteStep(SNAPSHOT_PRM_NO_BASELINE, config)

      await expect(testServiceCheckbox).toBeEnabled()
      await expect(testServiceCheckbox).not.toBeChecked()
      await expect(allServicesCbx).toBeEnabled()
      await expect(allServicesCbx).not.toBeChecked()
      await expect(allServicesCbx).toHaveAttribute('data-indeterminate', 'false')

      await test.step(`Select "${TEST_SERVICE}" service`, async () => {
        await testServiceCheckbox.click()

        await expect.soft(testServiceCheckbox).toBeChecked()
        await expect.soft(allServicesCbx).toBeChecked()
      })

      await test.step(`Unselect "${TEST_SERVICE}" service`, async () => {
        await testServiceCheckbox.click()

        await expect(testServiceCheckbox).not.toBeChecked()
        await expect(allServicesCbx).not.toBeChecked()
        await expect(allServicesCbx).toHaveAttribute('data-indeterminate', 'false')
      })

      await test.step('Select all services', async () => {
        await allServicesCbx.click()

        await expect.soft(testServiceCheckbox).toBeChecked()
        await expect.soft(allServicesCbx).toBeChecked()
      })
    })
})
