import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { FAVORITE_ICON, UNFAVORITE_ICON } from '@shared/entities'
import { SETTINGS_TAB_GENERAL } from '@portal/entities'
import {
  P_GR_CREATE_CHILD,
  P_GR_CREATE_ROOT,
  P_GR_CRUD,
  P_GR_DELETE,
  P_GR_FAV_LIST,
  P_GR_FAV_TITLE,
  P_GR_UNFAV_FAV_PAGE,
  P_GR_UNFAV_LIST,
  P_GR_UNFAV_TITLE,
  P_GR_UPDATE,
  P_WS_MAIN_R,
  VAR_GR,
} from '@test-data/portal'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('4.2 Group actions', () => {

  const testWorkspace = P_WS_MAIN_R
  const testGroup = P_GR_CRUD

  test('[P-GROPR-1] Creating Group',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4480` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.groupItm.click()

      await test.step('Create Group', async () => {
        await createPackageDialog.fillForm({
          name: P_GR_CREATE_ROOT.name,
          alias: P_GR_CREATE_ROOT.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created') //Groups don't have a notification
        await expect(versionPage.toolbar.title).toHaveText(P_GR_CREATE_ROOT.name)
      })
    })

  test('[P-GROPR-2] Creating Child Group',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4481` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { createPackageDialog, versionPackagePage: versionPage } = portalPage

      await portalPage.gotoGroup(testGroup)
      await portalPage.toolbar.createPackageMenu.click()
      await portalPage.toolbar.createPackageMenu.groupItm.click()

      await test.step('Create Group', async () => {
        await createPackageDialog.fillForm({
          name: P_GR_CREATE_CHILD.name,
          parentName: P_GR_CREATE_CHILD.parent.name,
          alias: P_GR_CREATE_CHILD.alias,
        })
        await createPackageDialog.createBtn.click()

        await expect(createPackageDialog.createBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText('SuccessPackage has been created') //Groups don't have a notification
        await expect(versionPage.toolbar.title).toHaveText(P_GR_CREATE_CHILD.name)
      })
    })

  test('[P-GROPR-3] Updating Group',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4482` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Group settings', async () => {
        await portalPage.gotoGroup(P_GR_UPDATE, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_GR_UPDATE.name)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(P_GR_UPDATE.description!)
      })

      await test.step('Update Group', async () => {
        await generalTab.editBtn.click()
        await generalTab.packageNameTxtFld.fill(P_GR_UPDATE.testMeta!.updatedName!)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill(P_GR_UPDATE.testMeta!.updatedDescription!)
        await generalTab.saveBtn.click()

        await expect(portalPage.snackbar).toHaveText('SuccessPackage has been updated')
        await expect(generalTab.packageName).toHaveText(P_GR_UPDATE.testMeta!.updatedName!)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText(P_GR_UPDATE.testMeta!.updatedDescription!)
      })
    })

  test('[P-GROPR-4] Deletion Group',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4483` },
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-B-1256` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Group settings', async () => {
        await portalPage.gotoGroup(P_GR_DELETE, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(P_GR_DELETE.name)
      })

      await test.step('Delete Group', async () => {
        await generalTab.deleteBtn.click()
        await generalTab.deletePackageDialog.deleteBtn.click()

        await expect(generalTab.deletePackageDialog.deleteBtn).toBeHidden()
        // await expect(portalPage.snackbar).toHaveText(`SuccessPackage ${P_GR_DELETE.name} has been deleted`) //TODO: TestCase-B-1256
        await expect(portalPage.toolbar.title).toHaveText('Favorite')

        await portalPage.gotoGroup(testGroup)

        await expect(portalPage.table.getRow(P_GR_FAV_LIST)).toBeVisible()
        await expect(portalPage.table.getRow(P_GR_DELETE)).toBeHidden()
      })
    })

  test('[P-GROPR-5.1] Adding Group to Favorites (packages list)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8586` },
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

        await expect(portalPage.table.getRow(P_GR_FAV_LIST).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)

        await portalPage.table.getRow(P_GR_FAV_LIST).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_GR_FAV_LIST).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_GR_FAV_LIST)).toBeVisible() //TODO: TestCase-A-9292
      })
    })

  test('[P-GROPR-5.2] Adding Group to Favorites (group title)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8586` },
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
        await portalPage.table.getRow(P_GR_FAV_TITLE).link.click()

        await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(UNFAVORITE_ICON)

        await portalPage.toolbar.favoriteBtn.click()

        await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_GR_FAV_TITLE)).toBeVisible() //TODO: TestCase-A-9292
      })
    })

  test('[P-GROPR-5.3] Removing Group from Favorites (packages list)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8586` },
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

        await expect(portalPage.table.getRow(P_GR_UNFAV_LIST).favoriteBtn).toHaveIcon(FAVORITE_ICON)

        await portalPage.table.getRow(P_GR_UNFAV_LIST).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_GR_UNFAV_LIST).favoriteBtn).toHaveIcon(UNFAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_GR_UNFAV_LIST)).toBeHidden() //TODO: TestCase-A-9292
      })
    })

  test('[P-GROPR-5.4] Removing Group from Favorites (group title)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8586` },
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
        await portalPage.table.getRow(P_GR_UNFAV_TITLE).link.click()

        await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(FAVORITE_ICON)

        await portalPage.toolbar.favoriteBtn.click()

        await expect(portalPage.toolbar.favoriteBtn).toHaveIcon(UNFAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()

        // await expect(portalPage.table.getRow(P_GR_UNFAV_TITLE)).toBeHidden() //TODO: TestCase-A-9292
      })
    })

  test('[P-GROPR-5.5] Removing Group from Favorites (favorites page)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8586` },
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

        await expect(portalPage.table.getRow(P_GR_UNFAV_FAV_PAGE).favoriteBtn).toHaveIcon(FAVORITE_ICON)
      })

      await test.step('Go to the "Favorite" page', async () => {
        await portalPage.sidebar.favoritesBtn.click()
        await portalPage.table.getRow(P_GR_UNFAV_FAV_PAGE).favoriteBtn.click()

        await expect(portalPage.table.getRow(P_GR_UNFAV_FAV_PAGE)).toBeHidden()
      })

      await test.step(`Return to the "${testWorkspace.name}" workspace`, async () => {
        await portalPage.sidebar.getWorkspaceButton(testWorkspace).click()

        // await expect(portalPage.table.getRow(P_GR_UNFAV_FAV_PAGE).favoriteButton).toHaveIcon(UNFAVORITE_ICON) //TODO: TestCase-A-9292
      })
    })
})
