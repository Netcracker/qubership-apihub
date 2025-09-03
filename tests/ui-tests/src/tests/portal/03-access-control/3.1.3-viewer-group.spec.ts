import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  GRP_P_VIEWER_R,
  NO_PERM_CREATE_PACKAGES,
  NO_PERM_DEL_PACKAGE,
  NO_PERM_EDIT_PACKAGE,
  NO_PERM_SEE_PAGE,
} from '@test-data/portal'
import { TICKET_BASE_URL } from '@test-setup'
import { SETTINGS_TAB_TOKENS, SETTINGS_TAB_USERS } from '@portal/entities'

test.describe('03.1.3 Access Control. Viewer role. (Group)', () => {

  const testGroup = GRP_P_VIEWER_R

  test('[P-ACVG-01] Group. Viewer. Settings.',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8571` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1019` },
      ],
    },
    async ({ user1Page: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab, accessTokensTab, accessControlTab, noPermissionPlaceholder } = versionPage.packageSettingsPage

      await test.step('Navigate to a group', async () => {
        await portalPage.gotoGroup(testGroup)

        await expect(portalPage.toolbar.titleText).toHaveText(testGroup.name)
        await expect(portalPage.toolbar.createPackageMenu).toBeDisabled()

        await portalPage.toolbar.createPackageMenu.hover({ force: true })
        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_CREATE_PACKAGES)
      })

      await test.step('View "General" tab', async () => {
        await portalPage.toolbar.settingsButton.click()

        await expect(generalTab.editBtn).toBeDisabled()
        await expect(generalTab.deleteBtn).toBeDisabled()

        await generalTab.editBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_EDIT_PACKAGE)

        await generalTab.deleteBtn.hover({ force: true })

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect(portalPage.tooltip).toHaveText(NO_PERM_DEL_PACKAGE)
      })

      await test.step('View "Access Tokens" tab', async () => {
        await expect(accessTokensTab).not.toBeVisible()
        await portalPage.gotoPackage(testGroup, SETTINGS_TAB_TOKENS)
        await expect(noPermissionPlaceholder).toHaveText(NO_PERM_SEE_PAGE)
      })

      await test.step('View "User Access Control" tab', async () => {
        await expect(accessControlTab).not.toBeVisible()
        await portalPage.gotoPackage(testGroup, SETTINGS_TAB_USERS)
        await expect(noPermissionPlaceholder).toHaveText(NO_PERM_SEE_PAGE)
      })
    })
})
