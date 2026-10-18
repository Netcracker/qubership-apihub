import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { AGENT_ERROR_STATUS_ICON, AGENT_SUCCESS_STATUS_ICON, AGENT_WARNING_STATUS_ICON } from '@shared/entities'
import {
  BACKWARD_COMPATIBLE_MSG,
  BACKWARD_INCOMPATIBLE_MSG,
  BASELINE_VERSION_NOT_FOUND_MSG,
  SUCCESS_STEP_STATUS,
} from '@agent/entities'
import { AgentPage } from '@agent/pages'
import { VersionPackagePage } from '@portal/pages/PortalPage/VersionPage/VersionPackagePage'
import { LONG_EXPECT, TICKET_BASE_URL } from '@test-setup'
import { TOOLTIP_SEVERITY_MSG } from '@test-data/shared'
import {
  SEARCH_SERVICE_LABEL,
  SNAPSHOT_VLD_ANNOTUNCLAS_CHANGES,
  SNAPSHOT_VLD_MULTI_CHANGES,
  SNAPSHOT_VLD_NO_BASELINE,
  SNAPSHOT_VLD_NO_CHANGES,
  SNAPSHOT_VLD_NO_CHANGES_ALL_SERVICES,
  SNAPSHOT_VLD_NON_BRAKING,
  SNAPSHOT_VLD_TWO_SERVICES,
  TEST_DOC,
  TEST_NAMESPACE_2,
  TEST_SERVICE,
  TEST_SERVICE2,
  TEST_SERVICE_1_IMM,
  TEST_SERVICE_2_IMM,
  TEST_SERVICE_LABEL,
} from '@test-data/agent'
import { isLocalHost } from '@services/utils'

