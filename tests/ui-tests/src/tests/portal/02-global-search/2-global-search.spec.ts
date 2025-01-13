/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import {
  ARCHIVED_VERSION_STATUS,
  DRAFT_VERSION_STATUS,
  GRAPHQL_API_TYPE_TITLE,
  GRAPHQL_ICON,
  OPENAPI_ICON,
  RELEASE_VERSION_STATUS,
  REST_API_TYPE_TITLE,
  RESTAPI_ICON,
} from '@shared/entities'
import { PortalPage } from '@portal/pages/PortalPage'
import { SEARCH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import {
  GS_DOC,
  GS_LABEL,
  GS_OPERATION_GRAPHQL,
  GS_OPERATION_REST,
  GS_OPERATION_REST_REQUEST,
  P_WS_DSH_COMPARISON1_R,
  P_WS_MAIN_R,
  PK11,
  PK12,
  PK14,
  PK_GS,
  V_P_PKG_GLOBAL_SEARCH_N,
  VAR_GR,
} from '@test-data/portal'
import type { FiltersConfig } from '@portal/pages/PortalPage/GlobalSearchPanel'

test.describe('02 Global Search', () => {

  const testWorkspace = P_WS_MAIN_R
  const testGroup = VAR_GR
  const testPackage = PK_GS
  const testVersion = V_P_PKG_GLOBAL_SEARCH_N
  const filtersConfig: FiltersConfig = {
    workspace: `${testWorkspace.name} ${testWorkspace.packageId}`,
    group: `${testGroup.name} ${testGroup.packageId}`,
  }
  const filtersConfigRest: FiltersConfig = {
    ...filtersConfig,
    apiType: REST_API_TYPE_TITLE,
  }
  const filtersConfigGraphql: FiltersConfig = {
    ...filtersConfig,
    apiType: GRAPHQL_API_TYPE_TITLE,
  }

  test('[P-GSOSE-1] Search REST operation (title / description / property)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6138` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfig)

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Search by Title', async () => {
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.title)

        await expect.soft(globalSearchPanel.tabBtnOperations).toHaveText(/\D+1$/)
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST).pathToSearchResultItem)
          .toHaveText(`${testWorkspace.name} / ${testGroup.name} / ${testPackage.name} / ${testVersion.version}`)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST).versionStatus).toHaveText(testVersion.status)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toHaveIcon(RESTAPI_ICON)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST).operationType).toHaveText(GS_OPERATION_REST.type)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST).operationEndpoint).toHaveText(GS_OPERATION_REST.endpoint)
      })

      await test.step('Search by Description', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.descriptionKey)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Search by Property', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.property)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Navigate to the founded operation', async () => { //Cover TestCase-A-5756
        await globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST).link.click()

        await expect(portalPage.versionPackagePage.toolbar.title).toContainText(GS_OPERATION_REST.title)
      })
    })

  test.skip('[P-GSOSE-2] Search GraphQL operation (title / description / property)',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6222` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfig)
      })

      await test.step('Search by Title', async () => {
        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.title)

        await expect.soft(globalSearchPanel.tabBtnOperations).toHaveText(/\D+1$/)
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL).pathToSearchResultItem)
          .toHaveText(`${testWorkspace.name} / ${testGroup.name} / ${testPackage.name} / ${testVersion.version}`)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL).versionStatus).toHaveText(testVersion.status)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toHaveIcon(GRAPHQL_ICON)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL).operationType).toHaveText(GS_OPERATION_GRAPHQL.type)
      })

      await test.step('Search by Description', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.descriptionKey)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })

      await test.step('Search by Property', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.property)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })
    })

  test('[P-GSOFIL-1.1] Checking filters by Workspace/Group/Package/Version',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6223` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()

        await globalSearchPanel.filters.acVersionStatus.hover()
        await globalSearchPanel.filters.acVersionStatus.clearBtn.click()

        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.title)

        await expect.soft(globalSearchPanel.filters.acGroup).not.toBeEnabled()
        await expect.soft(globalSearchPanel.filters.acPackage).not.toBeEnabled()
      })

      await test.step('Set Workspace', async () => {
        await globalSearchPanel.filters.acWorkspace.click()
        await globalSearchPanel.filters.acWorkspace.getListItem(`${testWorkspace.name} ${testWorkspace.packageId}`).click()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST, 1)).toBeVisible()
        await expect(globalSearchPanel.filters.acWorkspace).toHaveValue(testWorkspace.name)

        await globalSearchPanel.filters.acPackage.click()

        await expect(globalSearchPanel.filters.acPackage.getListItem(`${PK11.name} ${PK11.packageId}`)).toBeVisible()
        await expect(globalSearchPanel.filters.acPackage.getListItem(`${PK12.name} ${PK12.packageId}`)).toBeVisible()
        await expect(globalSearchPanel.filters.acPackage.getListItem(`${PK14.name} ${PK14.packageId}`)).toBeVisible()
        await expect(globalSearchPanel.filters.acPackage.getListItem(`${testPackage.name} ${testPackage.packageId}`)).toBeVisible()
      })

      await test.step('Set workspace\'s Package', async () => {
        await globalSearchPanel.filters.acPackage.getListItem(`${PK11.name} ${PK11.packageId}`).click()

        await expect(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Set Group', async () => {
        await globalSearchPanel.filters.acGroup.click()
        await globalSearchPanel.filters.acGroup.getListItem(`${testGroup.name} ${testGroup.packageId}`).click()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        await expect(globalSearchPanel.filters.acGroup).toHaveValue(testGroup.name)
        await expect(globalSearchPanel.filters.acPackage).toBeEmpty()
      })

      await test.step('Set Package', async () => {
        await globalSearchPanel.filters.acPackage.click()
        await globalSearchPanel.filters.acPackage.getListItem(`${testPackage.name} ${testPackage.packageId}`).click()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        await expect(globalSearchPanel.filters.acPackage).toHaveValue(testPackage.name)
      })

      await test.step('Set Version', async () => {
        await globalSearchPanel.filters.acVersion.click()
        await globalSearchPanel.filters.acVersion.getListItem(testVersion.version).click()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        await expect(globalSearchPanel.filters.acVersion).toHaveValue(testVersion.version)
        await expect(globalSearchPanel.filters.acPackage).toHaveValue(testPackage.name)
        await expect(globalSearchPanel.filters.acGroup).toHaveValue(testGroup.name)
        await expect(globalSearchPanel.filters.acWorkspace).toHaveValue(testWorkspace.name)
      })
    })

  test('[P-GSOFIL-1.2] Check textFiler clearing',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6223` },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await portalPage.goto()
      await portalPage.header.globalSearchBtn.click()
      await globalSearchPanel.filters.acWorkspace.type(P_WS_MAIN_R.name)

      await expect(globalSearchPanel.filters.acWorkspace.getListItem(`${P_WS_MAIN_R.name} ${P_WS_MAIN_R.packageId}`)).toBeVisible()
      await expect(globalSearchPanel.filters.acWorkspace.getListItem(`${P_WS_DSH_COMPARISON1_R.name} ${P_WS_DSH_COMPARISON1_R.packageId}`)).toBeHidden()

      await globalSearchPanel.tabBtnOperations.click()
      await globalSearchPanel.filters.acWorkspace.click()

      await expect(globalSearchPanel.filters.acWorkspace.getListItem(`${P_WS_MAIN_R.name} ${P_WS_MAIN_R.packageId}`)).toBeVisible()
      await expect(globalSearchPanel.filters.acWorkspace.getListItem(`${P_WS_DSH_COMPARISON1_R.name} ${P_WS_DSH_COMPARISON1_R.packageId}`)).toBeVisible()

      await portalPage.backdrop.click({ position: { x: 1, y: 1 } })
      await portalPage.header.globalSearchBtn.click()
      await globalSearchPanel.filters.acWorkspace.click()

      await expect(globalSearchPanel.filters.acWorkspace.getListItem(`${P_WS_MAIN_R.name} ${P_WS_MAIN_R.packageId}`)).toBeVisible()
      await expect(globalSearchPanel.filters.acWorkspace.getListItem(`${P_WS_DSH_COMPARISON1_R.name} ${P_WS_DSH_COMPARISON1_R.packageId}`)).toBeVisible()
    })

  test('[P-GSOFIL-2] Checking "Version status" filter',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6268` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfig)
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.title)
      })

      await test.step(`Set "${DRAFT_VERSION_STATUS}" status`, async () => {
        await globalSearchPanel.filters.acVersionStatus.click()
        await globalSearchPanel.filters.acVersionStatus.draftItm.click()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.acVersionStatus.chipDraft).toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipRelease).not.toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipArchived).not.toBeVisible()
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step(`Add "${RELEASE_VERSION_STATUS}" status`, async () => {
        await globalSearchPanel.filters.acVersionStatus.click()
        await globalSearchPanel.filters.acVersionStatus.releaseItm.click()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.acVersionStatus.chipDraft).toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipRelease).toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipArchived).not.toBeVisible()
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step(`Add "${ARCHIVED_VERSION_STATUS}" status`, async () => {
        await globalSearchPanel.filters.acVersionStatus.click()
        await globalSearchPanel.filters.acVersionStatus.archivedItm.click()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.acVersionStatus.chipDraft).toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipRelease).toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipArchived).toBeVisible()
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step(`Remove "${DRAFT_VERSION_STATUS}" status`, async () => {
        await globalSearchPanel.filters.acVersionStatus.chipDraft.remove()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.acVersionStatus.chipDraft).not.toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipRelease).toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipArchived).toBeVisible()
        await expect(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step(`Remove "${RELEASE_VERSION_STATUS}" status`, async () => {
        await globalSearchPanel.filters.acVersionStatus.chipRelease.remove()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.acVersionStatus.chipDraft).not.toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipRelease).not.toBeVisible()
        await expect(globalSearchPanel.filters.acVersionStatus.chipArchived).toBeVisible()
        await expect(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step(`Remove "${ARCHIVED_VERSION_STATUS}" status`, async () => {
        await globalSearchPanel.filters.acVersionStatus.chipArchived.remove()
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.acVersionStatus).toBeEmpty()
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })
    })

  test.skip('[P-GSOFIL-3] Checking "Version publication date" filter',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6224` },
        { type: 'Issue', description: 'Tests for Date picker need to be reworked' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfig)
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.title)
      })

      await test.step('Set date period', async () => {
        const today = new Date().getDate().toString()

        await globalSearchPanel.filters.datePicker.click()
        await globalSearchPanel.filters.datePicker.dateCell(today).click()
        await globalSearchPanel.filters.datePicker.dateCell(today).click()
        await globalSearchPanel.tabBtnOperations.click() // for closing date picker
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.filters.datePicker).not.toBeEmpty()
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })
    })

  test('[P-GSOFIL-4] Checking "API Type" filter and tab switching',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6225` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfig)
      })

      await test.step('Search operations and check filters state', async () => {
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.descriptionKey)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        //! await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible() //Issue GraphQL checks temporarily disabled
        await expect.soft(globalSearchPanel.filters.chxSearchOnly).toBeEnabled()
        await expect.soft(globalSearchPanel.filters.acApiType).toBeDisabled()
      })

      await test.step('Check "Search only" checkbox', async () => {
        await globalSearchPanel.filters.chxSearchOnly.click()

        await expect.soft(globalSearchPanel.filters.acApiType).toHaveValue(globalSearchPanel.filters.acApiType.restApiItm.componentName!)
        await expect.soft(globalSearchPanel.filters.acScope).toBeEnabled()
        await expect.soft(globalSearchPanel.filters.acDetailedScope).toBeEnabled()
        await expect.soft(globalSearchPanel.filters.acMethods).toBeEnabled()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).not.toBeVisible()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Select "GraphQL" API type', async () => {
        await globalSearchPanel.filters.acApiType.click()
        await globalSearchPanel.filters.acApiType.graphQlItm.click()

        await expect.soft(globalSearchPanel.filters.acApiType).toHaveValue(globalSearchPanel.filters.acApiType.graphQlItm.componentName!)
        //! await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible() //Issue GraphQL checks temporarily disabled
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).not.toBeVisible()
      })

      await test.step('Uncheck "Search only" checkbox', async () => {
        await globalSearchPanel.filters.chxSearchOnly.click()

        await expect.soft(globalSearchPanel.filters.chxSearchOnly).toBeEnabled()
        await expect.soft(globalSearchPanel.filters.acApiType).toBeDisabled()
        //! await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible() //Issue GraphQL checks temporarily disabled
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Switch tabs', async () => {
        await globalSearchPanel.filters.chxSearchOnly.click()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).not.toBeVisible()
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()

        await globalSearchPanel.tabBtnDocuments.click()

        await expect.soft(globalSearchPanel.searchResults.phNoDocuments).toBeVisible()
        await expect.soft(globalSearchPanel.filters.chxSearchOnly).toBeDisabled()
        await expect.soft(globalSearchPanel.filters.acApiType).toBeDisabled()

        await globalSearchPanel.tabBtnPackages.click()

        await expect.soft(globalSearchPanel.searchResults.phNoPackages).toBeVisible()
        await expect.soft(globalSearchPanel.filters.chxSearchOnly).toBeDisabled()
        await expect.soft(globalSearchPanel.filters.acApiType).toBeDisabled()
      })
    })

  test('[P-GSOFIR-1] Checking "Search scope" filter for REST',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6226` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfigRest)
      })

      await test.step('Set "response" scope', async () => {
        await globalSearchPanel.filters.acScope.click()
        await globalSearchPanel.filters.acScope.responseItm.click()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.responseDescriptionKey)

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()

        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST_REQUEST.requestDescriptionKey)

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Add "request" scope', async () => {
        await globalSearchPanel.filters.acScope.click()
        await globalSearchPanel.filters.acScope.requestItm.click()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST_REQUEST)).toBeVisible()
      })

      await test.step('Remove scopes', async () => {
        await globalSearchPanel.filters.acScope.chipRequest.remove()

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()

        await globalSearchPanel.filters.acScope.chipResponse.remove()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST_REQUEST)).toBeVisible()
      })
    })

  test('[P-GSOFIR-2] Checking "Detailed search scope" filter for REST',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6227` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfigRest)
      })

      await test.step('Set "properties" scope', async () => {
        await globalSearchPanel.filters.acDetailedScope.click()
        await globalSearchPanel.filters.acDetailedScope.propertiesItm.click()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.property)

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()

        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.descriptionKey)

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Add "annotation" scope', async () => {
        await globalSearchPanel.filters.acDetailedScope.click()
        await globalSearchPanel.filters.acDetailedScope.annotationItm.click()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()

        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.exampleProperty)

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Add "examples" scope', async () => {
        await globalSearchPanel.filters.acDetailedScope.click()
        await globalSearchPanel.filters.acDetailedScope.examplesItm.click()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Remove scopes', async () => {
        await globalSearchPanel.filters.acDetailedScope.examplesChip.remove()
        await globalSearchPanel.filters.acDetailedScope.annotationChip.remove()

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()

        await globalSearchPanel.filters.acDetailedScope.propertiesChip.remove()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })
    })

  test('[P-GSOFIR-3] Checking "Methods" filter for REST',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6228` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfigRest)
      })

      await test.step('Set "get" method', async () => {
        await globalSearchPanel.filters.acMethods.click()
        await globalSearchPanel.filters.acMethods.getItm.click()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.title)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Add other methods', async () => {
        await globalSearchPanel.filters.acMethods.click()
        await globalSearchPanel.filters.acMethods.postItm.click()
        await globalSearchPanel.filters.acMethods.click()
        await globalSearchPanel.filters.acMethods.putItm.click()
        await globalSearchPanel.filters.acMethods.click()
        await globalSearchPanel.filters.acMethods.patchItm.click()
        await globalSearchPanel.filters.acMethods.click()
        await globalSearchPanel.filters.acMethods.deleteItm.click()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })

      await test.step('Remove "get" method', async () => {
        await globalSearchPanel.filters.acMethods.chipGet.remove()

        await expect(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Remove other methods', async () => {
        await globalSearchPanel.filters.acMethods.chipPost.remove()
        await globalSearchPanel.filters.acMethods.chipPut.remove()
        await globalSearchPanel.filters.acMethods.chipPatch.remove()
        await globalSearchPanel.filters.acMethods.chipDelete.remove()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
      })
    })

  test('[P-GSOFIR-4] Complex filtering and resetting for REST',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6269` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
      })

      await test.step('Set filters', async () => {
        const today = new Date().getDate().toString()

        await globalSearchPanel.setFilters(filtersConfigRest)
        await globalSearchPanel.filters.acPackage.click()
        await globalSearchPanel.filters.acPackage.getListItem(`${testPackage.name} ${testPackage.packageId}`).click()
        await globalSearchPanel.filters.acVersion.click()
        await globalSearchPanel.filters.acVersion.getListItem(testVersion.version).click()
        await globalSearchPanel.filters.acVersionStatus.click()
        await globalSearchPanel.filters.acVersionStatus.draftItm.click()
        // await globalSearchPanel.filters.datePicker.click()
        // await globalSearchPanel.filters.datePicker.dateCell(today).click()
        // await globalSearchPanel.filters.datePicker.dateCell(today).click()
        // await globalSearchPanel.tabBtnOperations.click() // for closing date picker
        await globalSearchPanel.filters.acScope.click()
        await globalSearchPanel.filters.acScope.responseItm.click()
        await globalSearchPanel.filters.acDetailedScope.click()
        await globalSearchPanel.filters.acDetailedScope.propertiesItm.click()
        await globalSearchPanel.filters.acMethods.click()
        await globalSearchPanel.filters.acMethods.getItm.click()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_REST.property)

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        await expect.soft(globalSearchPanel.filters.acWorkspace).not.toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acGroup).not.toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acPackage).not.toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acVersion).not.toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acVersionStatus.chipDraft).toBeVisible()
        await expect.soft(globalSearchPanel.filters.datePicker).not.toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acApiType).not.toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acScope.chipResponse).toBeVisible()
        await expect.soft(globalSearchPanel.filters.acDetailedScope.propertiesChip).toBeVisible()
        await expect.soft(globalSearchPanel.filters.acMethods.chipGet).toBeVisible()
      })

      await test.step('Reset filters', async () => {
        await globalSearchPanel.filters.btnReset.click()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_REST)).toBeVisible()
        await expect.soft(globalSearchPanel.filters.acWorkspace).toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acGroup).toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acPackage).toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acVersion).toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acVersionStatus.chipDraft).not.toBeVisible()
        // await expect.soft(globalSearchPanel.filters.datePicker).toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acApiType).toBeEmpty()
        await expect.soft(globalSearchPanel.filters.acScope.chipResponse).not.toBeVisible()
        await expect.soft(globalSearchPanel.filters.acDetailedScope.propertiesChip).not.toBeVisible()
        await expect.soft(globalSearchPanel.filters.acMethods.chipGet).not.toBeVisible()
      })
    })

  test.skip('[P-GSOFIG-1] Checking "Search scope" filter for GraphQL',
    {
      tag: '@smoke',
      annotation: [
        { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6229` },
        { type: 'Issue', description: `${TICKET_BASE_URL}TestCase-B-826` },
        { type: 'Issue', description: 'GraphQL checks temporarily disabled' },
      ],
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfigGraphql)
      })

      await test.step('Set "argument" scope', async () => {
        await globalSearchPanel.filters.acScope.click()
        await globalSearchPanel.filters.acScope.argumentItm.click()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.argument)

        // await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible() //TODO TestCase-B-826

        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.property)

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Add "property" scope', async () => {
        await globalSearchPanel.filters.acScope.click()
        await globalSearchPanel.filters.acScope.propertyItm.click()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()

        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.descriptionKey)

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Add "annotation" scope', async () => {
        await globalSearchPanel.filters.acScope.click()
        await globalSearchPanel.filters.acScope.annotationItm.click()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })

      await test.step('Remove scopes', async () => {
        await globalSearchPanel.filters.acScope.chipProperty.remove()
        await globalSearchPanel.filters.acScope.chipAnnotation.remove()

        await expect.soft(globalSearchPanel.searchResults.phNoOperations).toBeVisible()

        await globalSearchPanel.filters.acScope.chipArgument.remove()

        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })
    })

  test('[P-GSOFIG-2] Checking "Operation type" filter for GraphQL',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6230` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.setFilters(filtersConfigGraphql)
      })

      await test.step('Set "query" type', async () => {
        await globalSearchPanel.filters.acOperationTypes.click()
        await globalSearchPanel.filters.acOperationTypes.queryItm.click()
        await globalSearchPanel.searchbar.fill(GS_OPERATION_GRAPHQL.title)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })

      await test.step('Add other types', async () => {
        await globalSearchPanel.filters.acOperationTypes.click()
        await globalSearchPanel.filters.acOperationTypes.mutationItm.click()
        await globalSearchPanel.filters.acOperationTypes.click()
        await globalSearchPanel.filters.acOperationTypes.subscriptionItm.click()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })

      await test.step('Remove "query" type', async () => {
        await globalSearchPanel.filters.acOperationTypes.chipQuery.remove()

        await expect(globalSearchPanel.searchResults.phNoOperations).toBeVisible()
      })

      await test.step('Remove other types', async () => {
        await globalSearchPanel.filters.acOperationTypes.chipMutation.remove()
        await globalSearchPanel.filters.acOperationTypes.chipSubscription.remove()

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_OPERATION_GRAPHQL)).toBeVisible()
      })
    })

  test('[P-GSDSE-1] Search document (title / label / content)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6232` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.tabBtnDocuments.click()
        await globalSearchPanel.setFilters(filtersConfig)

        await expect.soft(globalSearchPanel.searchResults.phNoDocuments).toBeVisible()
      })

      await test.step('Search by Title', async () => {
        await globalSearchPanel.searchbar.fill(GS_DOC.title)

        await expect.soft(globalSearchPanel.tabBtnDocuments).toHaveText(/\D+1$/)
        await expect(globalSearchPanel.searchResults.searchResultRow(GS_DOC)).toBeVisible()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_DOC).pathToSearchResultItem)
          .toHaveText(`${testWorkspace.name} / ${testGroup.name} / ${testPackage.name} / ${testVersion.version}`)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_DOC).versionStatus).toHaveText(testVersion.status)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_DOC)).toHaveIcon(OPENAPI_ICON)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_DOC).publicationDate).not.toBeEmpty()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(GS_DOC).docContent).toBeVisible()
      })

      await test.step('Search by Label', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_DOC.label)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_DOC)).toBeVisible()
      })

      await test.step('Search by Content', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_DOC.descriptionKey)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(GS_DOC)).toBeVisible()
      })
    })

  test('[P-GSPSE-2] Search package (name / description / alias / service name / version name / version label)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6233` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { globalSearchPanel } = portalPage
      const testSearchResult = {
        title: `${testPackage.name} / ${testVersion.version}`,
      }

      await test.step('Setup', async () => {
        await portalPage.goto()
        await portalPage.header.globalSearchBtn.click()
        await globalSearchPanel.tabBtnPackages.click()
        await globalSearchPanel.setFilters(filtersConfig)

        await expect.soft(globalSearchPanel.searchResults.phNoPackages).toBeVisible()
      })

      await test.step('Search by Name', async () => {
        await globalSearchPanel.searchbar.fill(testPackage.name)

        await expect.soft(globalSearchPanel.tabBtnPackages).toHaveText(/\D+1$/)
        await expect(globalSearchPanel.searchResults.searchResultRow(testSearchResult)).toBeVisible()
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(testSearchResult).pathToSearchResultItem)
          .toHaveText(`${testWorkspace.name} / ${testGroup.name}`)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(testSearchResult).versionStatus).toHaveText(testVersion.status)
        await expect.soft(globalSearchPanel.searchResults.searchResultRow(testSearchResult).publicationDate).not.toBeEmpty()
      })

      await test.step('Search by Description', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(testPackage.description!)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(testSearchResult)).toBeVisible()
      })

      await test.step('Search by Alias', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(testPackage.alias)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(testSearchResult)).toBeVisible()
      })

      await test.step('Search by Service name', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(testPackage.serviceName!)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(testSearchResult)).toBeVisible()
      })

      await test.step('Search by Version name', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(testVersion.version)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(testSearchResult)).toBeVisible()
      })

      await test.step('Search by Version label', async () => {
        await globalSearchPanel.searchbar.clear()
        await globalSearchPanel.searchbar.fill(GS_LABEL)
        await portalPage.waitForTimeout(SEARCH_TIMEOUT.short)

        await expect(globalSearchPanel.searchResults.searchResultRow(testSearchResult)).toBeVisible()
      })
    })
})
