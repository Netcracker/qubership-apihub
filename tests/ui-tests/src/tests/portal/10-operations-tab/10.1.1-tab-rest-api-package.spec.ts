import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { GRAPHQL_API_TYPE_TITLE, REST_API_TYPE_TITLE } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  DEL_PET_V1,
  GET_PET_BY_TAG_V1,
  GET_SYSTEM_INFO,
  GQL_LIST_PETS,
  PK11,
  UPDATE_USER_V1,
  V_P_PKG_OPERATIONS_MULTI_TYPE_R,
  V_P_PKG_OPERATIONS_REST_R,
  V_P_PKG_WITHOUT_OPERATIONS_R,
} from '@test-data/portal'
import { VERSION_OPERATIONS_TAB_REST } from '@portal/entities'

test.describe('10.1.1 Operations tab REST API (Package)', () => {

  const testPackage = PK11
  const versionOperationsRest = V_P_PKG_OPERATIONS_REST_R
  const versionOperationsMulti = V_P_PKG_OPERATIONS_MULTI_TYPE_R
  const versionWithoutOperations = V_P_PKG_WITHOUT_OPERATIONS_R

  test('[P-OTPOP-1] Opening the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1724` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage
      const testOperationRow = contractsTab.table.getOperationRow(GET_SYSTEM_INFO)

      await portalPage.gotoPackage(testPackage)
      await versionPage.contractsTab.click()

      await expect.soft(contractsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(contractsTab.sidebar.groupFilterAc).toBeDisabled()
      await expect.soft(contractsTab.sidebar.searchbar).toBeVisible()
      await expect.soft(contractsTab.sidebar.getTagButton('pet')).toBeVisible()
      await expect.soft(contractsTab.toolbar.sltApiType).toBeVisible()
      await expect.soft(contractsTab.toolbar.searchbar).toBeVisible()
      await expect.soft(contractsTab.toolbar.filtersBtn).toBeVisible()
      await expect.soft(contractsTab.toolbar.listViewBtn).toBePressed()
      await expect.soft(contractsTab.toolbar.detailedViewBtn).toBeVisible()
      await expect.soft(contractsTab.toolbar.exportMenu).toBeVisible()
      await expect.soft(testOperationRow).toBeVisible()
    })

  test('[P-OTPVW-1] Switching operations API Type on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4757` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsMulti, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.sltApiType.click()
      await contractsTab.toolbar.sltApiType.graphQlItm.click()

      await expect.soft(contractsTab.toolbar.sltApiType).toHaveText(GRAPHQL_API_TYPE_TITLE)
      await expect(contractsTab.table.getOperationRow(GQL_LIST_PETS)).toBeVisible()
      await expect(contractsTab.table.getOperationRow(UPDATE_USER_V1)).not.toBeVisible()

      await contractsTab.toolbar.sltApiType.click()
      await contractsTab.toolbar.sltApiType.restApiItm.click()

      await expect.soft(contractsTab.toolbar.sltApiType).toHaveText(REST_API_TYPE_TITLE)
      await expect(contractsTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect(contractsTab.table.getOperationRow(GQL_LIST_PETS)).not.toBeVisible()
    })

  test('[P-OTPVW-2] Checking for the absence of the API type selector when there is only one operation type on the Operations tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4464` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await expect(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect(contractsTab.toolbar.sltApiType).not.toBeVisible()
    })

  test('[P-OTPSE-1] Search Tags on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4465` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Part of a word', async () => {
        await contractsTab.sidebar.searchbar.fill('pe')
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

        await expect.soft(contractsTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Adding part of a word', async () => {
        await contractsTab.sidebar.searchbar.type('t')
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.middle)

        await expect.soft(contractsTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await contractsTab.sidebar.searchbar.clear()

        await expect.soft(contractsTab.sidebar.getTagButton()).toHaveCount(3)
      })

      await test.step('Case sensitive', async () => {
        await contractsTab.sidebar.searchbar.clear()
        await contractsTab.sidebar.searchbar.fill('Pet')

        await expect.soft(contractsTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await contractsTab.sidebar.searchbar.clear()
        await contractsTab.sidebar.searchbar.fill('pet123')

        await expect.soft(contractsTab.sidebar.getTagButton()).toHaveCount(0)
      })
    })

  test('[P-OTPSE-2] Search Operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4466` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Search operation by title', async () => {

        await test.step('Part of a word', async () => {
          await contractsTab.toolbar.searchbar.fill('Find')

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(4)
        })

        await test.step('Adding part of a word', async () => {
          await contractsTab.toolbar.searchbar.type('s')

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(2)
        })

        await test.step('Clearing a search query', async () => {
          await contractsTab.toolbar.searchbar.clear()

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(19)
        })

        await test.step('Two words', async () => {
          await contractsTab.toolbar.searchbar.clear()
          await contractsTab.toolbar.searchbar.fill('Finds Pets')

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(2)
          await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Case sensitive', async () => {
          await contractsTab.toolbar.searchbar.clear()
          await contractsTab.toolbar.searchbar.fill(GET_PET_BY_TAG_V1.title.toLowerCase())

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)
          await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await contractsTab.toolbar.searchbar.clear()
          await contractsTab.toolbar.searchbar.fill(`${GET_PET_BY_TAG_V1.title}123`)

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(0)
        })
      })

      await test.step('Search operation by path', async () => {

        await test.step('Part of a word', async () => {
          await contractsTab.toolbar.searchbar.fill('/api/v1/pet/findBy')

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(2)
        })

        await test.step('Adding part of a word', async () => {
          await contractsTab.toolbar.searchbar.type('Tags')

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)
          await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
          await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toContainText('Deprecated')
        })

        await test.step('Case sensitive', async () => {
          await contractsTab.toolbar.searchbar.clear()
          await contractsTab.toolbar.searchbar.fill(GET_PET_BY_TAG_V1.path.toLowerCase())

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)
          await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
        })

        await test.step('Invalid search query with valid substring', async () => {
          await contractsTab.toolbar.searchbar.clear()
          await contractsTab.toolbar.searchbar.fill(`${GET_PET_BY_TAG_V1.path}123`)

          await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(0)
        })
      })
    })

  test('[P-OTPFI-1] Filtering Operations by Tags on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4467` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.sidebar.getTagButton('pet').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(9)

      await contractsTab.sidebar.getTagButton('store').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(5)

      await contractsTab.sidebar.getTagButton('store').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(19)
    })

  test('[P-OTPFI-2] Filtering Operations by Kind on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4758` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.sidebar.apiKindFilterAc.click()
      await contractsTab.sidebar.apiKindFilterAc.experimentalItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)

      await contractsTab.sidebar.apiKindFilterAc.fill('no bwc')

      await expect.soft(contractsTab.sidebar.apiKindFilterAc.getListItem()).toHaveCount(1)

      await contractsTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(3)

      await contractsTab.sidebar.apiKindFilterAc.click()
      await contractsTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(19)
    })

  test('[P-OTPFI-3] Complex filtering Operations with search on the Operations tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4759` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.searchbar.fill('delete')

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(3)

      await contractsTab.sidebar.getTagButton('pet').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)

      await contractsTab.sidebar.apiKindFilterAc.click()
      await contractsTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(0)

      await contractsTab.toolbar.searchbar.clear()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)

      await contractsTab.sidebar.getTagButton('pet').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(3)

      await contractsTab.sidebar.apiKindFilterAc.click()
      await contractsTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(19)

      await contractsTab.sidebar.apiKindFilterAc.click()
      await contractsTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(3)

      await contractsTab.sidebar.getTagButton('pet').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)

      await contractsTab.toolbar.searchbar.fill('delete')

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(0)

      await contractsTab.toolbar.searchbar.clear()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(1)

      await contractsTab.sidebar.getTagButton('pet').click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(3)

      await contractsTab.sidebar.apiKindFilterAc.click()
      await contractsTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(contractsTab.table.getOperationRow()).toHaveCount(19)
    })

  test('[P-OTPFI-4] Hide/Show filters on the Operations tab (List view)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6340` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.listViewBtn.click()
      await contractsTab.toolbar.filtersBtn.click()

      await expect(contractsTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(contractsTab.toolbar.filtersBtn).toBePressed()
      await expect(contractsTab.operationPreview).not.toBeVisible()

      await contractsTab.toolbar.filtersBtn.click()

      await expect(contractsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(contractsTab.toolbar.filtersBtn).not.toBePressed()
      await expect(contractsTab.operationPreview).not.toBeVisible()
    })

  test('[P-OTPFI-5] Hide/Show filters on the Operations tab (Detailed view)',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4552` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.detailedViewBtn.click()
      await contractsTab.toolbar.filtersBtn.click()

      await expect(contractsTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(contractsTab.toolbar.filtersBtn).toBePressed()
      await expect.soft(contractsTab.operationPreview).toBeVisible()

      await contractsTab.toolbar.filtersBtn.click()

      await expect(contractsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
      await expect.soft(contractsTab.toolbar.filtersBtn).not.toBePressed()
      await expect.soft(contractsTab.operationPreview).toBeVisible()
    })

  test('[P-OTPVW-3] Viewing operation details on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6501` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1).operationLink).toHaveText(GET_PET_BY_TAG_V1.title)
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1).tagsCell).toHaveText(GET_PET_BY_TAG_V1.tags!)
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1).kindCell).toHaveText(GET_PET_BY_TAG_V1.apiKind)
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1).metadataCell).toHaveText(GET_PET_BY_TAG_V1.customMetadata!)
    })

  test('[P-OTPVW-4] Switching operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4551` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.detailedViewBtn.click()

      await contractsTab.table.getOperationRow(DEL_PET_V1).click()

      await expect(contractsTab.operationPreview.operationTitle).toHaveText(DEL_PET_V1.title)
    })

  test('[P-OTPVW-5] Switching Doc/Simple/Raw modes of Preview on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4550` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.detailedViewBtn.click()

      await expect.soft(contractsTab.operationPreview.btnDoc).toBePressed()

      await contractsTab.operationPreview.btnSimple.click()

      await expect.soft(contractsTab.operationPreview.btnSimple).toBePressed()
      await expect.soft(contractsTab.operationPreview.viewDoc).toBeVisible()

      await contractsTab.operationPreview.btnRaw.click()

      await expect.soft(contractsTab.operationPreview.btnRaw).toBePressed()
      await expect.soft(contractsTab.operationPreview.viewRaw).toBeVisible()

      await contractsTab.operationPreview.btnDoc.click()

      await expect.soft(contractsTab.operationPreview.btnDoc).toBePressed()
      await expect(contractsTab.operationPreview.viewDoc).toBeVisible()
    })

  test('[P-OTPVW-6] Switching List/Detailed View on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4844` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await contractsTab.toolbar.detailedViewBtn.click()

      await expect(contractsTab.operationPreview).toBeVisible()

      await contractsTab.toolbar.listViewBtn.click()

      await expect(contractsTab.operationPreview).not.toBeVisible()
      await expect.soft(contractsTab.toolbar.listViewBtn).toBePressed()
      await expect.soft(contractsTab.toolbar.detailedViewBtn).not.toBePressed()
      await expect.soft(contractsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()

      await contractsTab.toolbar.detailedViewBtn.click()

      await expect(contractsTab.operationPreview).toBeVisible()
      await expect.soft(contractsTab.toolbar.detailedViewBtn).toBePressed()
      await expect.soft(contractsTab.toolbar.listViewBtn).not.toBePressed()
      await expect.soft(contractsTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(contractsTab.table.getOperationRow(GET_PET_BY_TAG_V1)).toBeVisible()
    })

  test('[P-OTPDN-1] Exporting operations on the Operations tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6508` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionOperationsRest, VERSION_OPERATIONS_TAB_REST)

      await test.step('Export all operations', async () => {

        const file = await contractsTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`APIOperations_${testPackage.packageId}_${V_P_PKG_OPERATIONS_REST_R.version}.xlsx`)
      })

      await test.step('Export filtered operations', async () => {

        await contractsTab.sidebar.apiKindFilterAc.click()
        await contractsTab.sidebar.apiKindFilterAc.noBwcItm.click()

        const file = await contractsTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`APIOperations_${testPackage.packageId}_${V_P_PKG_OPERATIONS_REST_R.version}.xlsx`)
      })
    })

  test('[P-OTPDN-2] Checking the disabling of the "Export operations" menu when there are no operations',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6509` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { contractsTab } = versionPage

      await portalPage.gotoVersion(versionWithoutOperations, VERSION_OPERATIONS_TAB_REST)

      await expect.soft(contractsTab.table.noOperationsPlaceholder).toBeVisible()
      await expect(contractsTab.toolbar.exportMenu).not.toBeEnabled()
    })
})
