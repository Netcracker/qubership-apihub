import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import { MIDDLE_EXPECT, SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { TOOLTIP_SEVERITY_MSG } from '@test-data/shared'
import {
  CREATE_LIST_OF_USERS_V1,
  DEL_ORDER_V1,
  GET_PET_BY_STATUS_V1,
  GET_PET_BY_TAG_V1,
  GET_USER_BY_NAME_V1,
  GQL_LIST_PETS,
  IMM_GR,
  P_WS_MAIN_R,
  PK11,
  PK12,
  UPDATE_PET_V1,
  UPDATE_USER_V1,
  UPLOADS_IMAGE_V1,
  V_P_PKG_CHANGELOG_MULTI_BASE_R,
  V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R,
  V_P_PKG_CHANGELOG_REST_BASE_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_PK12_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  V_P_PKG_CHANGELOG_REST_NO_CHANGES_R,
} from '@test-data/portal'

test.describe('09.1 Compare Package versions', () => {

  const testPackage = PK11

  test('[P-COPVOP-1] Opening a Compare Packages page for the same package',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1728` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoVersion(currentVersion)

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.versionsItm.click()

      await expect(compareDialog.changePackagesBtn).not.toHaveClass(/MuiLoadingButton-loading/) //to prevent too early submit

      await compareDialog.previousVersionAc.click()
      await compareDialog.previousVersionAc.fill(previousVersion.version)

      await page.waitForResponse(response => response.url().includes(`versions?limit=100&page=0&textFilter=${previousVersion.version}`)) //Cover TestCase-B-1375

      await compareDialog.previousVersionAc.getListItem(`${previousVersion.version} ${previousVersion.status}`).click()
      await compareDialog.compareBtn.click()

      await expect.soft(comparePage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
      await expect.soft(comparePage.swapper.rightTitle).toHaveText(currentVersion.version)
    })

  test('[P-COPVOP-2] Opening a Compare Packages page for the same package after swapping',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1731` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoVersion(currentVersion)

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.versionsItm.click()

      await expect(compareDialog.changePackagesBtn).not.toHaveClass(/MuiLoadingButton-loading/) //to prevent too early submit

      await compareDialog.previousVersionAc.click()
      await compareDialog.previousVersionAc.getListItem(`${previousVersion.version} ${previousVersion.status}`).click()
      await compareDialog.swapBtn.click()
      await compareDialog.compareBtn.click()

      await expect.soft(comparePage.swapper.leftTitle).toHaveText(currentVersion.version, { timeout: MIDDLE_EXPECT })
      await expect.soft(comparePage.swapper.rightTitle).toHaveText(previousVersion.version)
    })

  test('[P-COPVOP-3] Opening a Compare Packages page for different packages',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1727` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const {
        compareSelectDialog: compareDialog,
        comparePackagesPage: comparePage,
        compareOperationsPage,
      } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_CHANGED_PK12_R
      const previousPackage = PK12

      await portalPage.gotoVersion(currentVersion)

      await test.step('Compare packages', async () => {
        await versionPage.toolbar.compareMenu.click()
        await versionPage.toolbar.compareMenu.versionsItm.click()

        await expect(compareDialog.changePackagesBtn).not.toHaveClass(/MuiLoadingButton-loading/) //to prevent too early submit

        await compareDialog.fillForm({
          previousPackage: previousPackage.name,
          previousVersion: `${previousVersion.version} ${previousVersion.status}`,
        })
        await compareDialog.compareBtn.click()

        await expect(comparePage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
        await expect(comparePage.swapper.rightTitle).toHaveText(currentVersion.version)
      })

      await test.step('Open operation comparison', async () => {
        await comparePage.compareContent.getOperationRow(GET_USER_BY_NAME_V1).click() //Cover TestCase-A-10134

        await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
        await expect(compareOperationsPage.swapper.rightTitle).toHaveText(currentVersion.version)
        await expect(compareOperationsPage.docView).toBeVisible()
      })
    })

  test('[P-COPVOP-4] Opening a Compare Packages page for different packages after swapping',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1730` },
        { type: 'Flaky', description: 'Sometimes, the "Previous Version" field suddenly clears itself.' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_CHANGED_PK12_R
      const previousPackage = PK12

      await portalPage.gotoVersion(currentVersion)

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.versionsItm.click()

      await expect(compareDialog.changePackagesBtn).not.toHaveClass(/MuiLoadingButton-loading/) //to prevent too early submit

      await compareDialog.fillForm({
        previousPackage: previousPackage.name,
        previousVersion: `${previousVersion.version} ${previousVersion.status}`,
      })
      await compareDialog.swapBtn.click()
      await compareDialog.compareBtn.click()

      await expect(comparePage.swapper.leftTitle).toHaveText(currentVersion.version, { timeout: MIDDLE_EXPECT })
      await expect(comparePage.swapper.rightTitle).toHaveText(previousVersion.version)
    })

  test('[P-COPVOP-5] Changing the compare configuration for a Compare Packages page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4556` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const newCurrentVersion = V_P_PKG_CHANGELOG_REST_NO_CHANGES_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.swapper.editBtn.click()

      await portalPage.waitForTimeout(SEARCH_TIMEOUT.short) // To avoid value resetting

      await compareDialog.currentVersionAc.clear()
      await compareDialog.currentVersionAc.click()
      await compareDialog.currentVersionAc.getListItem(`${newCurrentVersion.version} ${newCurrentVersion.status}`).click()
      await compareDialog.compareBtn.click()

      await expect.soft(comparePage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
      await expect.soft(comparePage.swapper.rightTitle).toHaveText(newCurrentVersion.version)
    })

  test('[P-COPVOP-6] Exit from Compare versions mode',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1732` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab, comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.toolbar.backBtn.click()

      await expect(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(currentVersion.version)
    })

  test('[P-COPVOP-7] Navigation through breadcrumbs on the Compare Packages page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5488` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R
      const testWorkspace = P_WS_MAIN_R
      const testGroup = IMM_GR

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.toolbar.breadcrumbs.clickPackageLink(testPackage)

      await expect.soft(versionPage.toolbar.title).toHaveText(testPackage.name)

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.toolbar.breadcrumbs.clickWorkspaceLink(testWorkspace)

      await expect.soft(portalPage.toolbar.titleText).toHaveText(testWorkspace.name)
      await expect.soft(portalPage.table.getRow(testGroup)).toBeVisible()
    })

  test('[P-COPVOP-8] Opening a Compare Packages page from the Operation details page',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4561` },
        { type: 'Flaky', description: 'Sometimes, the "Previous Version" field suddenly clears itself.' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage, operationPage } = portalPage
      const { compareSelectDialog: compareDialog, comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoOperation(currentVersion, GET_PET_BY_TAG_V1)

      await operationPage.toolbar.compareMenu.click()
      await operationPage.toolbar.compareMenu.versionsItm.click()

      await portalPage.waitForTimeout(SEARCH_TIMEOUT.short) // To avoid value resetting

      await compareDialog.fillForm({
        previousVersion: `${previousVersion.version} ${previousVersion.status}`,
      })
      await compareDialog.compareBtn.click()

      await expect(comparePage.swapper.leftTitle).toHaveText(previousVersion.version, { timeout: MIDDLE_EXPECT })
      await expect(comparePage.swapper.rightTitle).toHaveText(currentVersion.version)
    })

  test('[P-COPVSE-1] Search Tags on the Compare Packages page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5489` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await test.step('Part of a word', async () => {
        await comparePage.sidebar.searchbar.fill('p')

        await expect.soft(comparePage.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Adding part of a word', async () => {
        await comparePage.sidebar.searchbar.fill('pet')

        await expect.soft(comparePage.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await comparePage.sidebar.searchbar.clear()

        await expect.soft(comparePage.sidebar.getTagButton()).toHaveCount(3)
      })

      await test.step('Upper case', async () => {
        await comparePage.sidebar.searchbar.clear()
        await comparePage.sidebar.searchbar.fill('Pet')

        await expect.soft(comparePage.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await comparePage.sidebar.searchbar.clear()
        await comparePage.sidebar.searchbar.fill('Pet123')

        await expect.soft(comparePage.sidebar.getTagButton()).toHaveCount(0)
      })

      await test.step('Select item during search', async () => {
        await comparePage.sidebar.searchbar.fill('p')

        await comparePage.sidebar.getTagButton('pet').click()
        await expect(comparePage.sidebar.getTagButton()).toHaveCount(1)
        await expect(comparePage.sidebar.searchbar).toHaveValue('p')
      })
    })

  test('[P-COPVVW-1] Switching operations API Type on the Compare Packages page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5490` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_MULTI_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_MULTI_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.sidebar.graphQlBtn.click()

      await expect(comparePage.compareContent.getOperationRow(GQL_LIST_PETS)).toBeVisible()
      await expect(comparePage.compareContent.getOperationRow(UPDATE_USER_V1)).not.toBeVisible()

      await comparePage.sidebar.restApiBtn.click()

      await expect(comparePage.compareContent.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect(comparePage.compareContent.getOperationRow(GQL_LIST_PETS)).not.toBeVisible()
    })

  test('[P-COPVFI-1] Filtering operations by Tag on the Compare Packages page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5491` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.sidebar.getTagButton('pet').click()

      await expect.soft(comparePage.compareContent.getOperationRow()).toHaveCount(1)

      await comparePage.sidebar.getTagButton('user').click()

      await expect.soft(comparePage.compareContent.getOperationRow()).toHaveCount(3)

      await comparePage.sidebar.getTagButton('user').click()

      await expect.soft(comparePage.compareContent.getOperationRow()).toHaveCount(5)
    })

  test('[P-COPVFI-2] Filtering operations by Changes type on the Compare Packages page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5492` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await expect(comparePage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.semiBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.deprecatedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.toolbar.breakingChangesFilterBtn).toHaveText('2')
      await expect(comparePage.toolbar.semiBreakingChangesFilterBtn).toHaveText('2')
      await expect(comparePage.toolbar.deprecatedChangesFilterBtn).toHaveText('2')
      await expect(comparePage.toolbar.nonBreakingChangesFilterBtn).toHaveText('2')
      await expect(comparePage.toolbar.annotationChangesFilterBtn).toHaveText('1')
      await expect(comparePage.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')

      await comparePage.toolbar.breakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.breakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(2)

      await comparePage.toolbar.semiBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.breakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(3)

      await comparePage.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.deprecatedChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(4)

      await comparePage.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.nonBreakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(5)

      await comparePage.toolbar.annotationChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.annotationChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(5)

      await comparePage.toolbar.unclassifiedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.unclassifiedChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(5)

      await comparePage.toolbar.breakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(4)

      await comparePage.toolbar.semiBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.semiBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(3)

      await comparePage.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.deprecatedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(2)

      await comparePage.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(1)

      await comparePage.toolbar.annotationChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(1)

      await comparePage.toolbar.unclassifiedChangesFilterBtn.click()

      await expect.soft(comparePage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(5)
    })

  test('[P-COPVFI-3] Complex filtering on the Compare Packages page, Changes type and Tag',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5493` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.sidebar.getTagButton('user').click()
      await comparePage.toolbar.breakingChangesFilterBtn.click()

      await expect(comparePage.toolbar.breakingChangesFilterBtn).toBePressed()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(1)

      await comparePage.sidebar.getTagButton('user').click()
      await expect(comparePage.compareContent.getOperationRow()).toHaveCount(2)

      await test.step('Check changes tooltips on the filter buttons', async () => {
        await comparePage.toolbar.breakingChangesFilterBtn.hover()

        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.breaking)

        await comparePage.toolbar.semiBreakingChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        for (const msg of TOOLTIP_SEVERITY_MSG.semiBreaking) {
          await expect.soft(portalPage.tooltip).toContainText(msg)
        }

        await comparePage.toolbar.deprecatedChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.deprecated)

        await comparePage.toolbar.nonBreakingChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.nonBreaking)

        await comparePage.toolbar.annotationChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.annotation)

        await comparePage.toolbar.unclassifiedChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.unclassified)
      })
    })

  test('[P-COPVFI-4] Checking filters condition on the Compare Packages page after swapping',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5494` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await test.step('Checking Tags', async () => {
        await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

        await comparePage.sidebar.getTagButton('pet').click()

        await expect.soft(comparePage.compareContent.getOperationRow()).toHaveCount(1)

        await comparePage.swapper.swapBtn.click()

        await expect.soft(comparePage.compareContent.getOperationRow()).toHaveCount(1)
      })

      await test.step('Checking Changes type filter', async () => {
        await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

        await comparePage.toolbar.breakingChangesFilterBtn.click()
        await comparePage.toolbar.deprecatedChangesFilterBtn.click()
        await comparePage.toolbar.backBtn.hover() //For tooltip hiding

        await expect(comparePage.compareContent.getOperationRow()).toHaveCount(3)

        await comparePage.swapper.swapBtn.click()

        await expect(comparePage.compareContent.getOperationRow()).toHaveCount(3)
      })
    })

  test('[P-COPVVW-2] Viewing operation details on the Compare Packages page',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5495` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      const uploadsImageRow = comparePage.compareContent.getOperationRow(UPLOADS_IMAGE_V1)
      const createListRow = comparePage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1)
      const updateUserRow = comparePage.compareContent.getOperationRow(UPDATE_USER_V1)
      const delOrderRow = comparePage.compareContent.getOperationRow(DEL_ORDER_V1)
      const getUserRow = comparePage.compareContent.getOperationRow(GET_USER_BY_NAME_V1)

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await expect.soft(uploadsImageRow.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(uploadsImageRow.leftSummary.title).toHaveText(UPLOADS_IMAGE_V1.title)
      await expect.soft(uploadsImageRow.leftSummary.path).toHaveText(`${UPLOADS_IMAGE_V1.method}${UPLOADS_IMAGE_V1.path}`)
      await expect.soft(uploadsImageRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(uploadsImageRow.rightSummary.title).not.toBeVisible()
      await expect.soft(uploadsImageRow.rightSummary.path).not.toBeVisible()
      await expect.soft(uploadsImageRow.rightSummary.changes.breaking).toHaveText('1')

      await expect.soft(createListRow.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(createListRow.leftSummary.title).toHaveText(CREATE_LIST_OF_USERS_V1.title)
      await expect.soft(createListRow.leftSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V1.method}${CREATE_LIST_OF_USERS_V1.path}`)
      await expect.soft(createListRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(createListRow.rightSummary.title).toHaveText(`${CREATE_LIST_OF_USERS_V1.title} UPDATED`)
      await expect.soft(createListRow.rightSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V1.method}${CREATE_LIST_OF_USERS_V1.path}`)
      await expect.soft(createListRow.rightSummary.changes.breaking).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.semiBreaking).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.deprecated).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.nonBreaking).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.annotation).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.unclassified).toHaveText('1')

      await expect.soft(updateUserRow.changeSeverityIndicator).toHaveText('deprecated')
      await expect.soft(updateUserRow.leftSummary.title).toHaveText(UPDATE_USER_V1.title)
      await expect.soft(updateUserRow.leftSummary.path).toHaveText(`${UPDATE_USER_V1.method}${UPDATE_USER_V1.path}`)
      await expect.soft(updateUserRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(updateUserRow.rightSummary.title).toHaveText(UPDATE_USER_V1.title)
      await expect.soft(updateUserRow.rightSummary.path).toHaveText(`${UPDATE_USER_V1.method}${UPDATE_USER_V1.path}`)
      await expect.soft(updateUserRow.rightSummary.changes.deprecated).toHaveText('1')

      await expect.soft(delOrderRow.changeSeverityIndicator).toHaveText('risky')
      await expect.soft(delOrderRow.leftSummary.title).toHaveText(DEL_ORDER_V1.title)
      await expect.soft(delOrderRow.leftSummary.path).toHaveText(`${DEL_ORDER_V1.method}${DEL_ORDER_V1.path}`)
      await expect.soft(delOrderRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(delOrderRow.rightSummary.title).toHaveText(DEL_ORDER_V1.title)
      await expect.soft(delOrderRow.rightSummary.path).toHaveText(`${DEL_ORDER_V1.method}${DEL_ORDER_V1.path}`)
      await expect.soft(delOrderRow.rightSummary.changes.semiBreaking).toHaveText('1')

      await expect.soft(getUserRow.changeSeverityIndicator).toHaveText('non-breaking')
      await expect.soft(getUserRow.leftSummary.title).not.toBeVisible()
      await expect.soft(getUserRow.leftSummary.path).not.toBeVisible()
      await expect.soft(getUserRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(getUserRow.rightSummary.title).toHaveText(GET_USER_BY_NAME_V1.title)
      await expect.soft(getUserRow.rightSummary.path).toHaveText(`${GET_USER_BY_NAME_V1.method}${GET_USER_BY_NAME_V1.path}`)
      await expect.soft(getUserRow.rightSummary.changes.nonBreaking).toHaveText('1')
    })

  test('[P-COPVVW-3] Viewing operation details on the Compare Packages page after swapping',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5496` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      const uploadsImageRow = comparePage.compareContent.getOperationRow(UPLOADS_IMAGE_V1)
      const createListRow = comparePage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1)
      const updateUserRow = comparePage.compareContent.getOperationRow(UPDATE_USER_V1)
      const delOrderRow = comparePage.compareContent.getOperationRow(DEL_ORDER_V1)
      const getUserRow = comparePage.compareContent.getOperationRow(GET_USER_BY_NAME_V1)

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePage.swapper.swapBtn.click()

      await expect.soft(uploadsImageRow.changeSeverityIndicator).toHaveText('non-breaking')
      await expect.soft(uploadsImageRow.leftSummary.title).not.toBeVisible()
      await expect.soft(uploadsImageRow.leftSummary.path).not.toBeVisible()
      await expect.soft(uploadsImageRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(uploadsImageRow.rightSummary.title).toHaveText(UPLOADS_IMAGE_V1.title)
      await expect.soft(uploadsImageRow.rightSummary.path).toHaveText(`${UPLOADS_IMAGE_V1.method}${UPLOADS_IMAGE_V1.path}`)
      await expect.soft(uploadsImageRow.rightSummary.changes.nonBreaking).toHaveText('1')

      await expect.soft(createListRow.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(createListRow.leftSummary.title).toHaveText(`${CREATE_LIST_OF_USERS_V1.title} UPDATED`)
      await expect.soft(createListRow.leftSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V1.method}${CREATE_LIST_OF_USERS_V1.path}`)
      await expect.soft(createListRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(createListRow.rightSummary.title).toHaveText(CREATE_LIST_OF_USERS_V1.title)
      await expect.soft(createListRow.rightSummary.path).toHaveText(`${CREATE_LIST_OF_USERS_V1.method}${CREATE_LIST_OF_USERS_V1.path}`)
      await expect.soft(createListRow.rightSummary.changes.breaking).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.deprecated).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.nonBreaking).toHaveText('2')
      await expect.soft(createListRow.rightSummary.changes.annotation).toHaveText('1')
      await expect.soft(createListRow.rightSummary.changes.unclassified).toHaveText('1')

      await expect.soft(updateUserRow.changeSeverityIndicator).toHaveText('deprecated')
      await expect.soft(updateUserRow.leftSummary.title).toHaveText(UPDATE_USER_V1.title)
      await expect.soft(updateUserRow.leftSummary.path).toHaveText(`${UPDATE_USER_V1.method}${UPDATE_USER_V1.path}`)
      await expect.soft(updateUserRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(updateUserRow.rightSummary.title).toHaveText(UPDATE_USER_V1.title)
      await expect.soft(updateUserRow.rightSummary.path).toHaveText(`${UPDATE_USER_V1.method}${UPDATE_USER_V1.path}`)
      await expect.soft(updateUserRow.rightSummary.changes.deprecated).toHaveText('1')

      await expect.soft(delOrderRow.changeSeverityIndicator).toHaveText('non-breaking')
      await expect.soft(delOrderRow.leftSummary.title).toHaveText(DEL_ORDER_V1.title)
      await expect.soft(delOrderRow.leftSummary.path).toHaveText(`${DEL_ORDER_V1.method}${DEL_ORDER_V1.path}`)
      await expect.soft(delOrderRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(delOrderRow.rightSummary.title).toHaveText(DEL_ORDER_V1.title)
      await expect.soft(delOrderRow.rightSummary.path).toHaveText(`${DEL_ORDER_V1.method}${DEL_ORDER_V1.path}`)
      await expect.soft(delOrderRow.rightSummary.changes.nonBreaking).toHaveText('1')

      await expect.soft(getUserRow.changeSeverityIndicator).toHaveText('breaking')
      await expect.soft(getUserRow.leftSummary.title).toHaveText(GET_USER_BY_NAME_V1.title)
      await expect.soft(getUserRow.leftSummary.path).toHaveText(`${GET_USER_BY_NAME_V1.method}${GET_USER_BY_NAME_V1.path}`)
      await expect.soft(getUserRow.leftSummary.changes).not.toBeVisible()
      await expect.soft(getUserRow.rightSummary.title).not.toBeVisible()
      await expect.soft(getUserRow.rightSummary.path).not.toBeVisible()
      await expect.soft(getUserRow.rightSummary.changes.breaking).toHaveText('1')
    })

  test('[P-COPUA-2] Opening a Compare Package versions page for the same package with Annotation/Unclassified changes only',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-9622` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage: comparePage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await expect(comparePage.compareContent.getOperationRow(GET_PET_BY_STATUS_V1).changeSeverityIndicator).toHaveText('unclassified')
      await expect(comparePage.compareContent.getOperationRow(GET_PET_BY_STATUS_V1).rightSummary.changes.unclassified).toHaveText('1')

      await expect(comparePage.compareContent.getOperationRow(UPDATE_PET_V1).changeSeverityIndicator).toHaveText('annotation')
      await expect(comparePage.compareContent.getOperationRow(UPDATE_PET_V1).rightSummary.changes.annotation).toHaveText('1')
    })
})
