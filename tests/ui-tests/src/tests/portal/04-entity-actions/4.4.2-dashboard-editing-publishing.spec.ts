import { registerVersionFiles, test } from '@fixtures'
import { VERSION_CHANGES_TAB_REST } from '@portal/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import {
  D11,
  D12,
  D121,
  D122,
  D123,
  GET_PET_BY_TAG_V2_SWAGGER,
  PK11,
  PK12,
  V_P_DSH_CONFLICT_PKG_NESTED_R,
  V_P_DSH_DRAFT_N,
  V_P_DSH_OVERVIEW_NESTED_R,
  V_P_DSH_OVERVIEW_R,
  V_P_DSH_RELEASE_N,
  V_P_DSH_REPUBLISH_N,
  V_P_PKG_FOR_DASHBOARDS_REST_BASE_R,
} from '@test-data/portal'
import type { Version } from '@test-data/props'
import { PUBLISH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'

test.describe('4.4.2 Dashboard editing/publishing', () => {

  test('[P-PUDSH-1] Publishing a new version in an empty dashboard (create version button)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4496` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1226` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab, packageSettingsPage } = versionPage
      const { confPackagesTab, publishVersionDialog } = configureVersionTab

      await test.step('Open Configure Dashboard Version tab', async () => {
        await portalPage.gotoDashboard(D121)
        await versionPage.toolbar.createVersionBtn.click()

        await expect.soft(configureVersionTab.publishBtn).not.toBeEnabled()
      })

      await test.step('Publish Draft Version', async () => {
        await confPackagesTab.addPackageBtn.click()
        await confPackagesTab.addPackageDialog.fillForm({
          packageId: PK12.packageId,
          version: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version,
        })
        await confPackagesTab.addPackageDialog.addBtn.click()
        await configureVersionTab.publishBtn.click()
        await publishVersionDialog.fillForm({
          version: 'empty-by-button',
          status: 'draft',
        })
        await publishVersionDialog.publishBtn.click()

        await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect.soft(versionPage.toolbar.title).toHaveText(D121.name)
        await expect.soft(versionPage.toolbar.versionSlt).toHaveText('empty-by-button')
        await expect.soft(versionPage.toolbar.status).toHaveText('draft')
      })

      await test.step('Open Versions tab in settings', async () => { //Cover TestCase-A-4755
        await versionPage.toolbar.settingsBtn.click()
        await packageSettingsPage.versionsTab.click()

        //! await expect(packageSettingsPage.versionsTab.getVersionRow('publish-draft')).toBeVisible() //Issue TestCase-B-1226
      })
    })

  test('[P-PUDSH-2] Publishing a new version in an empty dashboard (link)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5975` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab } = versionPage
      const { confPackagesTab } = configureVersionTab

      await portalPage.gotoDashboard(D122)
      await versionPage.createVersionLink.click()

      await expect.soft(configureVersionTab.publishBtn).not.toBeEnabled()
      await expect.soft(confPackagesTab.addPackageBtn).toBeEnabled()
    })

  test('[P-PUDSH-3] Publishing a new version in a dashboard with content (add new version button)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4497` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab } = versionPage
      const { confPackagesTab, publishVersionDialog } = configureVersionTab

      await portalPage.gotoDashboard(D123)
      await versionPage.toolbar.createVersionBtn.click()

      await expect.soft(configureVersionTab.publishBtn).toBeDisabled()

      await confPackagesTab.addPackageBtn.click()
      await confPackagesTab.addPackageDialog.fillForm({
        packageId: PK12.packageId,
        version: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version,
      })
      await confPackagesTab.addPackageDialog.addBtn.click()

      await configureVersionTab.publishBtn.click()
      await publishVersionDialog.fillForm({
        version: '2401.1',
        status: 'release',
      })
      await publishVersionDialog.publishBtn.click()

      await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
      await expect.soft(versionPage.toolbar.title).toHaveText(D123.name)
      await expect.soft(versionPage.toolbar.versionSlt).toHaveText('2401.1')
      await expect.soft(versionPage.toolbar.status).toHaveText('release')
    })

  test('[P-PUDSH-5] Publishing a dashboard version with labels',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5897` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab, overviewTab } = versionPage
      const { publishVersionDialog } = configureVersionTab

      await portalPage.gotoVersionEditing(V_P_DSH_DRAFT_N)
      await configureVersionTab.publishBtn.click()
      await publishVersionDialog.fillForm({
        version: 'with-labels',
        status: 'draft',
        labels: ['label-1', 'label-2'],
      })
      await publishVersionDialog.publishBtn.click()

      await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('with-labels')
      await expect.soft(overviewTab.summaryTab.body.labels).toHaveText('label-1label-2')
    })

  test('[P-PUDSH-6] Publishing a dashboard version with previous version',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5898` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab, overviewTab } = versionPage
      const { publishVersionDialog } = configureVersionTab

      await portalPage.gotoVersionEditing(V_P_DSH_DRAFT_N)
      await configureVersionTab.publishBtn.click()
      await publishVersionDialog.fillForm({
        version: 'with-prev-version',
        status: 'draft',
        previousVersion: `${V_P_DSH_RELEASE_N.version} ${V_P_DSH_RELEASE_N.status}`,
      })
      await publishVersionDialog.publishBtn.click()

      await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('with-prev-version')
      await expect.soft(overviewTab.summaryTab.body.summary.previousVersion).toHaveText(V_P_DSH_RELEASE_N.version)
    })

  test('[P-PUDSH-7] Publishing a dashboard version with conflicts',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5900` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { configureVersionTab } = versionPage
      const { confPackagesTab, publishVersionDialog } = configureVersionTab

      await portalPage.gotoVersionEditing(V_P_DSH_DRAFT_N)
      await confPackagesTab.addPackageBtn.click()
      await confPackagesTab.addPackageDialog.fillForm({
        packageId: D12.packageId,
        version: V_P_DSH_CONFLICT_PKG_NESTED_R.version,
      })
      await confPackagesTab.addPackageDialog.addBtn.click()

      await expect.soft(confPackagesTab.conflictAlertIcon).toBeVisible()
      await expect.soft(confPackagesTab.getPackageRow(PK11).packageCell.conflictAlertIcon).toBeVisible()
      await expect.soft(confPackagesTab.getPackageRow(D12).packageCell.conflictIndicatorIcon).toBeVisible()

      await confPackagesTab.getPackageRow(D12).expandBtn.click()

      await expect.soft(confPackagesTab.getPackageRow(PK11, 2).packageCell.conflictAlertIcon).toBeVisible()

      await configureVersionTab.publishBtn.click()
      await publishVersionDialog.fillForm({
        version: 'with-conflict',
        status: 'draft',
      })
      await publishVersionDialog.publishBtn.click()

      await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText('with-conflict')

      await overviewTab.packagesTab.click()
      await overviewTab.packagesTab.getPackageRow(D12).expandBtn.click()

      await expect.soft(overviewTab.packagesTab.getExcludedPackageRow(PK11)).toBeVisible()
      await expect.soft(overviewTab.packagesTab.getIncludedPackageRow(PK11)).toBeVisible()
    })

  test('[P-PUDSH-10] Editing and re-publishing a dashboard version',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4498` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { configureVersionTab, overviewTab } = versionPage
      const { publishVersionDialog } = configureVersionTab
      const { confPackagesTab } = versionPage.configureVersionTab
      const testDashboard = V_P_DSH_REPUBLISH_N.pkg
      const testVersion = V_P_DSH_REPUBLISH_N

      await portalPage.gotoVersionEditing(testVersion)

      await expect(configureVersionTab.title).toHaveText(`${testDashboard.name}: Edit Version`)
      await expect(configureVersionTab.version).toHaveText(`${testVersion.version}`)
      await expect(configureVersionTab.status).toHaveText(`${testVersion.status}`)

      await confPackagesTab.getPackageRow(PK11).hover()
      await confPackagesTab.getPackageRow(PK11).removeBtn.click()
      await confPackagesTab.removePackageDialog.removeBtn.click()

      await expect(confPackagesTab.getPackageRow(PK11)).not.toBeVisible()

      await confPackagesTab.addPackageBtn.click()
      await confPackagesTab.addPackageDialog.fillForm({
        packageId: PK12.packageId,
        version: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version,
      })
      await confPackagesTab.addPackageDialog.addBtn.click()

      await expect.soft(confPackagesTab.getPackageRow(PK12).versionCell).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version)
      await expect.soft(confPackagesTab.getPackageRow(PK12).statusCell).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.status)

      await configureVersionTab.publishBtn.click()
      await publishVersionDialog.fillForm({
        version: testVersion.version,
        status: 'draft',
      })
      await publishVersionDialog.publishBtn.click()

      await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(testVersion.version)
      await expect.soft(overviewTab.summaryTab.body.summary.revision).toHaveText('2')

      await overviewTab.packagesTab.click()

      await expect.soft(overviewTab.packagesTab.getPackageRow(PK12)).toBeVisible()
    })

  test('[P-PUDSH-11] Exiting dashboard editing mode',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5902` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { overviewTab, configureVersionTab } = versionPage
      const { confPackagesTab } = configureVersionTab

      await portalPage.gotoVersionEditing({
        pkg: D123,
        version: V_P_DSH_DRAFT_N.version,
      })

      await confPackagesTab.addPackageBtn.click()
      await confPackagesTab.addPackageDialog.fillForm({
        packageId: D12.packageId,
        version: V_P_DSH_OVERVIEW_NESTED_R.version,
      })
      await confPackagesTab.addPackageDialog.addBtn.click()

      await expect(confPackagesTab.getPackageRow(D12)).toBeVisible()

      await configureVersionTab.exitBtn.click()

      await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(V_P_DSH_DRAFT_N.version)
      await expect(confPackagesTab.notExistAlertIcon).toBeHidden()
    })

  test.describe('Previous version package', () => {
    const URL_ANNOTATION = { type: 'URL', description: 'https://github.com/Netcracker/qubership-apihub/issues/815' }
    const MSG_OPTION_OTHER_DASHBOARD_RELEASE = `${V_P_DSH_OVERVIEW_R.version} ${V_P_DSH_OVERVIEW_R.status}`

    /** Published by P-PUDSH-12 with a previous version from D11. */
    const V_P_DSH_FOREIGN_PREV_N: Version = {
      pkg: D123,
      version: 'with-foreign-prev-version',
      status: 'draft',
    }

    test('[P-PUDSH-12-BUG-1043] Publishing a dashboard version with a previous version from another dashboard',
      {
        annotation: [
          URL_ANNOTATION,
          { type: 'URL', description: 'https://github.com/Netcracker/qubership-apihub/issues/1043' },
        ],
      },
      async ({ sysadminPage: page, usedResources }) => {

        registerVersionFiles(usedResources, V_P_PKG_FOR_DASHBOARDS_REST_BASE_R)

        const portalPage = new PortalPage(page)
        const { versionDashboardPage: versionPage } = portalPage
        const { configureVersionTab, overviewTab } = versionPage
        const { publishVersionDialog } = configureVersionTab
        const { summary } = overviewTab.summaryTab.body

        await portalPage.gotoVersionEditing(V_P_DSH_DRAFT_N)
        await configureVersionTab.publishBtn.click()
        await publishVersionDialog.fillForm({
          version: V_P_DSH_FOREIGN_PREV_N.version,
          status: V_P_DSH_FOREIGN_PREV_N.status,
          previousVersionPackage: D11,
          previousVersion: MSG_OPTION_OTHER_DASHBOARD_RELEASE,
        })
        await publishVersionDialog.publishBtn.click()

        await test.step('Verify the version is published into the current dashboard with the previous version', async () => {
          await expect(publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
          await expect(versionPage.toolbar.title).toHaveText(D123.name)
          await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_P_DSH_FOREIGN_PREV_N.version)
          await expect.soft(summary.previousVersion).toHaveText(V_P_DSH_OVERVIEW_R.version)
        })

        await summary.previousVersionLink.click()

        await test.step('Verify the previous version opens in another dashboard', async () => {
          await expect(versionPage.toolbar.title).toHaveText(D11.name)
          await expect.soft(versionPage.toolbar.versionSlt).toHaveText(V_P_DSH_OVERVIEW_R.version)
        })

        await portalPage.gotoVersion(V_P_DSH_FOREIGN_PREV_N, VERSION_CHANGES_TAB_REST)

        await test.step('Verify API Changes loads the comparison against the other dashboard', async () => {
          await expect(versionPage.apiChangesTab.table.getOperationRow(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()
          await expect(versionPage.apiChangesTab.toolbar.comparedToLnk).toHaveText(V_P_DSH_OVERVIEW_R.version)
        })

        await versionPage.apiChangesTab.toolbar.comparedToLnk.click()

        await test.step('Verify the API Changes baseline link opens the other dashboard', async () => {
          await expect(versionPage.toolbar.title).toHaveText(D11.name)
          await expect(versionPage.toolbar.versionSlt).toHaveText(V_P_DSH_OVERVIEW_R.version)
        })
      })
  })
})
