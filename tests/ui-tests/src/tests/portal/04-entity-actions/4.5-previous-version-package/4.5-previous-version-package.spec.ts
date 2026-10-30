import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { PUBLISH_TIMEOUT } from '@test-setup'
import {
  DSH_PVP_OTHER_N,
  PKG_PVP_MAIN_N,
  PKG_PVP_OTHER_N,
  setupPreviousVersionPackageTestData,
  V_PVP_DSH_MAIN_BASE_N,
  V_PVP_DSH_OTHER_RELEASE_N,
  V_PVP_MAIN_BASE_N,
  V_PVP_MAIN_FOREIGN_PREV_N,
  V_PVP_OTHER_DRAFT_N,
  V_PVP_OTHER_RELEASE_N,
} from './previous-version-package.test-data'

/**
 * Previous version from another package in the publish dialog
 * (https://github.com/Netcracker/qubership-apihub/issues/815).
 */

test.describe('4.5 Previous version package', () => {
  const ISSUE_ANNOTATION = { type: 'Issue', description: 'https://github.com/Netcracker/qubership-apihub/issues/815' }
  const MSG_NO_PREVIOUS_VERSION = 'No previous version'

  const MSG_OPTION_MAIN_FOREIGN_PREV = `${V_PVP_MAIN_FOREIGN_PREV_N.version} ${V_PVP_MAIN_FOREIGN_PREV_N.status}`
  const MSG_OPTION_OTHER_RELEASE = `${V_PVP_OTHER_RELEASE_N.version} ${V_PVP_OTHER_RELEASE_N.status}`
  const MSG_OPTION_OTHER_DRAFT = `${V_PVP_OTHER_DRAFT_N.version} ${V_PVP_OTHER_DRAFT_N.status}`
  const MSG_OPTION_DSH_OTHER_RELEASE = `${V_PVP_DSH_OTHER_RELEASE_N.version} ${V_PVP_DSH_OTHER_RELEASE_N.status}`

  test.beforeAll(async ({ apihubTDM }) => {
    await setupPreviousVersionPackageTestData(apihubTDM)
  })

  test('[P-PVP-1] Selecting the previous version package',
    {
      annotation: ISSUE_ANNOTATION,
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { configureVersionTab } = portalPage.versionPackagePage
      const { publishVersionDialog } = configureVersionTab
      const { previousVersionPackageAc, previousVersionAc } = publishVersionDialog

      await portalPage.gotoVersionEditing(V_PVP_MAIN_BASE_N)
      await configureVersionTab.publishBtn.click()

      await test.step('Verify the current package is selected by default', async () => {
        await expect(previousVersionPackageAc).toHaveValue(PKG_PVP_MAIN_N.name)
      })

      await publishVersionDialog.fillForm({ previousVersion: MSG_OPTION_MAIN_FOREIGN_PREV })

      await test.step('Verify a version of the current package is selected', async () => {
        await expect(previousVersionAc).toHaveValue(V_PVP_MAIN_FOREIGN_PREV_N.version)
      })

      await publishVersionDialog.fillForm({ previousVersionPackage: PKG_PVP_OTHER_N })

      await test.step('Verify the previous version is reset after the package change', async () => {
        await expect(previousVersionPackageAc).toHaveValue(PKG_PVP_OTHER_N.name)
        await expect(previousVersionAc).toHaveValue(MSG_NO_PREVIOUS_VERSION)
      })

      await previousVersionAc.click()

      await test.step('Verify draft and release versions of the selected package are offered', async () => {
        await expect.soft(previousVersionAc.getListItem(MSG_OPTION_OTHER_RELEASE)).toBeVisible()
        await expect.soft(previousVersionAc.getListItem(MSG_OPTION_OTHER_DRAFT)).toBeVisible()
        await expect.soft(previousVersionAc.getListItem(MSG_OPTION_MAIN_FOREIGN_PREV)).toBeHidden()
      })

      await publishVersionDialog.clickEmptySpace()
      await publishVersionDialog.fillForm({ status: 'release' })
      await previousVersionAc.click()

      await test.step('Verify only release versions are offered for a release version', async () => {
        await expect(previousVersionAc.getListItem(MSG_OPTION_OTHER_RELEASE)).toBeVisible()
        await expect(previousVersionAc.getListItem(MSG_OPTION_OTHER_DRAFT)).toBeHidden()
      })
    })

  test('[P-PVP-2] Publishing a package version with a previous version from another package',
    {
      annotation: ISSUE_ANNOTATION,
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab, overviewTab } = versionPage
      const { publishVersionDialog } = configureVersionTab
      const { summary } = overviewTab.summaryTab.body

      await portalPage.gotoVersionEditing(V_PVP_MAIN_BASE_N)
      await configureVersionTab.publishBtn.click()
      // The same version key is allowed because the previous version belongs to another package
      await publishVersionDialog.fillForm({
        version: V_PVP_OTHER_RELEASE_N.version,
        status: 'release',
        previousVersionPackage: PKG_PVP_OTHER_N,
        previousVersion: MSG_OPTION_OTHER_RELEASE,
      })
      await publishVersionDialog.publishBtn.click()

      await test.step('Verify the version is published with the previous version', async () => {
        await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.title).toHaveText(PKG_PVP_MAIN_N.name)
        await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_PVP_OTHER_RELEASE_N.version)
        await expect.soft(summary.previousVersion).toHaveText(V_PVP_OTHER_RELEASE_N.version)
      })

      await summary.previousVersion.click()

      await test.step('Verify the previous version opens in another package', async () => {
        await expect(versionPage.toolbar.title).toHaveText(PKG_PVP_OTHER_N.name)
        await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_PVP_OTHER_RELEASE_N.version)
      })
    })

  test('[P-PVP-3] Publishing a dashboard version with a previous version from another dashboard',
    {
      annotation: ISSUE_ANNOTATION,
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab, overviewTab } = versionPage
      const { publishVersionDialog } = configureVersionTab
      const { summary } = overviewTab.summaryTab.body

      await portalPage.gotoVersionEditing(V_PVP_DSH_MAIN_BASE_N)
      await configureVersionTab.publishBtn.click()
      await publishVersionDialog.fillForm({
        version: V_PVP_DSH_OTHER_RELEASE_N.version,
        status: 'release',
        previousVersionPackage: DSH_PVP_OTHER_N,
        previousVersion: MSG_OPTION_DSH_OTHER_RELEASE,
      })
      await publishVersionDialog.publishBtn.click()

      await test.step('Verify the version is published with the previous version', async () => {
        await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_PVP_DSH_OTHER_RELEASE_N.version)
        await expect.soft(summary.previousVersion).toHaveText(V_PVP_DSH_OTHER_RELEASE_N.version)
      })

      await summary.previousVersion.click()

      await test.step('Verify the previous version opens in another dashboard', async () => {
        await expect(versionPage.toolbar.title).toHaveText(DSH_PVP_OTHER_N.name)
        await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_PVP_DSH_OTHER_RELEASE_N.version)
      })
    })

  test('[P-PVP-4] Editing a version with a previous version from another package',
    {
      annotation: ISSUE_ANNOTATION,
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { configureVersionTab } = portalPage.versionPackagePage
      const { publishVersionDialog } = configureVersionTab

      await portalPage.gotoVersionEditing(V_PVP_MAIN_FOREIGN_PREV_N)
      await configureVersionTab.publishBtn.click()

      await test.step('Verify the saved previous version package and version are filled in', async () => {
        await expect(publishVersionDialog.previousVersionPackageAc).toHaveValue(PKG_PVP_OTHER_N.name)
        await expect(publishVersionDialog.previousVersionAc).toHaveValue(V_PVP_OTHER_RELEASE_N.version)
      })
    })
})
