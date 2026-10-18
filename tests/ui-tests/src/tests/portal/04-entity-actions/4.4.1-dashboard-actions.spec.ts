import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { FAVORITE_ICON, UNFAVORITE_ICON } from '@shared/entities'
import {
  P_DSH_CREATE,
  P_DSH_DELETE,
  P_DSH_FAV_LIST,
  P_DSH_UNFAV_FAV_PAGE,
  P_DSH_UNFAV_LIST,
  P_DSH_UPDATE,
  P_GR_CRUD,
  P_WS_MAIN_R,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
  V_P_DSH_CRUD_RELEASE_N,
  VAR_GR,
} from '@test-data/portal'
import { EMPTY_VALUE } from '@test-data/shared'
import { SETTINGS_TAB_GENERAL } from '@portal/entities'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('4.4.1 Dashboard actions', () => {

  const testWorkspace = P_WS_MAIN_R
  const testGroup = P_GR_CRUD

  test('[P-DAOPR-1] Creating Dashboard',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4491` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.dashboardItm.click()

      await test.step('Create Dashboard', async () => {
        await createPackageDialog.fillForm({
          name: P_DSH_CREATE.name,
          alias: P_DSH_CREATE.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created') //Dashboards don't have a notification
        await expect(versionPage.toolbar.title).toHaveText(P_DSH_CREATE.name)
      })
    })

  test('[P-DAOPR-2] Updating Dashboard',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4492` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Dashboard settings', async () => {
        await portalPage.gotoDashboard(P_DSH_UPDATE, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_DSH_UPDATE.name)
        await expect(generalTab.serviceName).toHaveText(EMPTY_VALUE)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(P_DSH_UPDATE.description!)
        await expect(generalTab.defReleaseVersion).toHaveText(EMPTY_VALUE)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_DEF)
      })

      await test.step('Update Dashboard', async () => {
        await generalTab.editBtn.click()
        await generalTab.packageNameTxtFld.fill(P_DSH_UPDATE.testMeta!.updatedName!)
        await generalTab.serviceNameTxtFld.fill(P_DSH_UPDATE.testMeta!.updatedServiceName!)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill(P_DSH_UPDATE.testMeta!.updatedDescription!)
        await generalTab.defReleaseVersionAc.click()
        await generalTab.defReleaseVersionAc.getListItem(`${V_P_DSH_CRUD_RELEASE_N.version} ${V_P_DSH_CRUD_RELEASE_N.status}`).click()
        await generalTab.patternTxtFld.fill(RV_PATTERN_NEW)
        await generalTab.saveBtn.click()

        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been updated')
        await expect(generalTab.packageName).toHaveText(P_DSH_UPDATE.testMeta!.updatedName!)
        await expect(generalTab.serviceName).toHaveText(P_DSH_UPDATE.testMeta!.updatedServiceName!)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(P_DSH_UPDATE.testMeta!.updatedDescription!)
        await expect(generalTab.defReleaseVersion).toHaveText(V_P_DSH_CRUD_RELEASE_N.version)
        await expect(generalTab.pattern).toHaveText(RV_PATTERN_NEW)
      })
    })

  test('[P-DAOPR-3] Deletion Dashboard',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4493` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-B-1256` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Dashboard settings', async () => {
        await portalPage.gotoDashboard(P_DSH_DELETE, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_DSH_DELETE.name)
      })

      await test.step('Delete Dashboard', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText(`SuccessPackage ${P_DSH_DELETE.name} has been deleted`) //TODO: TestCase-B-1256
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(testGroup)

        await expect(portalPage.table.getRow(P_DSH_FAV_LIST)).toBeVisible()
        await expect(portalPage.table.getRow(P_DSH_DELETE)).toBeHidden()
      })
    })

  test('[P-DAOPR-4] Adding Dashboard to Favorites (packages list)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4487` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-9292` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      /** Case should start from root page to cover issues with cache */
      await test.step(`Go to the "${testGroup.name}" group`, async () => {
        await portalPage.goto()
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()
        await portalPage.table.expandGroup(VAR_GR)
        await portalPage.table.expandGroup(testGroup)

        await expect(portalPage.table.getRow(P_DSH_FAV_LIST).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)

        await portalPage.table.getRow(P_DSH_FAV_LIST).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_DSH_FAV_LIST).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_DSH_FAV_LIST)).toBeVisible() //TODO: TestCase-A-9292
      })
    })

  test('[P-DAOPR-5.1] Removing Dashboard from Favorites (packages list)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4494` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-9292` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      /** Case should start from root page to cover issues with cache */
      await test.step(`Go to the "${testGroup.name}" group`, async () => {
        await portalPage.goto()
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()
        await portalPage.table.expandGroup(VAR_GR)
        await portalPage.table.expandGroup(testGroup)

        await expect(portalPage.table.getRow(P_DSH_UNFAV_LIST).favoriteBtn).toHaveIcon(FAVORITE_ICON)

        await portalPage.table.getRow(P_DSH_UNFAV_LIST).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_DSH_UNFAV_LIST).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_DSH_UNFAV_LIST)).toBeHidden() //TODO: TestCase-A-9292
      })
    })

  test('[P-DAOPR-5.2] Removing Dashboard from Favorites (favorites page)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4494` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-9292` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      /** Expand test Group first to cover issues with cache */
      await test.step(`Go to the "${testGroup.name}" group`, async () => {
        await portalPage.goto()
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()
        await portalPage.table.expandGroup(VAR_GR)
        await portalPage.table.expandGroup(testGroup)

        await expect(portalPage.table.getRow(P_DSH_UNFAV_FAV_PAGE).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()
        await portalPage.table.getRow(P_DSH_UNFAV_FAV_PAGE).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_DSH_UNFAV_FAV_PAGE)).toBeHidden()
      })

      await test.step(`Return to the "${testWorkspace.name}" workspace`, async () => {
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()

        // await expect(portalPage.table.getRow(P_DSH_UNFAV_FAV_PAGE).favoriteButton).toHaveIcon(UNFAVORITE_ICON) //TODO: TestCase-A-9292
      })
    })
})
