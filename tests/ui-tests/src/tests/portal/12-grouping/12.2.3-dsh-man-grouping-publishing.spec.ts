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
import { PortalPage } from '@portal/pages/PortalPage'
import {
  OGR_DMGR_PROP_DELETED_N,
  OGR_DMGR_PROP_GQL_N,
  OGR_DMGR_PROP_REST_N,
  V_DSH_DMGR_PROP_DIF_SPEC_N,
  V_DSH_DMGR_PROP_N,
  V_DSH_DMGR_PROP_SAME_SPEC_N,
} from '@test-data/portal'
import { API_TITLES_MAP } from '@shared/entities'
import { SYSADMIN } from '@test-data'
import { TICKET_BASE_URL } from '@test-setup'

test.describe('12.2.3 Manual grouping: Publishing (Dashboards)', () => {

  test('[P-MGO-9.1] Grouping: publish new revision',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10187` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const testVersion = V_DSH_DMGR_PROP_N
      const restGroup = OGR_DMGR_PROP_REST_N
      const gqlGroup = OGR_DMGR_PROP_GQL_N

      await test.step('Publish new revision via API', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await test.step('Open "Overview" tab', async () => {
        await portalPage.gotoVersion(testVersion)

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
        await expect(overviewTab.summaryTab.body.summary.revision).toHaveText('2')
      })

      await test.step('Open "Groups" tab', async () => {
        await groupsTab.click()

        await expect(groupsTab.getGroupRow()).toHaveCount(2)
        await expect(groupsTab.getGroupRow(restGroup.groupName).nameCell.templateIcon).toBeVisible()
        await expect(groupsTab.getGroupRow(restGroup.groupName).descriptionCell).toHaveText(restGroup.description!)
        await expect(groupsTab.getGroupRow(restGroup.groupName).apiTypeCell).toHaveText(API_TITLES_MAP[restGroup.apiType])
        await expect(groupsTab.getGroupRow(restGroup.groupName).operationsNumberCell).toHaveText('2')
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).nameCell.templateIcon).toBeHidden()
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).descriptionCell).toHaveText(gqlGroup.description!)
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).apiTypeCell).toHaveText(API_TITLES_MAP[gqlGroup.apiType])
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).operationsNumberCell).toHaveText('2')
      })
    })

  test('[P-MGO-9.2] Grouping: publish same specifications',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10187` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab } = overviewTab
      const testVersion = V_DSH_DMGR_PROP_SAME_SPEC_N
      const restGroup = OGR_DMGR_PROP_REST_N
      const gqlGroup = OGR_DMGR_PROP_GQL_N

      await test.step('Publish new version', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await test.step('Open "Overview" tab', async () => {
        await portalPage.gotoVersion(testVersion)

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
        await expect(overviewTab.summaryTab.body.summary.revision).toHaveText('1')
      })

      await test.step('Open "Groups" tab', async () => {
        await groupsTab.click()

        await expect(groupsTab.getGroupRow()).toHaveCount(2)
        await expect(groupsTab.getGroupRow(restGroup.groupName).nameCell.templateIcon).toBeVisible()
        await expect(groupsTab.getGroupRow(restGroup.groupName).descriptionCell).toHaveText(restGroup.description!)
        await expect(groupsTab.getGroupRow(restGroup.groupName).apiTypeCell).toHaveText(API_TITLES_MAP[restGroup.apiType])
        await expect(groupsTab.getGroupRow(restGroup.groupName).operationsNumberCell).toHaveText('2')
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).nameCell.templateIcon).toBeHidden()
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).descriptionCell).toHaveText(gqlGroup.description!)
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).apiTypeCell).toHaveText(API_TITLES_MAP[gqlGroup.apiType])
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).operationsNumberCell).toHaveText('2')
      })
    })

  test('[P-MGO-9.3] Grouping: publish different specifications',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-10187` },
    },
    async ({ sysadminPage: page, apihubTDM }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { groupsTab, activityHistoryTab } = overviewTab
      const testVersion = V_DSH_DMGR_PROP_DIF_SPEC_N
      const restGroup = OGR_DMGR_PROP_REST_N
      const gqlGroup = OGR_DMGR_PROP_GQL_N
      const delGroup = OGR_DMGR_PROP_DELETED_N
      const createdRecord = activityHistoryTab.getHistoryRecord(`Created ${delGroup.groupName}`)
      const changedRecord = activityHistoryTab.getHistoryRecord(`Changed operations list of ${restGroup.groupName}`)
      const deletedRecord = activityHistoryTab.getHistoryRecord(`Deleted ${delGroup.groupName}`)

      await test.step('Publish new version', async () => {
        await apihubTDM.publishVersion(testVersion)
      })

      await test.step('Open "Overview" tab', async () => {
        await portalPage.gotoVersion(testVersion)

        await expect(versionPage.toolbar.versionSlt).toHaveText(testVersion.version)
        await expect(overviewTab.summaryTab.body.summary.revision).toHaveText('1')
      })

      await test.step('Open "Groups" tab', async () => {
        await groupsTab.click()

        await expect(groupsTab.getGroupRow()).toHaveCount(2)
        await expect(groupsTab.getGroupRow(restGroup.groupName).nameCell.templateIcon).toBeVisible()
        await expect(groupsTab.getGroupRow(restGroup.groupName).descriptionCell).toHaveText(restGroup.description!)
        await expect(groupsTab.getGroupRow(restGroup.groupName).apiTypeCell).toHaveText(API_TITLES_MAP[restGroup.apiType])
        await expect(groupsTab.getGroupRow(restGroup.groupName).operationsNumberCell).toHaveText('1')
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).nameCell.templateIcon).toBeHidden()
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).descriptionCell).toHaveText(gqlGroup.description!)
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).apiTypeCell).toHaveText(API_TITLES_MAP[gqlGroup.apiType])
        await expect(groupsTab.getGroupRow(gqlGroup.groupName).operationsNumberCell).toHaveText('1')
      })

      await test.step('Open "Activity History" tab', async () => {
        await activityHistoryTab.click()

        await expect(createdRecord).toHaveCount(1)
        await expect(createdRecord.date).not.toBeEmpty()
        await expect(createdRecord.user).toHaveText(SYSADMIN.name)
        await expect(changedRecord).toHaveCount(1)
        await expect(changedRecord.date).not.toBeEmpty()
        await expect(changedRecord.user).toHaveText(SYSADMIN.name)
        await expect(deletedRecord).toHaveCount(1)
        await expect(deletedRecord.date).not.toBeEmpty()
        await expect(deletedRecord.user).toHaveText(SYSADMIN.name)
      })
    })
})
