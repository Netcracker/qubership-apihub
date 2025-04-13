import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  CREATE_LIST_OF_USERS_V1_UPDATED,
  FILE_P_GRP_PET30_BASE,
  FILE_P_GRP_USER30_BASE,
  FILE_P_PETSTORE30,
  GET_PET_BY_STATUS_2_V1,
  GET_PET_BY_STATUS_3_V1,
  GET_PET_BY_STATUS_V1,
  GET_PET_BY_TAG_V2_SWAGGER,
  GET_USER_BY_NAME_V1,
  PK11,
  PK15,
  UPLOADS_IMAGE_V1,
  V_P_PKG_CHANGELOG_REST_BASE_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R,
  V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R,
  V_P_PKG_CHANGELOG_REST_THREE_DOCS_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_TWO_DOCS_R,
} from '@test-data/portal'

test.describe('09.2 Compare Operations (Package)', () => {

  const testPackage = PK11

  test('[P-COPOOP-1] Opening a Compare operations page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4557` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage, compareOperationsPage } = versionPage

      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonPackages(testPackage, currentVersion.version, previousVersion.version)

      await comparePackagesPage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect(compareOperationsPage.swapper.leftTitle).toHaveText(previousVersion.version)
      await expect(compareOperationsPage.swapper.rightTitle).toHaveText(currentVersion.version)
    })

  test('[P-COPOOP-2] Opening a Compare operations page of two different operations for the same package version',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4558` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, compareOperationsPage } = versionPage

      const currentOperation = GET_PET_BY_STATUS_V1
      const previousOperation = GET_PET_BY_STATUS_2_V1

      await portalPage.gotoOperation(V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R, currentOperation)

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.operationsItm.click()
      await compareDialog.fillForm({
        previousOperation: previousOperation,
      })
      await compareDialog.compareBtn.click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).toHaveText('2')
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).toHaveText('1')

      await compareOperationsPage.swapper.swapBtn.click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).toHaveText('1')
    })

  test('[P-COPOOP-3] Opening a Compare operations page of two different operations for the same package version after swapping',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1729` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, compareOperationsPage } = versionPage

      const currentOperation = GET_PET_BY_STATUS_V1
      const previousOperation = GET_PET_BY_STATUS_2_V1

      await portalPage.gotoOperation(V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R, currentOperation)

      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.operationsItm.click()
      await compareDialog.fillForm({
        previousOperation: previousOperation,
      })
      await compareDialog.swapBtn.click()
      await compareDialog.compareBtn.click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).toHaveText('1')
    })

  test('[P-COPOOP-4] Changing the compare configuration for compare of two different operations for the same package version',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1735` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog: compareDialog, compareOperationsPage } = versionPage
      const testVersion = V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R

      await test.step('Open Comparison', async () => {
        await portalPage.gotoComparisonOperationsInPackage(testPackage, testVersion.version, GET_PET_BY_STATUS_V1, GET_PET_BY_STATUS_2_V1)

        await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).toHaveText('2')
        await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).toHaveText('1')
        await expect(compareOperationsPage.docView).toBeVisible()
      })

      await test.step('Change operation', async () => {
        await compareOperationsPage.swapper.editBtn.click()
        await compareDialog.fillForm({
          previousOperation: GET_PET_BY_STATUS_3_V1,
        })
        await compareDialog.compareBtn.click()

        await expect(compareOperationsPage.docView).toBeVisible()
        await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).toHaveText('1')
        await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toHaveText('1')
        await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).toHaveText('1')
      })
    })

  test.skip('[P-COPOOP-5] Exit from Compare operations mode',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4559` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-692` }],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { comparePackagesPage, compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await compareOperationsPage.toolbar.backBtn.click()

      await expect(comparePackagesPage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED)).toBeVisible()
    })

  test('[P-COPODFI-1] Expanding / collapsing Tags, switch Operation on the Compare operations page in Doc view',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4560` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await expect(compareOperationsPage.docView).toBeVisible()

      await compareOperationsPage.sidebar.getTagButton('user').click()

      await expect(compareOperationsPage.sidebar.getOperationButton(CREATE_LIST_OF_USERS_V1_UPDATED)).toBeHidden()

      await compareOperationsPage.sidebar.getTagButton('user').click()

      await expect(compareOperationsPage.sidebar.getOperationButton(CREATE_LIST_OF_USERS_V1_UPDATED)).toBeVisible()

      await compareOperationsPage.sidebar.getOperationButton(GET_USER_BY_NAME_V1).click()

      await expect(compareOperationsPage.docView).toBeVisible()
    })

  test('[P-COPODFI-2] Filtering operations by Documents on the Compare operations page in Doc view',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1734` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1447` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_THREE_DOCS_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R
      const docTitle1 = FILE_P_GRP_PET30_BASE.testMeta!.docTitle
      const docTitle2 = FILE_P_GRP_USER30_BASE.testMeta!.docTitle
      const operation1 = UPLOADS_IMAGE_V1
      const operation2 = GET_USER_BY_NAME_V1

      await portalPage.gotoComparisonOperationInPackages(PK15, currentVersion.version, previousVersion.version, operation1)

      await expect(compareOperationsPage.sidebar.getOperationButton(operation1)).toBeVisible()
      await compareOperationsPage.sidebar.getTagButton('user').click()
      await expect(compareOperationsPage.sidebar.getOperationButton(operation2)).toBeVisible()

      await compareOperationsPage.sidebar.filtersBtn.click()
      await compareOperationsPage.sidebar.documentFilterAc.click()

      //! await expect(compareOperationsPage.sidebar.documentFilterAc.getListItem()).toHaveCount(2) //Issue TestCase-B-1447
      await expect(compareOperationsPage.sidebar.documentFilterAc.getListItem(docTitle1)).toBeVisible()
      await expect(compareOperationsPage.sidebar.documentFilterAc.getListItem(docTitle2)).toBeVisible()

      await compareOperationsPage.sidebar.documentFilterAc.getListItem(docTitle1).click()

      await expect(compareOperationsPage.sidebar.getOperationButton(operation1)).toBeVisible()
      await expect(compareOperationsPage.sidebar.getOperationButton(operation2)).toBeHidden()
    })

  test('[P-COPODFI-3] Filtering operations by Changes type on the Compare operations page in Doc view',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4562` },
        { type: 'Issue', description: 'Filter buttons temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.riskyChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.riskyChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).toHaveText('1')
      await expect(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')

      /*!await compareOperationsPage.toolbar.breakingChangesFilterBtn.click() //Issue Filter buttons temporarily disabled

      await expect.soft(compareOperationsPage.toolbar.breakingChangesFilterBtn).toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(2)

      await compareOperationsPage.toolbar.riskyChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.riskyChangesFilterBtn).toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)

      await compareOperationsPage.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(2)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)

      await compareOperationsPage.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)

      await compareOperationsPage.toolbar.annotationChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.annotationChangesFilterBtn).toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)

      await compareOperationsPage.toolbar.unclassifiedChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)

      await compareOperationsPage.toolbar.breakingChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(2)

      await compareOperationsPage.toolbar.riskyChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.riskyChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)

      await compareOperationsPage.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(2)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)

      await compareOperationsPage.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)

      await compareOperationsPage.toolbar.annotationChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)

      await compareOperationsPage.toolbar.unclassifiedChangesFilterBtn.click()

      await expect.soft(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      await expect(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)*/
    })

  test('[P-COPODFI-4] Complex filtering on the Compare Operations page by Changes type, by Documents plus search in Doc view',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4563` },
        { type: 'Issue', description: 'Filter buttons temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_TWO_DOCS_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await compareOperationsPage.sidebar.filtersBtn.click()
      await compareOperationsPage.sidebar.documentFilterAc.click()
      await compareOperationsPage.sidebar.documentFilterAc.getListItem(FILE_P_PETSTORE30.testMeta!.docTitle).click()
      await compareOperationsPage.toolbar.nonBreakingChangesFilterBtn.click()
      await compareOperationsPage.sidebar.searchbar.fill('user')
      await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

      await expect(compareOperationsPage.docView).toBeVisible()

      await compareOperationsPage.sidebar.getOperationButton(GET_USER_BY_NAME_V1).click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect.soft(compareOperationsPage.sidebar.documentFilterAc).toHaveValue(FILE_P_PETSTORE30.testMeta!.docTitle!)
      await expect.soft(compareOperationsPage.sidebar.searchbar).toHaveValue('user')
      //! await expect.soft(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toBePressed() //Issue Filter buttons temporarily disabled

      await compareOperationsPage.sidebar.getOperationButton(CREATE_LIST_OF_USERS_V1_UPDATED).click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect.soft(compareOperationsPage.sidebar.documentFilterAc).toHaveValue(FILE_P_PETSTORE30.testMeta!.docTitle!)
      await expect.soft(compareOperationsPage.sidebar.searchbar).toHaveValue('user')
      //! await expect.soft(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).toBePressed() //Issue Filter buttons temporarily disabled
    })

  test('[P-COPODFI-5] Checking filters condition on the Compare operations page in Doc view after swapping',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5502` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1353` },
        { type: 'Issue', description: 'Filter buttons temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_TWO_DOCS_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await compareOperationsPage.sidebar.filtersBtn.click()
      await compareOperationsPage.sidebar.documentFilterAc.click()
      await compareOperationsPage.sidebar.documentFilterAc.getListItem(FILE_P_PETSTORE30.testMeta!.docTitle).click()
      await compareOperationsPage.toolbar.deprecatedChangesFilterBtn.click()
      await compareOperationsPage.toolbar.backBtn.hover() //For tooltip hiding
      await compareOperationsPage.sidebar.searchbar.fill('user')
      await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

      await expect(compareOperationsPage.docView).toBeVisible()

      await compareOperationsPage.swapper.swapBtn.click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect.soft(compareOperationsPage.sidebar.documentFilterAc).toHaveValue(FILE_P_PETSTORE30.testMeta!.docTitle!)
      //! await expect.soft(compareOperationsPage.sidebar.searchbar).toHaveValue('user') //TestCase-B-1353
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      //! await expect(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).toBePressed() //Issue Filter buttons temporarily disabled
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
    })

  test('[P-COPODFI-6] Checking filters condition on the Compare operations page during switching view modes',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5503` },
        { type: 'Issue', description: 'Filter buttons temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_TWO_DOCS_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await compareOperationsPage.sidebar.filtersBtn.click()
      await compareOperationsPage.sidebar.documentFilterAc.click()
      await compareOperationsPage.sidebar.documentFilterAc.getListItem(FILE_P_PETSTORE30.testMeta!.docTitle).click()
      await compareOperationsPage.toolbar.deprecatedChangesFilterBtn.click()
      await compareOperationsPage.sidebar.searchbar.fill('user')
      await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

      await expect(compareOperationsPage.docView).toBeVisible()

      await compareOperationsPage.toolbar.rawBtn.click()

      await expect(compareOperationsPage.rawView).toBeVisible()
      await expect.soft(compareOperationsPage.sidebar.documentFilterAc).toHaveValue(FILE_P_PETSTORE30.testMeta!.docTitle!)
      await expect.soft(compareOperationsPage.sidebar.searchbar).toHaveValue('user')
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).not.toBeVisible()
      await expect(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).not.toBeVisible()
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).not.toBeVisible()
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).not.toBeVisible()
      await expect(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).not.toBeVisible()

      await compareOperationsPage.toolbar.docBtn.click()

      await expect(compareOperationsPage.docView).toBeVisible()
      await expect.soft(compareOperationsPage.sidebar.documentFilterAc).toHaveValue(FILE_P_PETSTORE30.testMeta!.docTitle!)
      await expect.soft(compareOperationsPage.sidebar.searchbar).toHaveValue('user')
      await expect(compareOperationsPage.toolbar.breakingChangesFilterBtn).not.toBePressed()
      //! await expect(compareOperationsPage.toolbar.deprecatedChangesFilterBtn).toBePressed() //Issue Filter buttons temporarily disabled
      await expect(compareOperationsPage.toolbar.nonBreakingChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.annotationChangesFilterBtn).not.toBePressed()
      await expect(compareOperationsPage.toolbar.unclassifiedChangesFilterBtn).not.toBePressed()
    })

  test('[P-COPORFI-1] Expanding / collapsing Tags, switch Operation on the Compare operations page in Raw view',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5508` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1275` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-10144` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await expect(compareOperationsPage.docView).toBeVisible() //!WA: remove after fixing TestCase-A-10144

      await compareOperationsPage.toolbar.rawBtn.click()

      await expect(compareOperationsPage.rawView).toBeVisible()

      await compareOperationsPage.sidebar.getTagButton('user').click()

      await expect(compareOperationsPage.sidebar.getOperationButton(CREATE_LIST_OF_USERS_V1_UPDATED)).toBeHidden()

      await compareOperationsPage.sidebar.getTagButton('user').click()

      await expect(compareOperationsPage.sidebar.getOperationButton(CREATE_LIST_OF_USERS_V1_UPDATED)).toBeVisible()

      await compareOperationsPage.sidebar.getOperationButton(GET_USER_BY_NAME_V1).click()

      // await expect(compareOperationsPage.rawView).toBeVisible() //TestCase-B-1275
    })

  test('[P-COPORFI-2] Filtering operations by Documents on the Compare operations page in Raw view',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5509` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-10144` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_TWO_DOCS_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, UPLOADS_IMAGE_V1)

      await expect(compareOperationsPage.docView).toBeVisible() //!WA: remove after fixing TestCase-A-10144

      await compareOperationsPage.toolbar.rawBtn.click()

      await expect(compareOperationsPage.rawView).toBeVisible()
      await expect(compareOperationsPage.sidebar.getOperationButton(UPLOADS_IMAGE_V1)).toBeVisible()
      await expect(compareOperationsPage.sidebar.getOperationButton(GET_PET_BY_TAG_V2_SWAGGER)).toBeVisible()

      await compareOperationsPage.sidebar.filtersBtn.click()
      await compareOperationsPage.sidebar.documentFilterAc.click()
      await compareOperationsPage.sidebar.documentFilterAc.fill(FILE_P_PETSTORE30.testMeta!.docTitle!)
      await compareOperationsPage.sidebar.documentFilterAc.getListItem(FILE_P_PETSTORE30.testMeta!.docTitle).click()

      await expect(compareOperationsPage.rawView).toBeVisible()
      await expect(compareOperationsPage.sidebar.getOperationButton(UPLOADS_IMAGE_V1)).toBeVisible()
      await expect(compareOperationsPage.sidebar.getOperationButton(GET_PET_BY_TAG_V2_SWAGGER)).toBeHidden()
    })

  test('[P-COPORFI-4] Checking filters condition on the Compare operations page in Raw view after swapping',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5511` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-1353` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-A-10144` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_TWO_DOCS_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await expect(compareOperationsPage.docView).toBeVisible() //!WA: remove after fixing TestCase-A-10144

      await compareOperationsPage.toolbar.rawBtn.click()

      await expect(compareOperationsPage.rawView).toBeVisible()

      await compareOperationsPage.sidebar.filtersBtn.click()
      await compareOperationsPage.sidebar.documentFilterAc.click()
      await compareOperationsPage.sidebar.documentFilterAc.getListItem(FILE_P_PETSTORE30.testMeta!.docTitle).click()
      await compareOperationsPage.sidebar.searchbar.fill('user')
      await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

      await expect(compareOperationsPage.rawView).toBeVisible()

      await compareOperationsPage.swapper.swapBtn.click()

      await expect(compareOperationsPage.rawView).toBeVisible()
      await expect.soft(compareOperationsPage.sidebar.documentFilterAc).toHaveValue(FILE_P_PETSTORE30.testMeta!.docTitle!)
      // await expect.soft(compareOperationsPage.sidebar.searchbar).toHaveValue('user') //TestCase-B-1353
    })

  test('[P-COPODSE-1] Search Operations on the Compare Operations page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5736` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareOperationsPage } = versionPage
      const currentVersion = V_P_PKG_CHANGELOG_REST_CHANGED_R
      const previousVersion = V_P_PKG_CHANGELOG_REST_BASE_R

      await portalPage.gotoComparisonOperationInPackages(testPackage, currentVersion.version, previousVersion.version, CREATE_LIST_OF_USERS_V1_UPDATED)

      await test.step('Part of a word', async () => {
        await compareOperationsPage.sidebar.searchbar.fill('us')

        await expect.soft(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)
        await expect.soft(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      })

      await test.step('Adding part of a word', async () => {
        await compareOperationsPage.sidebar.searchbar.type('ers')

        await expect.soft(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)
        await expect.soft(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await compareOperationsPage.sidebar.searchbar.clear()

        await expect.soft(compareOperationsPage.sidebar.getTagButton()).toHaveCount(3)
        await expect.soft(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(3)
      })

      await test.step('Two words', async () => {
        await compareOperationsPage.sidebar.searchbar.fill('creates list')

        await expect.soft(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)
        await expect.soft(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      })

      await test.step('Upper case', async () => {
        await compareOperationsPage.sidebar.searchbar.fill('Creates')

        await expect.soft(compareOperationsPage.sidebar.getTagButton()).toHaveCount(1)
        await expect.soft(compareOperationsPage.sidebar.getOperationButton()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await compareOperationsPage.sidebar.searchbar.clear()
        await compareOperationsPage.sidebar.searchbar.fill('Creates123')

        await expect.soft(compareOperationsPage.sidebar.noSearchResultsPlaceholder).toBeVisible()
      })
    })
})
