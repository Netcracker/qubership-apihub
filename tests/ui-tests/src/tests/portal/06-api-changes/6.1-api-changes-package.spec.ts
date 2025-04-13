import { test } from '@fixtures'
import { expect, expectFile } from '@services/expect-decorator'
import { GRAPHQL_API_TYPE_TITLE, REST_API_TYPE_TITLE } from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { LONG_EXPECT, TICKET_BASE_URL } from '@test-setup'
import { TOOLTIP_SEVERITY_MSG } from '@test-data/shared'
import {
  CREATE_LIST_OF_USERS_V1_UPDATED,
  DEL_ORDER_V1,
  GET_USER_BY_NAME_V1,
  GQL_LIST_PETS,
  PK11,
  UPDATE_USER_V1,
  UPLOADS_IMAGE_V1,
  V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  V_P_PKG_CHANGELOG_REST_NO_CHANGES_R,
  V_P_PKG_REST_PREV_AFTER_CUR_CHANGED,
} from '@test-data/portal'
import { VERSION_CHANGES_TAB_REST } from '@portal/entities'

test.describe('6.1 API Changes (Package)', () => {

  const versionChangedRest = V_P_PKG_CHANGELOG_REST_CHANGED_R
  const versionChangedMulti = V_P_PKG_CHANGELOG_MULTI_CHANGED_R
  const versionNoChangesMulti = V_P_PKG_CHANGELOG_REST_NO_CHANGES_R

  test('[P-CHPOP-1.1] Opening the API Changes tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5321` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest)

      await versionPage.apiChangesTab.click()

      await expect.soft(apiChangesTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(apiChangesTab.sidebar.groupFilterAc).toBeDisabled()
      await expect.soft(apiChangesTab.sidebar.searchbar).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.comparedToLnk).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.breakingChangesFilterBtn).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.riskyChangesFilterBtn).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.deprecatedChangesFilterBtn).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.nonBreakingChangesFilterBtn).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.annotationChangesFilterBtn).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.unclassifiedChangesFilterBtn).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.searchbar).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.exportMenu).toBeVisible()
    })

  test('[P-CHPOP-1.2] Opening the API Changes tab when the latest revision of previous version is published after current version',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5321` },
        { type: 'Flaky', description: 'Sometimes, the API Changes tab displays a placeholder "No changes" instead of a list of operations with changes.' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(V_P_PKG_REST_PREV_AFTER_CUR_CHANGED)

      await versionPage.apiChangesTab.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5)
    })

  test('[P-CHPSE-1] Search operations on the API Changes tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4499` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await test.step('Search by title', async () => {

        await test.step('Part of a word', async () => {
          await apiChangesTab.toolbar.searchbar.fill('us')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3, { timeout: LONG_EXPECT })
        })

        await test.step('Adding part of a word', async () => {
          await apiChangesTab.toolbar.searchbar.type('ers')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })
        })

        await test.step('Clearing a search query', async () => {
          await apiChangesTab.toolbar.searchbar.clear()

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5, { timeout: LONG_EXPECT })
        })

        await test.step('Two words', async () => {
          await apiChangesTab.toolbar.searchbar.clear()
          await apiChangesTab.toolbar.searchbar.fill('creates list')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })
        })

        await test.step('Upper case', async () => {
          await apiChangesTab.toolbar.searchbar.clear()
          await apiChangesTab.toolbar.searchbar.fill('Creates')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })
        })

        await test.step('Invalid search query with valid substring', async () => {
          await apiChangesTab.toolbar.searchbar.clear()
          await apiChangesTab.toolbar.searchbar.fill('Creates123')

          await expect.soft(apiChangesTab.table.noSearchResultsPlaceholder).toBeVisible({ timeout: LONG_EXPECT })
        })
      })

      await test.step('Search by path', async () => {

        await test.step('Part of a word', async () => {
          await apiChangesTab.toolbar.searchbar.fill('/api/v1/user')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3, { timeout: LONG_EXPECT })
        })

        await test.step('Adding part of a word', async () => {
          await apiChangesTab.toolbar.searchbar.type('/createWithList')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })
        })

        await test.step('Clearing a search query', async () => {
          await apiChangesTab.toolbar.searchbar.clear()

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5, { timeout: LONG_EXPECT })
        })

        await test.step('Upper case', async () => {
          await apiChangesTab.toolbar.searchbar.clear()
          await apiChangesTab.toolbar.searchbar.fill('/api/v1/User')

          await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3, { timeout: LONG_EXPECT })
        })

        await test.step('Invalid search query with valid substring', async () => {
          await apiChangesTab.toolbar.searchbar.clear()
          await apiChangesTab.toolbar.searchbar.fill('/api/v1/user/createWithList123')

          await expect.soft(apiChangesTab.table.noSearchResultsPlaceholder).toBeVisible({ timeout: LONG_EXPECT })
        })
      })
    })

  test('[P-CHPSE-2] Search tags on the API Changes tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5322` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await test.step('Part of a word', async () => {
        await apiChangesTab.sidebar.searchbar.fill('p')

        await expect.soft(apiChangesTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Adding part of a word', async () => {
        await apiChangesTab.sidebar.searchbar.fill('pet')

        await expect.soft(apiChangesTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Clearing a search query', async () => {
        await apiChangesTab.sidebar.searchbar.clear()

        await expect.soft(apiChangesTab.sidebar.getTagButton()).toHaveCount(3)
      })

      await test.step('Upper case', async () => {
        await apiChangesTab.sidebar.searchbar.clear()
        await apiChangesTab.sidebar.searchbar.fill('Pet')

        await expect.soft(apiChangesTab.sidebar.getTagButton()).toHaveCount(1)
      })

      await test.step('Invalid search query with valid substring', async () => {
        await apiChangesTab.sidebar.searchbar.clear()
        await apiChangesTab.sidebar.searchbar.fill('Pet123')

        await expect.soft(apiChangesTab.sidebar.getTagButton()).toHaveCount(0)
      })

      await test.step('Select item during search', async () => {
        await apiChangesTab.sidebar.searchbar.fill('p')

        await apiChangesTab.sidebar.getTagButton('pet').click()
        await expect(apiChangesTab.sidebar.getTagButton()).toHaveCount(1)
        await expect(apiChangesTab.sidebar.searchbar).toHaveValue('p')
      })
    })

  test('[P-CHPVW-1] Switching operations API Type on the API Changes tab',
    {
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4500` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedMulti, VERSION_CHANGES_TAB_REST)

      await expect(apiChangesTab.toolbar.breakingChangesFilterBtn).toHaveText('2')

      await apiChangesTab.toolbar.sltApiType.click()
      await apiChangesTab.toolbar.sltApiType.graphQlItm.click()

      await expect.soft(apiChangesTab.toolbar.sltApiType).toHaveText(GRAPHQL_API_TYPE_TITLE)
      await expect(apiChangesTab.toolbar.breakingChangesFilterBtn).toHaveText('1')
      await expect(apiChangesTab.table.getOperationRow(GQL_LIST_PETS)).toBeVisible()
      await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).not.toBeVisible()

      await apiChangesTab.toolbar.sltApiType.click()
      await apiChangesTab.toolbar.sltApiType.restApiItm.click()

      await expect.soft(apiChangesTab.toolbar.sltApiType).toHaveText(REST_API_TYPE_TITLE)
      await expect(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect(apiChangesTab.table.getOperationRow(GQL_LIST_PETS)).not.toBeVisible()
    })

  test('[P-CHPVW-2] Checking for the absence of the API type selector when there is only one operation type on the API Changes tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5323` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await expect.soft(apiChangesTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.sltApiType).not.toBeVisible()
    })

  test('[P-CHPFI-1] Filtering operations by Tag on the API Changes tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5324` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.sidebar.getTagButton('pet').click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.getTagButton('user').click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.getTagButton('user').click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5, { timeout: LONG_EXPECT })
    })

  test('[P-CHPFI-2] Filtering operations by Kind on the API Changes tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5325` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.sidebar.apiKindFilterAc.click()
      await apiChangesTab.sidebar.apiKindFilterAc.bwcItm.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.apiKindFilterAc.fill('no bwc')

      await expect.soft(apiChangesTab.sidebar.apiKindFilterAc.getListItem()).toHaveCount(1, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.apiKindFilterAc.noBwcItm.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(2, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.apiKindFilterAc.click()
      await apiChangesTab.sidebar.apiKindFilterAc.allItm.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5, { timeout: LONG_EXPECT })
    })

  test('[P-CHPVW-3] Viewing operation details on the API Changes tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4503` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await expect.soft(apiChangesTab.table.getOperationRow(UPLOADS_IMAGE_V1)).toContainText(UPLOADS_IMAGE_V1.title)
      await expect.soft(apiChangesTab.table.getOperationRow(UPLOADS_IMAGE_V1).tagsCell).toHaveText(UPLOADS_IMAGE_V1.tags!)
      await expect.soft(apiChangesTab.table.getOperationRow(UPLOADS_IMAGE_V1).kindCell).toHaveText(UPLOADS_IMAGE_V1.apiKind)
      await expect.soft(apiChangesTab.table.getOperationRow(UPLOADS_IMAGE_V1).changesCell.breakingChanges).toHaveText('1')

      await expect.soft(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).changesCell.breakingChanges).toHaveText('1')
      await expect.soft(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).changesCell.riskyChanges).toHaveText('1')
      await expect.soft(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).changesCell.deprecatedChanges).toHaveText('1')
      await expect.soft(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).changesCell.nonBreakingChanges).toHaveText('1')
      await expect.soft(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).changesCell.annotationChanges).toHaveText('1')
      await expect.soft(apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).changesCell.unclassifiedChanges).toHaveText('1')

      await expect.soft(apiChangesTab.table.getOperationRow(UPDATE_USER_V1).changesCell.deprecatedChanges).toHaveText('1')

      await expect.soft(apiChangesTab.table.getOperationRow(DEL_ORDER_V1).changesCell.riskyChanges).toHaveText('1')

      await expect.soft(apiChangesTab.table.getOperationRow(GET_USER_BY_NAME_V1).changesCell.nonBreakingChanges).toHaveText('1')
    })

  test('[P-CHPVW-4] Expanding operation details on the API Changes tab',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5327` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).expandBtn.click()

      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.annotation!.description).changeSeverityIndicator).toHaveText('annotation')
      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.unclassified!.description).changeSeverityIndicator).toHaveText('unclassified')
      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.deprecated!.description).changeSeverityIndicator).toHaveText('deprecated')
      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.risky!.description).changeSeverityIndicator).toHaveText('requires attention')
      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.nonBreaking!.description).changeSeverityIndicator).toHaveText('non-breaking')
      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.breaking!.description).changeSeverityIndicator).toHaveText('breaking')

      await apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).collapseBtn.click()

      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(CREATE_LIST_OF_USERS_V1_UPDATED.changes!.breaking!.description)).not.toBeVisible()

      await apiChangesTab.table.getOperationRow(DEL_ORDER_V1).expandBtn.click()

      await expect.soft(apiChangesTab.table.getChangeDescriptionCell(DEL_ORDER_V1.changes!.risky!.description).changeSeverityIndicator).toHaveText('requires attention')
    })

  test('[P-CHPVW-5] Navigation to the Operation Compare page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4502` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab, compareOperationsPage } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).operationLink.click({
        position: {
          x: 1,
          y: 1,
        },
      })

      await expect.soft(compareOperationsPage.sidebar.getOperationButton(CREATE_LIST_OF_USERS_V1_UPDATED)).toBeVisible()
      await expect.soft(compareOperationsPage.swapper.leftTitle).toHaveText(V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version)
      await expect.soft(compareOperationsPage.swapper.rightTitle).toHaveText(V_P_PKG_CHANGELOG_REST_CHANGED_R.version)
    })

  test('[P-CHPVW-6] Navigation to the “compared to” Version',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4501` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab, overviewTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await expect.soft(apiChangesTab.toolbar.comparedToLnk).toHaveText(V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version)

      await apiChangesTab.toolbar.comparedToLnk.click()

      await expect.soft(overviewTab.summaryTab.body.summary.currentVersion).toHaveText(V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version)

    })

  test('[P-CHPFI-4] Filtering operations by changes type',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4992` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage
      const operationRow = apiChangesTab.table.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED)

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await test.step('Check changes quantity on the filter buttons', async () => {
        await expect.soft(apiChangesTab.toolbar.breakingChangesFilterBtn).toHaveText('2')
        await expect.soft(apiChangesTab.toolbar.riskyChangesFilterBtn).toHaveText('2')
        await expect.soft(apiChangesTab.toolbar.deprecatedChangesFilterBtn).toHaveText('2')
        await expect.soft(apiChangesTab.toolbar.nonBreakingChangesFilterBtn).toHaveText('2')
        await expect.soft(apiChangesTab.toolbar.annotationChangesFilterBtn).toHaveText('1')
        await expect.soft(apiChangesTab.toolbar.unclassifiedChangesFilterBtn).toHaveText('1')
      })

      await test.step('Check changes tooltips on the filter buttons', async () => {
        await apiChangesTab.toolbar.breakingChangesFilterBtn.hover()

        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.breaking)

        await apiChangesTab.toolbar.riskyChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        for (const msg of TOOLTIP_SEVERITY_MSG.risky) {
          await expect.soft(portalPage.tooltip).toContainText(msg)
        }

        await apiChangesTab.toolbar.deprecatedChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.deprecated)

        await apiChangesTab.toolbar.nonBreakingChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.nonBreaking)

        await apiChangesTab.toolbar.annotationChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.annotation)

        await apiChangesTab.toolbar.unclassifiedChangesFilterBtn.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.unclassified)
      })

      await test.step('Check changes tooltips on the changes summary', async () => {
        await operationRow.changesCell.breakingChanges.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.breaking)

        await operationRow.changesCell.riskyChanges.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        for (const msg of TOOLTIP_SEVERITY_MSG.risky) {
          await expect.soft(portalPage.tooltip).toContainText(msg)
        }

        await operationRow.changesCell.deprecatedChanges.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.deprecated)

        await operationRow.changesCell.nonBreakingChanges.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.nonBreaking)

        await operationRow.changesCell.annotationChanges.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.annotation)

        await operationRow.changesCell.unclassifiedChanges.hover()

        await expect(portalPage.tooltip).toHaveCount(1)
        await expect.soft(portalPage.tooltip).toContainText(TOOLTIP_SEVERITY_MSG.unclassified)
      })

      await test.step('Check filtering', async () => {
        await apiChangesTab.toolbar.breakingChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(2)

        await apiChangesTab.toolbar.riskyChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3)

        await apiChangesTab.toolbar.deprecatedChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(4)

        await apiChangesTab.toolbar.nonBreakingChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5)

        await apiChangesTab.toolbar.annotationChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5)

        await apiChangesTab.toolbar.unclassifiedChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5)

        await apiChangesTab.toolbar.breakingChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(4)

        await apiChangesTab.toolbar.riskyChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3)

        await apiChangesTab.toolbar.deprecatedChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(2)

        await apiChangesTab.toolbar.nonBreakingChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1)

        await apiChangesTab.toolbar.annotationChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1)

        await apiChangesTab.toolbar.unclassifiedChangesFilterBtn.click()

        await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(5)
      })
    })

  test('[P-CHPFI-5] Filtering operations by changes type with additional filters',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5422` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.toolbar.breakingChangesFilterBtn.click()
      await apiChangesTab.toolbar.deprecatedChangesFilterBtn.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(3, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.apiKindFilterAc.click()
      await apiChangesTab.sidebar.apiKindFilterAc.bwcItm.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(2, { timeout: LONG_EXPECT })

      await apiChangesTab.sidebar.getTagButton('pet').click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })
    })

  test('[P-CHPFI-6] Filtering operations by changes type with search',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-5423` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.toolbar.nonBreakingChangesFilterBtn.click()

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(2, { timeout: LONG_EXPECT })

      await apiChangesTab.toolbar.searchbar.fill('create')

      await expect.soft(apiChangesTab.table.getOperationRow()).toHaveCount(1, { timeout: LONG_EXPECT })
    })

  test('[P-CHPFI-7] Hide/Show filters on the API Changes tab',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6231` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await apiChangesTab.toolbar.filtersBtn.click()

      await expect(apiChangesTab.sidebar.apiKindFilterAc).not.toBeVisible()
      await expect.soft(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.filtersBtn).toBePressed()
      await expect(apiChangesTab.operationPreview).not.toBeVisible()

      await apiChangesTab.toolbar.filtersBtn.click()

      await expect(apiChangesTab.sidebar.apiKindFilterAc).toBeVisible()
      await expect.soft(apiChangesTab.table.getOperationRow(UPDATE_USER_V1)).toBeVisible()
      await expect.soft(apiChangesTab.toolbar.filtersBtn).not.toBePressed()
      await expect(apiChangesTab.operationPreview).not.toBeVisible()
    })

  test('[P-CHPDN-1] Exporting changes',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4504` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionChangedRest, VERSION_CHANGES_TAB_REST)

      await test.step('Download all changes', async () => {

        const file = await apiChangesTab.toolbar.exportMenu.downloadAll()

        await expectFile.soft(file).toHaveName(`APIChanges_${PK11.packageId}_${V_P_PKG_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })

      await test.step('Download filtered changes', async () => {

        await apiChangesTab.toolbar.nonBreakingChangesFilterBtn.click()

        const file = await apiChangesTab.toolbar.exportMenu.downloadFiltered()

        await expectFile.soft(file).toHaveName(`APIChanges_${PK11.packageId}_${V_P_PKG_CHANGELOG_REST_CHANGED_R.version}.xlsx`)
      })
    })

  test('[P-CHPDN-2] Checking the disabling of the "Export changes" menu when there are no changes',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4993` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { apiChangesTab } = versionPage

      await portalPage.gotoVersion(versionNoChangesMulti, VERSION_CHANGES_TAB_REST)
      await expect(apiChangesTab.toolbar.exportMenu).not.toBeEnabled()
    })
})