test.describe('04. Validation Results', () => {
  const config = { namespace: TEST_NAMESPACE_2 }
  const testService1 = TEST_SERVICE_1_IMM
  const testService2 = TEST_SERVICE_2_IMM

  test('[E2E-A-VLD-1] Validation: Baseline = no-changes. All services.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3620` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_NO_CHANGES_ALL_SERVICES, config)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS)
      await expect(stepper.backBtn).toBeEnabled()
      await expect(stepper.nextBtn).toBeEnabled()
      await expect.soft(servicesTab.noBwcErrorsBtn).toHaveText('1')
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2)).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_COMPATIBLE_MSG)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).bwcStatusCell).toHaveText(BASELINE_VERSION_NOT_FOUND_MSG)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE2).bwcStatusCell).toHaveIcon(AGENT_WARNING_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell).toBeEmpty()
    })

  test('[E2E-A-VLD-2] Validation: Baseline = no-changes. One service.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3626` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_NO_CHANGES, config)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS)
      await expect(stepper.backBtn).toBeEnabled()
      await expect(stepper.nextBtn).toBeEnabled()
      await expect.soft(servicesTab.searchBar).toBeVisible()
      await expect.soft(stepper.discoverIndicator.icon).toBeVisible()
      await expect.soft(stepper.discoverIndicator.icon).toHaveClass(/Mui-completed/)
      await expect.soft(stepper.snapshotIndicator.icon).toBeVisible()
      await expect.soft(stepper.snapshotIndicator.icon).toHaveClass(/Mui-completed/)
      await expect.soft(stepper.validationIndicator.icon).toBeVisible()
      await expect.soft(stepper.validationIndicator.icon).toHaveClass(/Mui-active/)
      await expect.soft(stepper.promoteIndicator.icon).toBeVisible()
      await expect.soft(stepper.promoteIndicator.icon).toHaveClass(/Mui-disabled/)
      await expect.soft(servicesTab.bwcErrorsBtn).toHaveText('0')
      await expect.soft(servicesTab.noBwcErrorsBtn).toHaveText('1')
      await expect.soft(servicesTab.noBaselineBtn).toHaveText('0')
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).labelsCell).toContainText(TEST_SERVICE_LABEL)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).baselinePackageCell).toHaveText(testService1.baselinePackage!)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_COMPATIBLE_MSG)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell).toBeEmpty()
    })

  test('[E2E-A-VLD-3] Validation: Baseline = No previous version. One service.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3647` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_NO_BASELINE, config)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS)
      await expect(stepper.backBtn).toBeEnabled()
      await expect(stepper.nextBtn).toBeEnabled()
      await expect.soft(servicesTab.bwcErrorsBtn).toHaveText('0')
      await expect.soft(servicesTab.noBwcErrorsBtn).toHaveText('0')
      await expect.soft(servicesTab.noBaselineBtn).toHaveText('1')
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BASELINE_VERSION_NOT_FOUND_MSG)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_WARNING_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell).toBeEmpty()
    })

  test('[E2E-A-VLD-4] Validation: Baseline = non-breaking. One service.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3635` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_NON_BRAKING, config)

      await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS)
      await expect(stepper.backBtn).toBeEnabled()
      await expect(stepper.nextBtn).toBeEnabled()
      await expect.soft(servicesTab.bwcErrorsBtn).toHaveText('0')
      await expect.soft(servicesTab.noBwcErrorsBtn).toHaveText('1')
      await expect.soft(servicesTab.noBaselineBtn).toHaveText('0')
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_COMPATIBLE_MSG)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_SUCCESS_STATUS_ICON)
      await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.nonBreakingChanges).toHaveText('1')
    })

  test('[E2E-A-VLD-5] Validation: Baseline = multi-changes. One service.',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3616` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await test.step('Navigate to the Validation step', async () => {
        await servicesTab.gotoValidationStep(SNAPSHOT_VLD_MULTI_CHANGES, config)

        await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS)
        await expect(stepper.backBtn).toBeEnabled()
        await expect(stepper.nextBtn).toBeEnabled()
        await expect.soft(servicesTab.bwcErrorsBtn).toHaveText('1')
        await expect.soft(servicesTab.noBwcErrorsBtn).toHaveText('0')
        await expect.soft(servicesTab.noBaselineBtn).toHaveText('0')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_INCOMPATIBLE_MSG)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_ERROR_STATUS_ICON)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.breakingChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.riskyChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.deprecatedChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.nonBreakingChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.annotationChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.unclassifiedChanges).toHaveText('1')
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

      if (!isLocalHost()) {
        await test.step('Navigate to the APIHUB with page of comparison', async () => {

          const context = page.context()
          const pagePromise = context.waitForEvent('page')

          await servicesTab.getServiceRow(TEST_SERVICE).viewChanges()

          const newPage = await pagePromise
          const packagePage = new VersionPackagePage(newPage)
          const { comparePackagesPage } = packagePage

          await expect.soft(comparePackagesPage.swapper.leftTitle).toHaveText(SNAPSHOT_VLD_MULTI_CHANGES.baseline)
          await expect(comparePackagesPage.swapper.rightTitle).toHaveText(SNAPSHOT_VLD_MULTI_CHANGES.name)
        })
      }
    })

  test('[E2E-A-VLD-7] Validation: Baseline = AnnotUnclas_changes. One service.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9624` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { stepper } = servicesTab

      await test.step('Navigate to the Validation step', async () => {
        await servicesTab.gotoValidationStep(SNAPSHOT_VLD_ANNOTUNCLAS_CHANGES, config)

        await expect.soft(stepper.validationIndicator.status).toHaveText(SUCCESS_STEP_STATUS)
        await expect(stepper.nextBtn).toBeEnabled()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_COMPATIBLE_MSG)
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.annotationChanges).toHaveText('1')
        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE).changesCell.unclassifiedChanges).toHaveText('1')
      })
    })

  test('[A-VLD-1] Changes filter check at the Validation step',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6385` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_NO_BASELINE, config)

      await test.step('Check \'Services with BWC errors\' filter', async () => {
        await servicesTab.bwcErrorsBtn.click()

        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).not.toBeVisible()

        await servicesTab.bwcErrorsBtn.click()

        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      })

      await test.step('Check \'Services without BWC errors\' filter', async () => {
        await servicesTab.noBwcErrorsBtn.click()

        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).not.toBeVisible()

        await servicesTab.noBwcErrorsBtn.click()

        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      })

      await test.step('Check \'Services without BWC errors\' filter', async () => {
        await servicesTab.noBaselineBtn.click()

        await expect.soft(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
      })
    })

  test('[A-VLD-2] Service search at the Validation step',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6386` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_TWO_SERVICES, config)

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

  test('[A-VLD-3] The OpenAPI document opening at the Validation step',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6387` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab } = agentPage
      const { specViewPopup } = servicesTab

      await servicesTab.gotoValidationStep(SNAPSHOT_VLD_NO_BASELINE, config)

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

        await expect(servicesTab.getServiceRow(TEST_SERVICE)).toBeVisible()
        await expect(specViewPopup.closeBtn).not.toBeVisible()
      })
    })
})
