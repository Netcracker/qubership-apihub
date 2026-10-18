import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { AGENT_ERROR_STATUS_ICON } from '@shared/entities'
import { BACKWARD_INCOMPATIBLE_MSG } from '@agent/entities'
import { VersionPackagePage } from '@portal/pages/PortalPage/VersionPage/VersionPackagePage'
import { AgentPage } from '@agent/pages'
import { SNAPSHOT_HIS_MULTI_CHANGES, TEST_NAMESPACE_2, TEST_SERVICE } from '@test-data/agent'
import { TOOLTIP_SEVERITY_MSG } from '@test-data/shared'
import { TICKET_BASE_URL } from '@test-setup'
import { isDevProxyMode } from '@services/utils'

test.describe('06. Snapshots History', () => {
  const config = { namespace: TEST_NAMESPACE_2 }

  test('[E2E-A-HIS-1] History: service snapshot with multi changes.',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-3920` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { servicesTab, snapshotsTab } = agentPage
      const snapshot = SNAPSHOT_HIS_MULTI_CHANGES

      await servicesTab.gotoSnapshotStep(config)
      await servicesTab.createSnapshot(snapshot)

      await test.step('Navigate to the \'Snapshots\' tab', async () => {
        await agentPage.snapshotsTab.click()

        await expect(snapshotsTab.getSnapshotRow(snapshot.name)).toBeVisible()
        await expect.soft(snapshotsTab.getSnapshotRow(snapshot.name).publishDateCell).not.toBeEmpty()
        await expect.soft(snapshotsTab.getSnapshotRow(snapshot.name).baselinePackageCell).toBeEmpty()
      })

      await test.step(`Expand the "${snapshot.name}" snapshot`, async () => {
        await snapshotsTab.getSnapshotRow(snapshot.name).expandBtn.click()

        await expect(snapshotsTab.getServiceRow(TEST_SERVICE)).toBeVisible()
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveText(BACKWARD_INCOMPATIBLE_MSG)
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).bwcStatusCell).toHaveIcon(AGENT_ERROR_STATUS_ICON)
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.breakingChanges).toHaveText('1')
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.riskyChanges).toHaveText('1')
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.deprecatedChanges).toHaveText('1')
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.nonBreakingChanges).toHaveText('1')
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.annotationChanges).toHaveText('1')
        await expect.soft(snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.unclassifiedChanges).toHaveText('1')
      })

      await test.step('Check changes tooltips on the changes summary', async () => {
        await snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.breakingChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.breaking)

        await snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.riskyChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        for (const msg of TOOLTIP_SEVERITY_MSG.risky) {
          await expect.soft(agentPage.tooltip).toContainText(msg)
        }

        await snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.deprecatedChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.deprecated)

        await snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.nonBreakingChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.nonBreaking)

        await snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.annotationChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.annotation)

        await snapshotsTab.getServiceRow(TEST_SERVICE).changesCell.unclassifiedChanges.hover()

        await expect(agentPage.tooltip).toHaveCount(1)
        await expect.soft(agentPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.unclassified)
      })

      if (!isDevProxyMode()) {
        await test.step('Navigate to the APIHUB with page of comparison', async () => {

          const context = page.context()
          const pagePromise = context.waitForEvent('page')

          await snapshotsTab.getServiceRow(TEST_SERVICE).viewChanges()

          const newPage = await pagePromise
          const packagePage = new VersionPackagePage(newPage)
          const { comparePackagesPage } = packagePage

          await expect.soft(comparePackagesPage.swapper.leftTitle).toHaveText(snapshot.baseline)
          await expect(comparePackagesPage.swapper.rightTitle).toHaveText(snapshot.name)
        })
      }
    })
})
