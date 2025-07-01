import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { SNAPSHOT_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { EMPTY_VALUE } from '@test-data/shared'
import {
  P_WS_MAIN_R,
  PK11,
  PK_SETTINGS_1,
  PK_SETTINGS_2,
  PK_SETTINGS_3,
  V_P_PKG_ARCHIVED_R,
  V_P_PKG_DRAFT_R,
  V_P_PKG_OVERVIEW_R,
  V_P_PKG_SET_FOR_DEF_RELEASE_N,
  V_P_PKG_SET_FOR_DELETE_N,
  V_P_PKG_SET_FOR_SET_RELEASE_N,
  V_P_PKG_SET_FOR_UPDATE_N,
  V_P_PKG_SET_N,
  VERSION_DELETED_MSG,
} from '@test-data/portal'
import { SETTINGS_TAB_GENERAL, SETTINGS_TAB_VERSIONS } from '@portal/entities'
import { SYSADMIN } from '@test-data'

test.describe('5.2.2 Package settings', () => {

  test('[P-PKDTS-1.1] Opening Package settings from Package page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4468` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { packageSettingsPage } = versionPage
      const testPackage = PK11

      await portalPage.gotoPackage(testPackage)

      await test.step('Open Package settings', async () => {
        await versionPage.toolbar.settingsBtn.click()

        await expect(packageSettingsPage.generalTab.title).toHaveText('General')
      })

      await test.step('Navigate through the settings tabs', async () => {
        await packageSettingsPage.apiSpecConfigTab.click()

        await expect(packageSettingsPage.apiSpecConfigTab.title).toHaveText('API Specific Configuration')

        await packageSettingsPage.versionsTab.click()

        await expect(packageSettingsPage.versionsTab.title).toHaveText('Versions')

        await packageSettingsPage.accessTokensTab.click()

        await expect(packageSettingsPage.accessTokensTab.title).toHaveText('Access Tokens')

        await packageSettingsPage.accessControlTab.click()

        await expect(packageSettingsPage.accessControlTab.title).toHaveText('Access Control')
      })
    })

  test('[P-PKDTS-1.2] Opening Package settings from Portal page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4468` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { packageSettingsPage } = versionPage
      const testWorkspace = P_WS_MAIN_R
      const testPackage = PK11

      await portalPage.gotoWorkspace(testWorkspace)
      await portalPage.table.getRow(testPackage).hover()
      await portalPage.table.getRow(testPackage).packageSettingsButton.click()

      await expect(packageSettingsPage.generalTab).toBeVisible()
    })

  test('[P-PKDS-1] Set parameters of package',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8438` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Package settings', async () => {
        await portalPage.gotoPackage(PK_SETTINGS_1, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(PK_SETTINGS_1.name)
        await expect(generalTab.alias).toHaveText(PK_SETTINGS_1.alias)
        await expect(generalTab.serviceName).toHaveText(EMPTY_VALUE)
        await expect(generalTab.parentGroup).toHaveText(PK_SETTINGS_1.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PUBLIC)
        await expect(generalTab.description).toHaveText(EMPTY_VALUE)
        await expect(generalTab.defReleaseVersion).toHaveText(EMPTY_VALUE)
      })

      await test.step('Set package parameters', async () => {
        await generalTab.editBtn.click()
        await generalTab.packageNameTxtFld.fill('new-package')
        await generalTab.serviceNameTxtFld.fill(`new-service-${process.env.TEST_ID_N}`)
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill('new-description')
        await generalTab.defReleaseVersionAc.click()
        await generalTab.defReleaseVersionAc.getListItem(`${V_P_PKG_SET_N.version} ${V_P_PKG_SET_N.status}`).click()
        await generalTab.saveBtn.click()

        await expect(generalTab.packageName).toHaveText('new-package')
        await expect(generalTab.alias).toHaveText(PK_SETTINGS_1.alias)
        await expect(generalTab.serviceName).toHaveText(`new-service-${process.env.TEST_ID_N}`)
        await expect(generalTab.parentGroup).toHaveText(PK_SETTINGS_1.parentId)
        // await expect(generalTab.packageVisibility).toHaveText(PACKAGE_VISIBILITY_PRIVATE)
        await expect(generalTab.description).toHaveText('new-description')
        await expect(generalTab.defReleaseVersion).toHaveText(V_P_PKG_SET_N.version)
      })
    })

  test('[P-PKDS-2] Update parameters of package',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8437` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await test.step('Open Package settings', async () => {
        await portalPage.gotoPackage(PK_SETTINGS_2, SETTINGS_TAB_GENERAL)

        await expect(generalTab.packageName).toHaveText(PK_SETTINGS_2.name)
        await expect(generalTab.alias).toHaveText(PK_SETTINGS_2.alias)
        await expect(generalTab.serviceName).toHaveText(PK_SETTINGS_2.serviceName!)
        await expect(generalTab.parentGroup).toHaveText(PK_SETTINGS_2.parentId)
        await expect(generalTab.description).toHaveText(PK_SETTINGS_2.description!)
        await expect(generalTab.defReleaseVersion).toHaveText(V_P_PKG_SET_FOR_DEF_RELEASE_N.version)
      })

      await test.step('Update package parameters', async () => {
        await generalTab.editBtn.click()

        await expect(generalTab.alias).toHaveText(PK_SETTINGS_2.alias)
        await expect(generalTab.serviceNameTxtFld).toBeHidden()
        await expect(generalTab.serviceName).toHaveText(PK_SETTINGS_2.serviceName!)
        await expect(generalTab.parentGroup).toHaveText(PK_SETTINGS_2.parentId)

        await generalTab.packageNameTxtFld.fill('new-package-2')
        // await generalTab.packageVisibilitySwitch.click()
        await generalTab.descriptionTxtFld.fill('new-description-2')
        await generalTab.defReleaseVersionAc.click()
        await generalTab.defReleaseVersionAc.getListItem(`${V_P_PKG_SET_FOR_SET_RELEASE_N.version} ${V_P_PKG_SET_FOR_SET_RELEASE_N.status}`).click()
        await generalTab.saveBtn.click()

        await expect(generalTab.packageName).toHaveText('new-package-2')
        await expect(generalTab.description).toHaveText('new-description-2')
        await expect(generalTab.defReleaseVersion).toHaveText(V_P_PKG_SET_FOR_SET_RELEASE_N.version)
      })
    })

  test('[P-PKDS-3-N] Set an already taken Service Name',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9084` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await portalPage.gotoPackage(PK_SETTINGS_3, SETTINGS_TAB_GENERAL)
      await generalTab.editBtn.click()
      await generalTab.serviceNameTxtFld.fill(PK_SETTINGS_2.serviceName!)
      await generalTab.saveBtn.click()

      await expect(portalPage.snackbar).toContainText(`Service name ${PK_SETTINGS_2.serviceName} already taken`)
    })

  test('[P-PKDTS-2] Opening Version from the Versions list',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4469` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const testPackage = PK11
      const testVersionRow = versionsTab.getVersionRow(V_P_PKG_OVERVIEW_R.version)

      await test.step('Open Package Versions tab', async () => {
        await portalPage.gotoPackage(testPackage, SETTINGS_TAB_VERSIONS)

        await expect(testVersionRow.statusCell).toHaveText(RELEASE_VERSION_STATUS)
        await expect(testVersionRow.labelsCell).toContainText('Package Overview')
        await expect(testVersionRow.publicationDateCell).not.toBeEmpty()
        await expect(testVersionRow.publishedByCell).toHaveText(SYSADMIN.name)
        await expect(testVersionRow.previousVersionCell).toHaveText(V_P_PKG_OVERVIEW_R.previousVersion!)
      })

      await test.step('Open Version', async () => {
        await testVersionRow.versionLink.click()

        await expect(versionPage.overviewTab.summaryTab.body.summary.currentVersion).toHaveText(V_P_PKG_OVERVIEW_R.version)
      })
    })

  test('[P-PKDTS-3.1] Search Version in the Versions list',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4470` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const testPackage = PK11

      await portalPage.gotoPackage(testPackage, SETTINGS_TAB_VERSIONS)

      await test.step('Search by Version', async () => {
        await versionsTab.searchbar.fill(V_P_PKG_DRAFT_R.version)

        await expect(versionsTab.getVersionRow()).toHaveCount(1)
        await expect(versionsTab.getVersionRow(V_P_PKG_DRAFT_R.version)).toBeVisible()
      })

      await test.step('Search by Label', async () => {
        await versionsTab.searchbar.fill('overview')

        await expect(versionsTab.getVersionRow()).toHaveCount(1)
        await expect(versionsTab.getVersionRow(V_P_PKG_OVERVIEW_R.version)).toBeVisible()
      })
    })

  test('[P-PKDTS-3.2] Filtering Versions in the Versions list',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4470` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const testPackage = PK11

      await portalPage.gotoPackage(testPackage, SETTINGS_TAB_VERSIONS)

      await test.step('Draft versions', async () => {
        await versionsTab.draftBtn.click()

        await expect(versionsTab.getVersionRow()).toHaveCount(13)
        await expect(versionsTab.getVersionRow(V_P_PKG_DRAFT_R.version)).toBeVisible()
      })

      await test.step('Release versions', async () => {
        await versionsTab.releaseBtn.click()

        await expect(versionsTab.getVersionRow()).toHaveCount(9)
        await expect(versionsTab.getVersionRow(V_P_PKG_OVERVIEW_R.version)).toBeVisible()
      })

      await test.step('Archived versions', async () => {
        await versionsTab.archivedBtn.click()

        await expect(versionsTab.getVersionRow()).toHaveCount(1)
        await expect(versionsTab.getVersionRow(V_P_PKG_ARCHIVED_R.version)).toBeVisible()
      })

      await test.step('All versions', async () => {
        await versionsTab.allBtn.click()

        await expect(versionsTab.getVersionRow(V_P_PKG_OVERVIEW_R.version)).toBeVisible()
        await expect(versionsTab.getVersionRow(V_P_PKG_DRAFT_R.version)).toBeVisible()
        await expect(versionsTab.getVersionRow(V_P_PKG_ARCHIVED_R.version)).toBeVisible()
      })
    })

  test('[P-PKDTS-5] Updating Version',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4472` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const testPackage = PK_SETTINGS_2
      const testVersionRow = versionsTab.getVersionRow(V_P_PKG_SET_FOR_UPDATE_N.version)

      await test.step('Open Package Versions tab', async () => {
        await portalPage.gotoPackage(testPackage, SETTINGS_TAB_VERSIONS)

        await expect(testVersionRow.statusCell).toHaveText(RELEASE_VERSION_STATUS)
        await expect(testVersionRow.labelsCell).toBeEmpty()
      })

      await test.step('Update Version', async () => {
        await testVersionRow.openEditVersionDialog()
        await versionsTab.editVersionDialog.fillForm({
          status: DRAFT_VERSION_STATUS,
          labels: ['new-label'],
        })
        await versionsTab.editVersionDialog.saveBtn.click()

        await expect(versionsTab.editVersionDialog.saveBtn).toBeHidden()
        await expect(testVersionRow.statusCell).toHaveText(DRAFT_VERSION_STATUS)
        await expect(testVersionRow.labelsCell).toHaveText('new-label')
      })
    })

  test('[P-PKDTS-6] Delete Version',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4473` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { versionsTab } = versionPage.packageSettingsPage
      const testPackage = PK_SETTINGS_2
      const testVersionRow = versionsTab.getVersionRow(V_P_PKG_SET_FOR_DELETE_N.version)

      await test.step('Open Package Versions tab', async () => {
        await portalPage.gotoPackage(testPackage, SETTINGS_TAB_VERSIONS)

        await expect(testVersionRow).toBeVisible()
      })

      await test.step('Delete Version', async () => {
        await testVersionRow.openDeleteVersionDialog()
        await versionsTab.deleteVersionDialog.deleteBtn.click()

        await expect(versionsTab.deleteVersionDialog.deleteBtn).toBeHidden({ timeout: SNAPSHOT_TIMEOUT })
        await expect(portalPage.snackbar).toContainText(VERSION_DELETED_MSG)
        await expect(testVersionRow).toBeHidden()
      })
    })
})
