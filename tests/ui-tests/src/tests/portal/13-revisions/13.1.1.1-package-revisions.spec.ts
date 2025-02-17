import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { LONG_EXPECT, SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { DEL_ORDER_V1, REV_METADATA, V_P_PKG_REV_1_R, V_P_PKG_REV_2_R } from '@test-data/portal'
import { VERSION_OVERVIEW_TAB_REVISION_HISTORY } from '@portal/entities'
import { SYSADMIN, TEST_USER_1 } from '@test-data'

test.describe('13.1.1.1 Package revisions', () => {

  const testVersion = V_P_PKG_REV_1_R

  test('[P-COPR-1.1] Check revisions info on the "Revision History" tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8407` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { revisionsTab } = overviewTab

      await portalPage.gotoVersion(testVersion)
      await overviewTab.revisionsTab.click()

      await expect.soft(revisionsTab.getRevisionRow('@1').statusCell).toHaveText(RELEASE_VERSION_STATUS)
      for (const label of testVersion.metadata!.versionLabels!) {
        await expect.soft(revisionsTab.getRevisionRow('@1').labelsCell).toContainText(label)
      }
      await expect.soft(revisionsTab.getRevisionRow('@1').publicationDateCell).not.toBeEmpty()
      await expect.soft(revisionsTab.getRevisionRow('@1').publishedByCell).toHaveText(SYSADMIN.name)
      for (const label of V_P_PKG_REV_2_R.metadata!.versionLabels!) {
        await expect.soft(revisionsTab.getRevisionRow('@2').labelsCell).toContainText(label)
      }
      await expect.soft(revisionsTab.getRevisionRow('@3').revisionCell).toContainText('(latest)')
      await expect.soft(revisionsTab.getRevisionRow('@3').statusCell).toHaveText(DRAFT_VERSION_STATUS)
      await expect.soft(revisionsTab.getRevisionRow('@3').labelsCell).toBeEmpty()
      await expect.soft(revisionsTab.getRevisionRow('@3').publishedByCell).toHaveText(TEST_USER_1.name)
      await expect.soft(revisionsTab.getRevisionRow('@3').infoIcon).not.toBeVisible()

      await revisionsTab.getRevisionRow('@3').hover()

      await expect.soft(revisionsTab.getRevisionRow('@3').infoIcon).toBeVisible()

      await revisionsTab.getRevisionRow('@3').infoIcon.hover()

      await expect(portalPage.tooltip).toHaveCount(1)
      await expect(revisionsTab.getRevisionRow('@3').infoTooltip).toContainText(REV_METADATA.branchName)
    })

  test('[P-COPR-1.2] Check version name with/without revision',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8407` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { revisionsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_REVISION_HISTORY)

      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)

      await revisionsTab.getRevisionRow('@2').link.click()

      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(`${testVersion.version}@2`)
    })

  test('[P-COPR-2.1] Compare latest and previous revisions',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8409` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog, comparePackagesPage } = versionPage

      await portalPage.gotoVersion(testVersion)
      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.revisionsItm.click()

      await expect(compareSelectDialog.currentRevisionAc).toHaveValue('@3')

      await compareSelectDialog.fillForm({ previousRevision: '@2' })
      await compareSelectDialog.compareBtn.click()

      await expect(comparePackagesPage.swapper.leftTitle).toHaveText('@2', { timeout: LONG_EXPECT })
      await expect.soft(comparePackagesPage.swapper.rightTitle).toHaveText('@3(latest)')
      await expect.soft(comparePackagesPage.compareContent.noDiffPh).toBeVisible()

      await comparePackagesPage.swapper.swapBtn.click()

      await expect(comparePackagesPage.swapper.leftTitle).toHaveText('@3(latest)', { timeout: LONG_EXPECT })
      await expect.soft(comparePackagesPage.swapper.rightTitle).toHaveText('@2')
      await expect.soft(comparePackagesPage.compareContent.noDiffPh).toBeVisible()
    })

  test('[P-COPR-2.2] Compare two previous revisions',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8409` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog, comparePackagesPage } = versionPage
      const delOrderRow = comparePackagesPage.compareContent.getOperationRow(DEL_ORDER_V1)

      await portalPage.gotoVersion(testVersion)
      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.revisionsItm.click()
      await compareSelectDialog.fillForm({ previousRevision: '@1', currentRevision: '@2' })
      await compareSelectDialog.compareBtn.click()

      await expect(comparePackagesPage.swapper.leftTitle).toHaveText('@1', { timeout: LONG_EXPECT })
      await expect.soft(comparePackagesPage.swapper.rightTitle).toHaveText('@2')
      await expect.soft(comparePackagesPage.toolbar.breakingChangesFilterBtn).toHaveText('2')
      await expect.soft(comparePackagesPage.toolbar.semiBreakingChangesFilterBtn).toHaveText('0')
      await expect.soft(comparePackagesPage.toolbar.deprecatedChangesFilterBtn).toHaveText('2')
      await expect.soft(comparePackagesPage.toolbar.nonBreakingChangesFilterBtn).toHaveText('3')
      await expect.soft(comparePackagesPage.toolbar.annotationChangesFilterBtn).toHaveText('1')
      await expect.soft(comparePackagesPage.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')
      await expect.soft(comparePackagesPage.compareContent.getOperationRow()).toHaveCount(5)
      await expect(delOrderRow.rightSummary.changes.nonBreaking).toHaveText('1')

      await comparePackagesPage.swapper.swapBtn.click()

      await expect(comparePackagesPage.swapper.leftTitle).toHaveText('@2', { timeout: LONG_EXPECT })
      await expect.soft(comparePackagesPage.swapper.rightTitle).toHaveText('@1')
      await expect(delOrderRow.rightSummary.changes.semiBreaking).toHaveText('1')
    })

  test('[P-COPR-4] Search package revision',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8656` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { revisionsTab } = versionPage.overviewTab

      await portalPage.gotoVersion(testVersion, VERSION_OVERVIEW_TAB_REVISION_HISTORY)

      await expect(revisionsTab.searchbar).toBeVisible()

      await test.step('Search by Labels', async () => {

        await test.step('Part of a word', async () => {
          await revisionsTab.searchbar.fill('Revision')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(2)
        })

        await test.step('Adding part of a word', async () => {
          await revisionsTab.searchbar.type('s-1')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(1)
          await expect.soft(revisionsTab.getRevisionRow('@2')).toBeVisible()
        })

        await test.step('Search query clearing', async () => {
          await revisionsTab.searchbar.clear()

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(3)
        })

        await test.step('Case sensitive search', async () => {
          await revisionsTab.searchbar.fill('revisions-1')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(1)
          await expect.soft(revisionsTab.getRevisionRow('@2')).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await revisionsTab.searchbar.fill('revisions-123')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(0)
        })
      })

      await test.step('Search by User', async () => {

        await test.step('Part of a word', async () => {
          await revisionsTab.searchbar.fill('x_ATUI_')
          await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(3)
        })

        await test.step('Adding part of a word', async () => {
          await revisionsTab.searchbar.type('User1')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(1)
          await expect.soft(revisionsTab.getRevisionRow('@3')).toBeVisible()
        })

        await test.step('Search query clearing', async () => {
          await revisionsTab.searchbar.clear()

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(3)
        })

        await test.step('Case sensitive search', async () => {
          await revisionsTab.searchbar.fill('x_atui_user1')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(1)
          await expect.soft(revisionsTab.getRevisionRow('@3')).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await revisionsTab.searchbar.fill('x_ATUI_User123')

          await expect.soft(revisionsTab.getRevisionRow()).toHaveCount(0)
        })
      })
    })
})
