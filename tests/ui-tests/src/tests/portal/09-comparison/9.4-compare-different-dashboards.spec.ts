import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  CREATE_LIST_OF_USERS_V1,
  P_DSH_DIFF_111_R,
  P_DSH_DIFF_222_R,
  P_DSH_DIFF_333_R,
  P_DSH_DIFF_444_R,
  P_WS_DSH_COMPARISON1_R,
  PK11,
  PK12,
  PK14,
  V_DSH_DIFF_1111_1_R,
  V_DSH_DIFF_1111_2_R,
  V_DSH_DIFF_2222_1_R,
  V_DSH_DIFF_3333_1_R,
  V_DSH_DIFF_4444_1_R,
} from '@test-data/portal'
import { expect } from '@services/expect-decorator'
import { MIDDLE_EXPECT, TICKET_BASE_URL } from '@test-setup'

test.describe('09.4 Compare different Dashboards', () => {

  test('[P-CDD-0.1] General validation of the Comparison dialog',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10156` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog } = versionPage
      const testVersion = V_DSH_DIFF_1111_1_R
      const testWorkspace = P_WS_DSH_COMPARISON1_R
      const testDashboard = P_DSH_DIFF_111_R

      await portalPage.gotoVersion(testVersion)

      await test.step('Open the Change Dashboards dialog', async () => {
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.versionsItm.click()
        await compareDialog.changeDashboardsBtn.click()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.currentDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toHaveValue(testVersion.version)
      })
    })

  test('[P-CDD-0.2] Clear "Workspace" field',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10156` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog } = versionPage
      const testVersion = V_DSH_DIFF_1111_1_R
      const testWorkspace = P_WS_DSH_COMPARISON1_R
      const testDashboard = P_DSH_DIFF_111_R

      await test.step('Open the Change Dashboards dialog', async () => {
        await portalPage.gotoVersion(testVersion)
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.versionsItm.click()
        await compareDialog.changeDashboardsBtn.click()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
      })

      await test.step('Clear previous "Workspace"', async () => {
        await compareDialog.previousWorkspaceAc.clear()

        await expect(compareDialog.previousWorkspaceAc).toBeEmpty()
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toBeEmpty()
        await expect(compareDialog.currentDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toHaveValue(testVersion.version)
      })

      await test.step('Clear current "Workspace"', async () => {
        await compareDialog.currentWorkspaceAc.clear()

        await expect(compareDialog.previousWorkspaceAc).toBeEmpty()
        await expect(compareDialog.currentWorkspaceAc).toBeEmpty()
        await expect(compareDialog.previousDashboardAc).toBeEmpty()
        await expect(compareDialog.currentDashboardAc).toBeEmpty()
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toBeEmpty()
      })
    })

  test('[P-CDD-0.3] Clear "Dashboard" field',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10156` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog } = versionPage
      const testVersion = V_DSH_DIFF_1111_1_R
      const testWorkspace = P_WS_DSH_COMPARISON1_R
      const testDashboard = P_DSH_DIFF_111_R

      await test.step('Open the Change Dashboards dialog', async () => {
        await portalPage.gotoVersion(testVersion)
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.versionsItm.click()
        await compareDialog.changeDashboardsBtn.click()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
      })

      await test.step('Clear previous "Dashboard"', async () => {
        await compareDialog.previousDashboardAc.clear()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toBeEmpty()
        await expect(compareDialog.currentDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toHaveValue(testVersion.version)
      })

      await test.step('Clear current "Dashboard"', async () => {
        await compareDialog.currentDashboardAc.clear()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toBeEmpty()
        await expect(compareDialog.currentDashboardAc).toBeEmpty()
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toBeEmpty()
      })
    })

  test('[P-CDD-0.4] Clear "Version" field',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10156` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog } = versionPage
      const testVersion = V_DSH_DIFF_1111_1_R
      const testWorkspace = P_WS_DSH_COMPARISON1_R
      const testDashboard = P_DSH_DIFF_111_R

      await test.step('Open the Change Dashboards dialog', async () => {
        await portalPage.gotoVersion(testVersion)
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.versionsItm.click()
        await compareDialog.changeDashboardsBtn.click()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
      })

      await test.step('Clear previous "Version"', async () => {
        await compareDialog.previousVersionAc.clear()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.currentDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toHaveValue(testVersion.version)
      })

      await test.step('Clear current "Version"', async () => {
        await compareDialog.currentVersionAc.clear()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(testWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.currentDashboardAc).toHaveValue(testDashboard.name)
        await expect(compareDialog.previousVersionAc).toBeEmpty()
        await expect(compareDialog.currentVersionAc).toBeEmpty()
      })
    })

  test('[P-CDD-0.5] Compare dashboards from different workspaces (changes details)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10156` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1443` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, compareDashboardsPage: comparePage } = versionPage
      const currentVersion = V_DSH_DIFF_4444_1_R
      const previousVersion = V_DSH_DIFF_1111_1_R
      const currentDashboard = P_DSH_DIFF_444_R
      const previousDashboard = P_DSH_DIFF_111_R
      const currentWorkspace = currentDashboard.workspace
      const previousWorkspace = previousDashboard.workspace
      const pk11Row = comparePage.compareContent.getPackageRow(PK11)
      const pk14Row = comparePage.compareContent.getPackageRow(PK14)

      await portalPage.gotoVersion(previousVersion)

      await test.step('Open the Change Dashboards dialog', async () => {
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.versionsItm.click()
        await compareDialog.changeDashboardsBtn.click()

        await expect(compareDialog.currentVersionAc).toHaveValue(previousVersion.version)
      })

      await test.step('Set previous version', async () => {
        await compareDialog.previousWorkspaceAc.set(currentWorkspace.name)
        await compareDialog.previousDashboardAc.clear()
        await compareDialog.previousDashboardAc.click()

        await expect(compareDialog.previousDashboardAc.getListItem()).toHaveCount(1)
        await expect(compareDialog.previousDashboardAc.getListItem(currentDashboard.name)).toBeVisible()

        await compareDialog.previousDashboardAc.getListItem(currentDashboard.name).click()
        await compareDialog.previousVersionAc.click()

        await expect(compareDialog.previousVersionAc.getListItem()).toHaveCount(1)
        await expect(compareDialog.previousVersionAc.getListItem(`${currentVersion.version} ${currentVersion.status}`)).toBeVisible()

        await compareDialog.previousVersionAc.getListItem(`${currentVersion.version} ${currentVersion.status}`).click()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(currentWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(previousWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toHaveValue(currentDashboard.name)
        await expect(compareDialog.currentDashboardAc).toHaveValue(previousDashboard.name)
        await expect(compareDialog.previousVersionAc).toHaveValue(currentVersion.version)
        await expect(compareDialog.currentVersionAc).toHaveValue(previousVersion.version)
      })

      await test.step('Swap', async () => {
        await compareDialog.swapBtn.click()

        await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousWorkspace.name)
        await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentWorkspace.name)
        await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
        await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
        await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
        await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
      })

      await test.step('Compare Dashboards', async () => {
        await compareDialog.compareBtn.click()

        await expect(compareDialog.compareBtn).toBeHidden({ timeout: MIDDLE_EXPECT })
        await expect(comparePage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(comparePage.swapper.rightTitle).toHaveText(currentVersion.version)
        //! await expect(comparePage.toolbar.allBtn).toBePressed() //Issue TestCase-B-1443

        await comparePage.toolbar.allBtn.click() //!WA TestCase-B-1443

        await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)
        await expect.soft(pk11Row.rightSummary.restApiChanges.breaking).toHaveText('2')
        await expect.soft(pk11Row.rightSummary.restApiChanges.risky).toHaveText('2')
        await expect.soft(pk11Row.rightSummary.restApiChanges.deprecated).toHaveText('2')
        await expect.soft(pk11Row.rightSummary.restApiChanges.nonBreaking).toHaveText('2')
        await expect.soft(pk11Row.rightSummary.restApiChanges.annotation).toHaveText('1')
        await expect.soft(pk11Row.rightSummary.restApiChanges.unclassified).toHaveText('1')

        //! await expect.soft(pk14Row.rightSummary.graphQlChanges.nonBreaking).toHaveText('4') //Issue GraphQL checks temporarily disabled
      })

      await test.step('Filter by API type', async () => {
        await comparePage.toolbar.restApiBtn.click()

        await expect(comparePage.compareContent.getPackageRow()).toHaveCount(1)
        await expect(pk11Row).toBeVisible()

        await comparePage.toolbar.graphQlBtn.click()

        await expect(comparePage.compareContent.getPackageRow()).toHaveCount(1)
        await expect(pk14Row).toBeVisible()
      })

      await test.step('Filter by changes type', async () => {
        await comparePage.toolbar.allBtn.click()

        await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

        await comparePage.toolbar.breakingChangesFilterBtn.click()

        await expect(comparePage.compareContent.getPackageRow()).toHaveCount(1)
      })
    })

  test('[P-CDD-1] Compare dashboards from different workspaces (titles, breadcrumbs)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10147` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1437` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        compareSelectDialog: compareDialog,
        compareDashboardsPage,
        comparePackagesPage,
        compareOperationsPage,
      } = versionPage
      const currentVersion = V_DSH_DIFF_4444_1_R
      const previousVersion = V_DSH_DIFF_1111_1_R
      const currentDashboard = P_DSH_DIFF_444_R
      const previousDashboard = P_DSH_DIFF_111_R
      const testPackage = PK11
      const testOperation = CREATE_LIST_OF_USERS_V1

      await test.step('Open "Dashboards" comparison', async () => {
        await portalPage.gotoComparisonDashboards(currentDashboard, currentVersion.version, previousVersion.version, previousDashboard)

        await expect(compareDashboardsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareDashboardsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareDashboardsPage.swapper.leftBreadcrumbs).toHaveText(`${previousDashboard.workspace.name}/${previousDashboard.parents[1].name}/${previousDashboard.name}`)
        await expect(compareDashboardsPage.swapper.rightBreadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.name}`)

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await compareDashboardsPage.swapper.editBtn.click()

          await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
          await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
          await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
          await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeDisabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Package" comparison', async () => {
        await compareDashboardsPage.compareContent.getPackageRow(testPackage).click()

        await expect(comparePackagesPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(comparePackagesPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(comparePackagesPage.swapper.leftBreadcrumbs).toHaveText(`${previousDashboard.workspace.name}/${previousDashboard.parents[1].name}/${previousDashboard.name}`)
        await expect(comparePackagesPage.swapper.rightBreadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.name}`)

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await comparePackagesPage.swapper.editBtn.click()

          await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
          await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
          await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
          await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeDisabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Operation" comparison', async () => {
        await comparePackagesPage.compareContent.getOperationRow(testOperation).click()

        await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareOperationsPage.swapper.leftBreadcrumbs).toHaveText(`${previousDashboard.workspace.name}/${previousDashboard.parents[1].name}/${previousDashboard.name}`)
        await expect(compareOperationsPage.swapper.rightBreadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.name}`)

        //!Issue TestCase-B-1437
        // await test.step('Open "Select Versions To Compare" dialog', async () => {
        //   await compareOperationsPage.swapper.editBtn.click()
        //
        //   await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
        //   await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
        //   await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
        //   await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
        //   await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
        //   await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
        //   await expect(compareDialog.changeDashboardsBtn).toBeDisabled()
        // })
      })
    })

  test('[P-CDD-2] Compare dashboards from different groups',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10149` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1437` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        compareSelectDialog: compareDialog,
        compareDashboardsPage,
        comparePackagesPage,
        compareOperationsPage,
      } = versionPage
      const currentVersion = V_DSH_DIFF_2222_1_R
      const previousVersion = V_DSH_DIFF_1111_1_R
      const currentDashboard = P_DSH_DIFF_222_R
      const previousDashboard = P_DSH_DIFF_111_R
      const testPackage = PK11
      const testOperation = CREATE_LIST_OF_USERS_V1

      await test.step('Open "Dashboards" comparison', async () => {
        await portalPage.gotoComparisonDashboards(currentDashboard, currentVersion.version, previousVersion.version, previousDashboard)

        await expect(compareDashboardsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}`)
        await expect(compareDashboardsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareDashboardsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareDashboardsPage.swapper.leftBreadcrumbs).toHaveText(previousDashboard.name)
        await expect(compareDashboardsPage.swapper.rightBreadcrumbs).toHaveText(`${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}/${currentDashboard.name}`)

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await compareDashboardsPage.swapper.editBtn.click()

          await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
          await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
          await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
          await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeDisabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Package" comparison', async () => {
        await compareDashboardsPage.compareContent.getPackageRow(testPackage).click()

        await expect(comparePackagesPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}`)
        await expect(comparePackagesPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(comparePackagesPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(comparePackagesPage.swapper.leftBreadcrumbs).toHaveText(previousDashboard.name)
        await expect(comparePackagesPage.swapper.rightBreadcrumbs).toHaveText(`${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}/${currentDashboard.name}`)

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await comparePackagesPage.swapper.editBtn.click()

          await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
          await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
          await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
          await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeDisabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Operation" comparison', async () => {
        await comparePackagesPage.compareContent.getOperationRow(testOperation).click()

        await expect(comparePackagesPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}`)
        await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareOperationsPage.swapper.leftBreadcrumbs).toHaveText(previousDashboard.name)
        await expect(compareOperationsPage.swapper.rightBreadcrumbs).toHaveText(`${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}/${currentDashboard.name}`)

        //!Issue TestCase-B-1437
        // await test.step('Open "Select Versions To Compare" dialog', async () => {
        //   await compareOperationsPage.swapper.editBtn.click()
        //
        //   await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
        //   await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
        //   await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
        //   await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
        //   await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
        //   await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
        //   await expect(compareDialog.changeDashboardsBtn).toBeDisabled()
        // })
      })
    })

  test('[P-CDD-3] Compare different versions of one dashboard',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10151` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1437` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        compareSelectDialog: compareDialog,
        compareDashboardsPage,
        comparePackagesPage,
        compareOperationsPage,
      } = versionPage
      const currentVersion = V_DSH_DIFF_1111_2_R
      const previousVersion = V_DSH_DIFF_1111_1_R
      const currentDashboard = P_DSH_DIFF_111_R
      const testPackage = PK11
      const testOperation = CREATE_LIST_OF_USERS_V1

      await test.step('Open "Dashboards" comparison', async () => {
        await portalPage.gotoComparisonDashboards(currentDashboard, currentVersion.version, previousVersion.version)

        await expect(compareDashboardsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.name}`)
        await expect(compareDashboardsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareDashboardsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareDashboardsPage.swapper.leftBreadcrumbs).toBeHidden()
        await expect(compareDashboardsPage.swapper.rightBreadcrumbs).toBeHidden()

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await compareDashboardsPage.swapper.editBtn.click()

          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeEnabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Package" comparison', async () => {
        await compareDashboardsPage.compareContent.getPackageRow(testPackage).click()

        await expect(comparePackagesPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.name}`)
        await expect(comparePackagesPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(comparePackagesPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(comparePackagesPage.swapper.leftBreadcrumbs).toBeHidden()
        await expect(comparePackagesPage.swapper.rightBreadcrumbs).toBeHidden()

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await comparePackagesPage.swapper.editBtn.click()

          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeEnabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Operation" comparison', async () => {
        await comparePackagesPage.compareContent.getOperationRow(testOperation).click()

        await expect(compareOperationsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.name}`)
        await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareOperationsPage.swapper.leftBreadcrumbs).toBeHidden()
        await expect(compareOperationsPage.swapper.rightBreadcrumbs).toBeHidden()

        //!Issue TestCase-B-1437
        // await test.step('Open "Select Versions To Compare" dialog', async () => {
        //   await compareOperationsPage.swapper.editBtn.click()
        //
        //   await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
        //   await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
        //   await expect(compareDialog.changeDashboardsBtn).toBeEnabled()
        // })
      })
    })

  test('[P-CDD-4] Compare different dashboards (but same workspace and group)',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10152` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1437` },
        {
          type: 'Flaky',
          description: 'Sometimes, when clicking the "Edit" button, a dialog with only versions is displayed instead of the full dialog with Workspaces and Dashboards.',
        },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        compareSelectDialog: compareDialog,
        compareDashboardsPage,
        comparePackagesPage,
        compareOperationsPage,
      } = versionPage
      const currentVersion = V_DSH_DIFF_3333_1_R
      const previousVersion = V_DSH_DIFF_2222_1_R
      const currentDashboard = P_DSH_DIFF_333_R
      const previousDashboard = P_DSH_DIFF_222_R
      const testPackage = PK12
      const testOperation = CREATE_LIST_OF_USERS_V1

      await test.step('Open "Dashboards" comparison', async () => {
        await portalPage.gotoComparisonDashboards(currentDashboard, currentVersion.version, previousVersion.version, previousDashboard)

        await expect(compareDashboardsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}`)
        await expect(compareDashboardsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareDashboardsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareDashboardsPage.swapper.leftBreadcrumbs).toHaveText(previousDashboard.name)
        await expect(compareDashboardsPage.swapper.rightBreadcrumbs).toHaveText(currentDashboard.name)

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await compareDashboardsPage.swapper.editBtn.click()

          await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
          await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
          await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
          await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeDisabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Package" comparison', async () => {
        await compareDashboardsPage.compareContent.getPackageRow(testPackage).click()

        await expect(comparePackagesPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}`)
        await expect(comparePackagesPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(comparePackagesPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(comparePackagesPage.swapper.leftBreadcrumbs).toHaveText(previousDashboard.name)
        await expect(comparePackagesPage.swapper.rightBreadcrumbs).toHaveText(currentDashboard.name)

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await comparePackagesPage.swapper.editBtn.click()

          await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
          await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
          await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
          await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
          await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
          await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
          await expect(compareDialog.changeDashboardsBtn).toBeDisabled()

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Operation" comparison', async () => {
        await comparePackagesPage.compareContent.getOperationRow(testOperation).click()

        await expect(compareDashboardsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}`)
        await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousVersion.version)
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareOperationsPage.swapper.leftBreadcrumbs).toHaveText(previousDashboard.name)
        await expect(compareOperationsPage.swapper.rightBreadcrumbs).toHaveText(currentDashboard.name)

        //!Issue TestCase-B-1437
        // await test.step('Open "Select Versions To Compare" dialog', async () => {
        //   await compareOperationsPage.swapper.editBtn.click()
        //
        //   await expect(compareDialog.previousWorkspaceAc).toHaveValue(previousDashboard.workspace.name)
        //   await expect(compareDialog.currentWorkspaceAc).toHaveValue(currentDashboard.workspace.name)
        //   await expect(compareDialog.previousDashboardAc).toHaveValue(previousDashboard.name)
        //   await expect(compareDialog.currentDashboardAc).toHaveValue(currentDashboard.name)
        //   await expect(compareDialog.previousVersionAc).toHaveValue(previousVersion.version)
        //   await expect(compareDialog.currentVersionAc).toHaveValue(currentVersion.version)
        //   await expect(compareDialog.changeDashboardsBtn).toBeDisabled()
        // })
      })
    })

  test('[P-CDD-5] Compare revisions of dashboard',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10153` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-10154` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1437` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const {
        compareSelectDialog: compareDialog,
        compareDashboardsPage,
        comparePackagesPage,
        compareOperationsPage,
      } = versionPage
      const currentVersion = V_DSH_DIFF_2222_1_R
      const currentDashboard = P_DSH_DIFF_222_R
      const currentRevision = '@2'
      const previousRevision = '@1'
      const testPackage = PK11
      const testOperation = CREATE_LIST_OF_USERS_V1

      await test.step('Open "Dashboards" comparison', async () => {
        await portalPage.gotoComparisonDashboards(currentDashboard, `${currentVersion.version}${currentRevision}`, `${currentVersion.version}${previousRevision}`)

        await expect(compareDashboardsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}/${currentDashboard.name}/${currentVersion.version}`)
        await expect(compareDashboardsPage.swapper.leftTitle).toHaveText(previousRevision)
        await expect(compareDashboardsPage.swapper.rightTitle).toHaveText(`${currentRevision}(latest)`)
        await expect(compareDashboardsPage.swapper.leftBreadcrumbs).toBeHidden()
        await expect(compareDashboardsPage.swapper.rightBreadcrumbs).toBeHidden()

        await test.step('Open "Select Revisions To Compare" dialog', async () => {
          await compareDashboardsPage.swapper.editBtn.click()

          await expect(compareDialog.previousRevisionAc).toHaveValue(previousRevision)
          //! await expect(compareDialog.currentVersionAc).toHaveValue(`${currentRevision} (latest)`) //Issue TestCase-A-10154

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Package" comparison', async () => {
        await compareDashboardsPage.compareContent.getPackageRow(testPackage).click()

        await expect(comparePackagesPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}/${currentDashboard.name}/${currentVersion.version}`)
        await expect(comparePackagesPage.swapper.leftTitle).toHaveText(previousRevision)
        await expect(comparePackagesPage.swapper.rightTitle).toHaveText(`${currentRevision}(latest)`)
        await expect(comparePackagesPage.swapper.leftBreadcrumbs).toBeHidden()
        await expect(comparePackagesPage.swapper.rightBreadcrumbs).toBeHidden()

        await test.step('Open "Select Versions To Compare" dialog', async () => {
          await comparePackagesPage.swapper.editBtn.click()

          await expect(compareDialog.previousRevisionAc).toHaveValue(previousRevision)
          //! await expect(compareDialog.currentVersionAc).toHaveValue(`${currentRevision} (latest)`) //Issue TestCase-A-10154

          await compareDialog.cancelBtn.click()
        })
      })

      await test.step('Open "Operation" comparison', async () => {
        await comparePackagesPage.compareContent.getOperationRow(testOperation).click()

        await expect(compareOperationsPage.toolbar.breadcrumbs).toHaveText(`${currentDashboard.workspace.name}/${currentDashboard.parents[1].name}/${currentDashboard.parents[2].name}/${currentDashboard.parents[3].name}/${currentDashboard.name}/${currentVersion.version}`)
        await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousRevision)
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText(`${currentRevision}(latest)`)
        await expect(compareOperationsPage.swapper.leftBreadcrumbs).toBeHidden()
        await expect(compareOperationsPage.swapper.rightBreadcrumbs).toBeHidden()

        //!Issue TestCase-B-1437
        // await test.step('Open "Select Versions To Compare" dialog', async () => {
        //   await compareOperationsPage.swapper.editBtn.click()
        //
        //   await expect(compareDialog.previousRevisionAc).toHaveValue(previousRevision)
        //!   await expect(compareDialog.currentVersionAc).toHaveValue(`${currentRevision} (latest)`) //Issue TestCase-A-10154
        // })
      })
    })
})
