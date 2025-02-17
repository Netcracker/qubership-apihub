import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import { MIDDLE_EXPECT, SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  CREATE_LIST_OF_USERS_V1,
  D11,
  PK11,
  PK12,
  PK14,
  V_P_DSH_COMPARISON_BASE_R,
  V_P_DSH_COMPARISON_CHANGED_R,
  V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R,
  V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R,
  V_P_PKG_FOR_DASHBOARDS_GQL_R,
  V_P_PKG_FOR_DASHBOARDS_REST_BASE_R,
  V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R,
} from '@test-data/portal'

test.describe('09.3 Compare Dashboard versions', () => {

  const testDashboard = D11

  test('[P-CODDOP-1] Opening a Compare Dashboards page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4749` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, compareDashboardsPage: comparePage } = versionPage

      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoVersion(currentVersion)

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.versionsItm.click()

      await expect(compareDialog.changeDashboardsBtn).not.toHaveClass(/MuiLoadingButton-loading/) //to prevent too early submit

      await compareDialog.previousVersionAc.click()
      await compareDialog.previousVersionAc.getListItem(`${previousVersion.version} ${previousVersion.status}`).click()
      await compareDialog.compareBtn.click()

      await expect.soft(comparePage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
      await expect.soft(comparePage.swapper.rightTitle).toHaveText(currentVersion.version)
    })

  test('[P-CODDFI-1] Filtering packages by Changes type on the Compare Dashboards page',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5899` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1443` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareDashboardsPage: comparePage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version)

      await expect(comparePage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.semiBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.deprecatedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.breakingChangesFilterBtn).toHaveText('2')
      await expect(comparePage.toolbar.semiBreakingChangesFilterBtn).toHaveText('1')
      await expect(comparePage.toolbar.deprecatedChangesFilterBtn).toHaveText('1')
      await expect(comparePage.toolbar.nonBreakingChangesFilterBtn).toHaveText('1')
      //! await expect(comparePage.toolbar.annotationChangesFilterBtn).toHaveText('2') //Issue GraphQL checks temporarily disabled
      await expect(comparePage.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')

      await comparePage.toolbar.allBtn.click() //!WA TestCase-B-1443
      await comparePage.toolbar.breakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.breakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      await comparePage.toolbar.semiBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.semiBreakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      await comparePage.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.deprecatedChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      await comparePage.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.nonBreakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      /*!await comparePage.toolbar.annotationChangesFilterBtn.click() //Issue GraphQL checks temporarily disabled

      await expect.soft(comparePage.toolbar.annotationChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      await comparePage.toolbar.unclassifiedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.unclassifiedChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      await comparePage.toolbar.breakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

      await comparePage.toolbar.semiBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.semiBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

      await comparePage.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.deprecatedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

      await comparePage.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

      await comparePage.toolbar.annotationChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(1)

      await comparePage.toolbar.unclassifiedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)*/
    })

  test('[P-CODDFI-2] Filtering packages by API type on the Compare Dashboards page',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6133` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1443` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareDashboardsPage: comparePage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version)

      await comparePage.toolbar.allBtn.click() //!WA TestCase-B-1443

      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)

      await comparePage.toolbar.restApiBtn.click()

      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

      await comparePage.toolbar.graphQlBtn.click()

      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(2)

      await comparePage.toolbar.allBtn.click()

      await expect(comparePage.compareContent.getPackageRow()).toHaveCount(3)
    })

  test('[P-CODDVW-1] Viewing package details on the Compare Dashboards page',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6063` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1443` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareDashboardsPage: comparePage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      const pk11Row = comparePage.compareContent.getPackageRow(PK11)
      const pk12Row = comparePage.compareContent.getPackageRow(PK12)
      const pk14Row = comparePage.compareContent.getPackageRow(PK14)

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version)

      await comparePage.toolbar.allBtn.click() //!WA TestCase-B-1443

      await expect.soft(pk11Row.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(pk11Row.leftSummary.dashboardPath).toHaveText(testDashboard.parentPath!)
      await expect.soft(pk11Row.leftSummary.packageVersionTitle).toHaveText(`${PK11.name} / ${V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.version}`)
      await expect.soft(pk11Row.leftSummary.packageVersionStatus).toHaveText(V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.status)
      await expect.soft(pk11Row.rightSummary.dashboardPath).toHaveText(testDashboard.parentPath!)
      await expect.soft(pk11Row.rightSummary.packageVersionTitle).toHaveText(`${PK11.name} / ${V_P_PKG_CHANGELOG_MULTI_CHANGED_R.version}`)
      await expect.soft(pk11Row.rightSummary.packageVersionStatus).toHaveText(V_P_PKG_CHANGELOG_MULTI_CHANGED_R.status)
      await expect.soft(pk11Row.rightSummary.graphQlChanges.breaking).toHaveText('1')
      await expect.soft(pk11Row.rightSummary.restApiChanges.breaking).toHaveText('2')
      await expect.soft(pk11Row.rightSummary.restApiChanges.semiBreaking).toHaveText('2')
      await expect.soft(pk11Row.rightSummary.restApiChanges.deprecated).toHaveText('2')
      await expect.soft(pk11Row.rightSummary.restApiChanges.nonBreaking).toHaveText('2')
      await expect.soft(pk11Row.rightSummary.restApiChanges.annotation).toHaveText('1')
      await expect.soft(pk11Row.rightSummary.restApiChanges.unclassified).toHaveText('1')

      await expect.soft(pk12Row.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(pk12Row.leftSummary.packageVersionTitle).toHaveText(`${PK12.name} / ${V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version}`)
      await expect.soft(pk12Row.leftSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.status)
      await expect.soft(pk12Row.rightSummary.packageVersionTitle).toHaveText(`${PK12.name} / ${V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R.version}`)
      await expect.soft(pk12Row.rightSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R.status)
      await expect.soft(pk12Row.rightSummary.restApiChanges.breaking).toHaveText('1')

      await expect.soft(pk14Row.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(pk14Row.leftSummary.packageVersionTitle).toHaveText(`${PK14.name} / ${V_P_PKG_FOR_DASHBOARDS_GQL_R.version}`)
      await expect.soft(pk14Row.leftSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_GQL_R.status)
      await expect.soft(pk14Row.rightSummary.packageVersionTitle).toHaveText(`${PK14.name} / ${V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.version}`)
      await expect.soft(pk14Row.rightSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.status)
      //! await expect.soft(pk14Row.rightSummary.graphQlChanges.annotation).toHaveText('1') //Issue GraphQL checks temporarily disabled
    })

  test('[P-CODDVW-2] Viewing package details on the Compare Dashboards page after swapping',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6064` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1443` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareDashboardsPage: comparePage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      const pk11Row = comparePage.compareContent.getPackageRow(PK11)
      const pk12Row = comparePage.compareContent.getPackageRow(PK12)
      const pk14Row = comparePage.compareContent.getPackageRow(PK14)

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version)

      await comparePage.toolbar.allBtn.click() //!WA TestCase-B-1443
      await comparePage.swapper.swapBtn.click()

      await expect.soft(pk11Row.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(pk11Row.leftSummary.dashboardPath).toHaveText(testDashboard.parentPath!)
      await expect.soft(pk11Row.leftSummary.packageVersionTitle).toHaveText(`${PK11.name} / ${V_P_PKG_CHANGELOG_MULTI_CHANGED_R.version}`)
      await expect.soft(pk11Row.leftSummary.packageVersionStatus).toHaveText(V_P_PKG_CHANGELOG_MULTI_CHANGED_R.status)
      await expect.soft(pk11Row.rightSummary.dashboardPath).toHaveText(testDashboard.parentPath!)
      await expect.soft(pk11Row.rightSummary.packageVersionTitle).toHaveText(`${PK11.name} / ${V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.version}`)
      await expect.soft(pk11Row.rightSummary.packageVersionStatus).toHaveText(V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.status)
      await expect.soft(pk11Row.rightSummary.graphQlChanges.nonBreaking).toHaveText('1')
      await expect.soft(pk11Row.rightSummary.restApiChanges.breaking).toHaveText('2')
      await expect.soft(pk11Row.rightSummary.restApiChanges.deprecated).toHaveText('2')
      await expect.soft(pk11Row.rightSummary.restApiChanges.nonBreaking).toHaveText('4')
      await expect.soft(pk11Row.rightSummary.restApiChanges.annotation).toHaveText('1')
      await expect.soft(pk11Row.rightSummary.restApiChanges.unclassified).toHaveText('1')

      await expect.soft(pk12Row.changeSeverityIndicator).toHaveText('non-breaking')
      await expect.soft(pk12Row.leftSummary.packageVersionTitle).toHaveText(`${PK12.name} / ${V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R.version}`)
      await expect.soft(pk12Row.leftSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R.status)
      await expect.soft(pk12Row.rightSummary.packageVersionTitle).toHaveText(`${PK12.name} / ${V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version}`)
      await expect.soft(pk12Row.rightSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.status)
      await expect.soft(pk12Row.rightSummary.restApiChanges.nonBreaking).toHaveText('1')

      await expect.soft(pk14Row.changeSeverityIndicator).toHaveText('non-breaking')
      await expect.soft(pk14Row.leftSummary.packageVersionTitle).toHaveText(`${PK14.name} / ${V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.version}`)
      await expect.soft(pk14Row.leftSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.status)
      await expect.soft(pk14Row.rightSummary.packageVersionTitle).toHaveText(`${PK14.name} / ${V_P_PKG_FOR_DASHBOARDS_GQL_R.version}`)
      await expect.soft(pk14Row.rightSummary.packageVersionStatus).toHaveText(V_P_PKG_FOR_DASHBOARDS_GQL_R.status)
      //! await expect.soft(pk14Row.rightSummary.graphQlChanges.annotation).toHaveText('1') //Issue GraphQL checks temporarily disabled
    })

  test('[P-CODDOP-2] Navigation to the Compare Packages page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5896` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareDashboardsPage, comparePackagesPage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version)

      await compareDashboardsPage.compareContent.getPackageRow(PK11).click()

      await expect.soft(comparePackagesPage.toolbar.packageSlt).toHaveText(PK11.name)
      await expect.soft(comparePackagesPage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
      await expect.soft(comparePackagesPage.swapper.rightTitle).toHaveText(currentVersion.version)
    })

  test('[P-CODPSE-1] Search package in the package selector on the Compare Packages page of a Dashboard',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6066` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { comparePackagesPage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version, undefined, PK11)

      await comparePackagesPage.toolbar.packageSlt.click()

      await test.step('Part of a word', async () => {
        await comparePackagesPage.toolbar.packageSlt.searchbar.fill('package')
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect.soft(comparePackagesPage.toolbar.packageSlt.getListItem()).toHaveCount(3)
      })

      await test.step('Adding part of a word', async () => {
        await comparePackagesPage.toolbar.packageSlt.searchbar.type('-12')

        await expect.soft(comparePackagesPage.toolbar.packageSlt.getListItem()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await comparePackagesPage.toolbar.packageSlt.searchbar.clear()

        await expect.soft(comparePackagesPage.toolbar.packageSlt.getListItem()).toHaveCount(3)
      })

      await test.step('Upper case', async () => {
        await comparePackagesPage.toolbar.packageSlt.searchbar.clear()
        await comparePackagesPage.toolbar.packageSlt.searchbar.fill(PK12.name)

        await expect.soft(comparePackagesPage.toolbar.packageSlt.getListItem()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await comparePackagesPage.toolbar.packageSlt.searchbar.clear()
        await comparePackagesPage.toolbar.packageSlt.searchbar.fill(`${PK12.name}123`)

        await expect.soft(comparePackagesPage.toolbar.packageSlt.getListItem()).toHaveCount(0)
      })
    })

  test('[P-CODPVW-1] Changing package on the Compare Packages page of a Dashboard',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6065` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { comparePackagesPage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoComparisonDashboards(testDashboard, currentVersion.version, previousVersion.version, undefined, PK11)

      await expect(comparePackagesPage.sidebar.getTagButton()).toHaveCount(3)

      await comparePackagesPage.toolbar.packageSlt.click()
      await comparePackagesPage.toolbar.packageSlt.getListItem(PK12.name).click()
      await portalPage.backdrop.click()

      await expect(comparePackagesPage.toolbar.packageSlt).toHaveText(PK12.name)
      await expect(comparePackagesPage.compareContent.getOperationRow()).toHaveCount(1)
      await expect(comparePackagesPage.sidebar.getTagButton()).toHaveCount(1) //Cover TestCase-A-4675
      await expect(comparePackagesPage.sidebar.getTagButton('pet')).toBeVisible()
    })

  test('[P-CODOVW-1] Changing package on the Compare Operations page of a Dashboard',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6067` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionDashboardPage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_DSH_COMPARISON_CHANGED_R
      const previousVersion = V_P_DSH_COMPARISON_BASE_R

      await portalPage.gotoComparisonOperationInDashboards(testDashboard, currentVersion.version, previousVersion.version, PK11, CREATE_LIST_OF_USERS_V1)

      await compareOperationsPage.toolbar.packageSlt.click()
      await compareOperationsPage.toolbar.packageSlt.getListItem(PK12.name).click()
      await portalPage.backdrop.click()

      await expect.soft(compareOperationsPage.toolbar.packageSlt).toHaveText(PK12.name)
      await expect.soft(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)
      await expect.soft(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
    })
})
