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
import { saveSsFileByLocalViaAPI, SS_USER1_PATH } from '@services/storage-state'
import { createApihubTDM } from '@services/test-data-manager'
import { AUTH, CREATE_TD } from '@test-setup'
import { isReusableTestDataExist } from '@test-data/utils'
import {
  COPYING_REST_GR,
  D11,
  D12,
  D121,
  D122,
  D123,
  D_REV_IMM,
  D_REV_VAR,
  DSH_P_ADMIN_DELETING_N,
  DSH_P_ADMIN_EDITING_N,
  DSH_P_ADMIN_N,
  DSH_P_EDITOR_N,
  DSH_P_HIERARCHY_BREAKING_R,
  DSH_P_HIERARCHY_NO_CHANGES_R,
  DSH_P_HIERARCHY_NON_BREAKING_R,
  DSH_P_OWNER_DELETING_N,
  DSH_P_OWNER_EDITING_N,
  DSH_P_OWNER_N,
  DSH_P_VIEWER_R,
  G_PUBLISH_IMM,
  G_PUBLISH_VAR,
  G_REV_IMM,
  G_REV_VAR,
  G_SETTINGS_VAR,
  GRP_P_ADMIN_CRUD_N,
  GRP_P_ADMIN_DELETING_N,
  GRP_P_ADMIN_EDITING_N,
  GRP_P_ADMIN_N,
  GRP_P_ADMIN_ROOT_N,
  GRP_P_EDITOR_N,
  GRP_P_EDITOR_ROOT_N,
  GRP_P_HIERARCHY_R,
  GRP_P_OWNER_CRUD_N,
  GRP_P_OWNER_DELETING_N,
  GRP_P_OWNER_EDITING_N,
  GRP_P_OWNER_N,
  GRP_P_OWNER_ROOT_N,
  GRP_P_UAC_G1_N,
  GRP_P_UAC_G2_N,
  GRP_P_UAC_GENERAL_N,
  GRP_P_UAC_N,
  GRP_P_UAC_R,
  GRP_P_VIEWER_R,
  GRP_P_VIEWER_ROOT_R,
  IMM_GR,
  OGR_DMGR_ADD_TO_EMPTY_N,
  OGR_DMGR_CHANGE_DESCRIPTION_N,
  OGR_DMGR_CHANGE_NAME_N,
  OGR_DMGR_CHANGE_OPERATIONS_N,
  OGR_DMGR_CHANGELOG1_R,
  OGR_DMGR_CHANGELOG2_R,
  OGR_DMGR_CHANGELOG3_R,
  OGR_DMGR_DELETE_N,
  OGR_DMGR_DOWNLOAD_GQL_R,
  OGR_DMGR_DOWNLOAD_REST_R,
  OGR_DMGR_FILTERING_GQL_R,
  OGR_DMGR_FILTERING_REST_R,
  OGR_DMGR_PROP_DELETED_N,
  OGR_DMGR_PROP_GQL_N,
  OGR_DMGR_PROP_REST_N,
  OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
  OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N,
  OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
  OGR_PMGR_ADD_TO_EMPTY_N,
  OGR_PMGR_CHANGE_DESCRIPTION_N,
  OGR_PMGR_CHANGE_NAME_N,
  OGR_PMGR_CHANGE_OPERATIONS_N,
  OGR_PMGR_DELETE_N,
  OGR_PMGR_DOWNLOAD_GQL_R,
  OGR_PMGR_DOWNLOAD_PUBLISH_N,
  OGR_PMGR_DOWNLOAD_REST_R,
  OGR_PMGR_FILTERING_GQL_R,
  OGR_PMGR_FILTERING_REST_DEPRECATED_R,
  OGR_PMGR_FILTERING_REST_R,
  OGR_PMGR_PROP_DELETED_N,
  OGR_PMGR_PROP_GQL_N,
  OGR_PMGR_PROP_REST_N,
  OGR_PPGR_EDITING_N,
  OGR_UAC_DSH_REST,
  ORG_DSH_UAC_ADMIN_REST_CHANGING_OPERATIONS_N,
  ORG_DSH_UAC_ADMIN_REST_DELETING_N,
  ORG_DSH_UAC_ADMIN_REST_EDITING_PARAMS_N,
  ORG_DSH_UAC_EDITOR_REST_CHANGING_OPERATIONS_N,
  ORG_DSH_UAC_EDITOR_REST_DELETING_N,
  ORG_DSH_UAC_EDITOR_REST_EDITING_PARAMS_N,
  ORG_DSH_UAC_OWNER_REST_CHANGING_OPERATIONS_N,
  ORG_DSH_UAC_OWNER_REST_DELETING_N,
  ORG_DSH_UAC_OWNER_REST_EDITING_PARAMS_N,
  ORG_PKG_UAC_ADMIN_REST_CHANGING_OPERATIONS_N,
  ORG_PKG_UAC_ADMIN_REST_DELETING_N,
  ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N,
  ORG_PKG_UAC_ADMIN_REST_EDITING_PARAMS_N,
  ORG_PKG_UAC_EDITOR_REST_CHANGING_OPERATIONS_N,
  ORG_PKG_UAC_EDITOR_REST_DELETING_N,
  ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N,
  ORG_PKG_UAC_EDITOR_REST_EDITING_PARAMS_N,
  ORG_PKG_UAC_OWNER_REST_CHANGING_OPERATIONS_N,
  ORG_PKG_UAC_OWNER_REST_DELETING_N,
  ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
  ORG_PKG_UAC_OWNER_REST_EDITING_PARAMS_N,
  ORG_UAC_PKG_REST,
  P_DSH_CP_EMPTY,
  P_DSH_CP_PATTERN,
  P_DSH_CP_RELEASE,
  P_DSH_CP_SOURCE,
  P_DSH_DELETE,
  P_DSH_DIFF_111_R,
  P_DSH_DIFF_222_R,
  P_DSH_DIFF_333_R,
  P_DSH_DIFF_444_R,
  P_DSH_DMGR1_N,
  P_DSH_DMGR2_N,
  P_DSH_DMGR_R,
  P_DSH_FAV_LIST,
  P_DSH_UNFAV_FAV_PAGE,
  P_DSH_UNFAV_LIST,
  P_DSH_UPDATE,
  P_GR_CHILD_LVL1,
  P_GR_CHILD_LVL2,
  P_GR_COPYING_IMM,
  P_GR_COPYING_VAR,
  P_GR_CRUD,
  P_GR_DELETE,
  P_GR_FAV_LIST,
  P_GR_FAV_TITLE,
  P_GR_UNFAV_FAV_PAGE,
  P_GR_UNFAV_LIST,
  P_GR_UNFAV_TITLE,
  P_GR_UPDATE,
  P_GRP_DIFF_DSH_11_R,
  P_GRP_DIFF_DSH_12_R,
  P_GRP_DIFF_DSH_13_R,
  P_GRP_DIFF_DSH_21_R,
  P_GRP_DIFF_DSH_22_R,
  P_GRP_GROUPING_N,
  P_GRP_GROUPING_R,
  P_PK_CP_EMPTY,
  P_PK_CP_PATTERN,
  P_PK_CP_RELEASE,
  P_PK_CP_SOURCE,
  P_PK_DELETE,
  P_PK_FAV_LIST,
  P_PK_PGND,
  P_PK_UNFAV_FAV_PAGE,
  P_PK_UNFAV_LIST,
  P_PKG_DMGR_PET_R,
  P_PKG_DMGR_STORE_R,
  P_PKG_DMGR_USER_R,
  P_PKG_PMGR1_N,
  P_PKG_PMGR2_N,
  P_PKG_PMGR_R,
  P_PKG_PPGR_EDIT_N,
  P_PKG_PPGR_GQL_R,
  P_PKG_PPGR_REST_R,
  P_PKG_PPGR_SETTINGS_R,
  P_WS_DELETE_N,
  P_WS_DSH_COMPARISON1_R,
  P_WS_DSH_COMPARISON2_R,
  P_WS_FAV_LIST_N,
  P_WS_FAV_TITLE_N,
  P_WS_MAIN_R,
  P_WS_UNFAV_LIST_N,
  P_WS_UNFAV_TITLE_N,
  P_WS_UPDATE_N,
  PK11,
  PK12,
  PK13,
  PK14,
  PK15,
  PK_GS,
  PK_PUB_IMM_1,
  PK_PUB_IMM_2,
  PK_PUB_IMM_3,
  PK_PUB_VAR_1,
  PK_PUB_VAR_2,
  PK_REV_IMM,
  PK_REV_VAR,
  PK_SETTINGS_1,
  PK_SETTINGS_2,
  PK_SETTINGS_3,
  PKG_P_ADMIN_DELETING_N,
  PKG_P_ADMIN_EDITING_N,
  PKG_P_ADMIN_N,
  PKG_P_EDITOR_N,
  PKG_P_HIERARCHY_BREAKING_R,
  PKG_P_HIERARCHY_NO_CHANGES_R,
  PKG_P_HIERARCHY_NON_BREAKING_R,
  PKG_P_OWNER_DELETING_N,
  PKG_P_OWNER_EDITING_N,
  PKG_P_OWNER_N,
  PKG_P_UAC_G_ASSIGN_N,
  PKG_P_UAC_G_INHER_N,
  PKG_P_UAC_G_MULT1_N,
  PKG_P_UAC_G_MULT2_N,
  PKG_P_UAC_G_MULT3_N,
  PKG_P_UAC_G_TOKENS_N,
  PKG_P_VIEWER_R,
  V_DSH_DIFF_1111_1_R,
  V_DSH_DIFF_1111_2_R,
  V_DSH_DIFF_2222_1_BASE_REV_R,
  V_DSH_DIFF_2222_1_R,
  V_DSH_DIFF_3333_1_R,
  V_DSH_DIFF_4444_1_R,
  V_DSH_DMGR_BASE_R,
  V_DSH_DMGR_CHANGED_R,
  V_DSH_DMGR_N,
  V_DSH_DMGR_PROP_N,
  V_P_DSH_CHANGELOG_REST_BASE_R,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
  V_P_DSH_COMPARISON_BASE_R,
  V_P_DSH_COMPARISON_CHANGED_R,
  V_P_DSH_CONFLICT_PKG_NESTED_R,
  V_P_DSH_COPYING_RELEASE_N,
  V_P_DSH_COPYING_SOURCE_R,
  V_P_DSH_CRUD_RELEASE_N,
  V_P_DSH_DRAFT_N,
  V_P_DSH_HIERARCHY_BREAKING_BASE_R,
  V_P_DSH_HIERARCHY_BREAKING_CHANGED_R,
  V_P_DSH_HIERARCHY_NO_CHANGES_BASE_R,
  V_P_DSH_HIERARCHY_NO_CHANGES_CHANGED_R,
  V_P_DSH_HIERARCHY_NON_BREAKING_BASE_R,
  V_P_DSH_HIERARCHY_NON_BREAKING_CHANGED_R,
  V_P_DSH_NOT_EXIST_PKG_NESTED_R,
  V_P_DSH_OVERVIEW_NESTED_R,
  V_P_DSH_OVERVIEW_R,
  V_P_DSH_RELEASE_N,
  V_P_DSH_REPUBLISH_N,
  V_P_DSH_REV_1_N,
  V_P_DSH_REV_1_R,
  V_P_DSH_REV_2_R,
  V_P_DSH_REV_3_R,
  V_P_DSH_REV_PREV_N,
  V_P_DSH_REV_PREV_R,
  V_P_DSH_UAC_ADMIN_BASE_N,
  V_P_DSH_UAC_ADMIN_CHANGED_N,
  V_P_DSH_UAC_ADMIN_DELETING_N,
  V_P_DSH_UAC_ADMIN_EDIT_DSH_DEF_RELEASE_N,
  V_P_DSH_UAC_ADMIN_EDITING_ARCHIVED_N,
  V_P_DSH_UAC_ADMIN_EDITING_DRAFT_N,
  V_P_DSH_UAC_ADMIN_EDITING_RELEASE_N,
  V_P_DSH_UAC_EDITOR_BASE_N,
  V_P_DSH_UAC_EDITOR_CHANGED_N,
  V_P_DSH_UAC_EDITOR_DELETING_N,
  V_P_DSH_UAC_EDITOR_EDITING_ARCHIVED_N,
  V_P_DSH_UAC_EDITOR_EDITING_DRAFT_N,
  V_P_DSH_UAC_EDITOR_EDITING_RELEASE_N,
  V_P_DSH_UAC_OWNER_BASE_N,
  V_P_DSH_UAC_OWNER_CHANGED_N,
  V_P_DSH_UAC_OWNER_DELETING_N,
  V_P_DSH_UAC_OWNER_EDIT_DSH_DEF_RELEASE_N,
  V_P_DSH_UAC_OWNER_EDITING_ARCHIVED_N,
  V_P_DSH_UAC_OWNER_EDITING_DRAFT_N,
  V_P_DSH_UAC_OWNER_EDITING_RELEASE_N,
  V_P_DSH_UAC_VIEWER_BASE_R,
  V_P_DSH_UAC_VIEWER_CHANGED_R,
  V_P_PKG_ARCHIVED_R,
  V_P_PKG_CHANGELOG_MULTI_BASE_R,
  V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  V_P_PKG_CHANGELOG_MULTI_DEL_GQL_R,
  V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R,
  V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R,
  V_P_PKG_CHANGELOG_REST_BASE_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_PK12_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R,
  V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  V_P_PKG_CHANGELOG_REST_NO_CHANGES_R,
  V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R,
  V_P_PKG_CHANGELOG_REST_THREE_DOCS_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_TWO_DOCS_R,
  V_P_PKG_COPYING_RELEASE_N,
  V_P_PKG_COPYING_SOURCE_R,
  V_P_PKG_DEPRECATED_REST_BASE_R,
  V_P_PKG_DEPRECATED_REST_CHANGED_R,
  V_P_PKG_DEPRECATED_REST_NO_DEPRECATED_R,
  V_P_PKG_DOCUMENTS_R,
  V_P_PKG_DRAFT_R,
  V_P_PKG_EDITING_FOR_NEW_REVISION_N,
  V_P_PKG_EDITING_FOR_NEW_VERSION_N,
  V_P_PKG_EDITING_SEARCH_R,
  V_P_PKG_FOR_DASHBOARDS_DELETED_R,
  V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R,
  V_P_PKG_FOR_DASHBOARDS_GQL_R,
  V_P_PKG_FOR_DASHBOARDS_REST_BASE_R,
  V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R,
  V_P_PKG_GLOBAL_SEARCH_N,
  V_P_PKG_HIERARCHY_BREAKING_BASE_R,
  V_P_PKG_HIERARCHY_BREAKING_CHANGED_R,
  V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R,
  V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R,
  V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R,
  V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R,
  V_P_PKG_OPERATIONS_MULTI_TYPE_R,
  V_P_PKG_OPERATIONS_REST_R,
  V_P_PKG_OPERATIONS_REST_TWO_DOCS_R,
  V_P_PKG_OVERVIEW_R,
  V_P_PKG_PLAYGROUND_R,
  V_P_PKG_REST_PREV_AFTER_CUR_BASE,
  V_P_PKG_REST_PREV_AFTER_CUR_CHANGED,
  V_P_PKG_REV_1_N,
  V_P_PKG_REV_1_R,
  V_P_PKG_REV_2_R,
  V_P_PKG_REV_3_R,
  V_P_PKG_REV_PREV_N,
  V_P_PKG_REV_PREV_R,
  V_P_PKG_SET_FOR_DEF_RELEASE_N,
  V_P_PKG_SET_FOR_DELETE_N,
  V_P_PKG_SET_FOR_SET_RELEASE_N,
  V_P_PKG_SET_FOR_UPDATE_N,
  V_P_PKG_SET_N,
  V_P_PKG_UAC_ADMIN_BASE_N,
  V_P_PKG_UAC_ADMIN_CHANGED_N,
  V_P_PKG_UAC_ADMIN_DELETING_N,
  V_P_PKG_UAC_ADMIN_EDIT_PKG_DEF_RELEASE_N,
  V_P_PKG_UAC_ADMIN_EDITING_ARCHIVED_N,
  V_P_PKG_UAC_ADMIN_EDITING_DRAFT_N,
  V_P_PKG_UAC_ADMIN_EDITING_RELEASE_N,
  V_P_PKG_UAC_EDITOR_BASE_N,
  V_P_PKG_UAC_EDITOR_CHANGED_N,
  V_P_PKG_UAC_EDITOR_DELETING_N,
  V_P_PKG_UAC_EDITOR_EDITING_ARCHIVED_N,
  V_P_PKG_UAC_EDITOR_EDITING_DRAFT_N,
  V_P_PKG_UAC_EDITOR_EDITING_RELEASE_N,
  V_P_PKG_UAC_OWNER_BASE_N,
  V_P_PKG_UAC_OWNER_CHANGED_N,
  V_P_PKG_UAC_OWNER_DELETING_N,
  V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N,
  V_P_PKG_UAC_OWNER_EDITING_ARCHIVED_N,
  V_P_PKG_UAC_OWNER_EDITING_DRAFT_N,
  V_P_PKG_UAC_OWNER_EDITING_RELEASE_N,
  V_P_PKG_UAC_VIEWER_BASE_R,
  V_P_PKG_UAC_VIEWER_CHANGED_R,
  V_P_PKG_WITHOUT_LABELS_R,
  V_P_PKG_WITHOUT_OPERATIONS_R,
  V_PKG_DIFF_DSH_REST_2000_1_R,
  V_PKG_DIFF_DSH_REST_BASE_R,
  V_PKG_DMGR_PET_BASE_R,
  V_PKG_DMGR_PET_CHANGED_R,
  V_PKG_DMGR_PET_PROP_R,
  V_PKG_DMGR_STORE_R,
  V_PKG_DMGR_USER_BASE_R,
  V_PKG_DMGR_USER_CHANGED_R,
  V_PKG_PMGR_BASE_R,
  V_PKG_PMGR_CHANGED_R,
  V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
  V_PKG_PMGR_N,
  V_PKG_PMGR_PROP_N,
  V_PKG_PPGR_EDIT_N,
  V_PKG_PPGR_GQL_R,
  V_PKG_PPGR_REST_BASE_R,
  V_PKG_PPGR_REST_CHANGED_R,
  V_PKG_PPGR_SETTINGS_R,
  VAR_GR,
  WSP_P_UAC_GENERAL_N,
} from '@test-data/portal'
import { TEST_USER_1, TEST_USER_2, TEST_USER_3, TEST_USER_4 } from '@test-data'

test.describe.configure({ mode: 'serial', retries: 0 })

test.describe('Users', async () => {

  test('Create Users', async ({ usersTDM: tdm }) => {
    test.skip(CREATE_TD === 'skip', 'Test Data creation is skipped')
    const users = [TEST_USER_1, TEST_USER_2, TEST_USER_3, TEST_USER_4]
    for (const user of users) {
      await tdm.createGeneralUser(user)
    }
  })

  test('Authentication', async () => {
    test.skip(AUTH === 'skip', 'Authentication is skipped')
    await saveSsFileByLocalViaAPI(TEST_USER_1)
    await saveSsFileByLocalViaAPI(TEST_USER_4)
  })
})

test.describe('Reusable Test Data creation', async () => {
  test.skip(CREATE_TD === 'skip', 'Test Data creation is skipped')

  let isReusableTdExist!: boolean

  test.beforeAll(async () => {
    isReusableTdExist = await isReusableTestDataExist('portal')
  })

  test.describe('General', async () => {
    test('Test Entities creation', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')

      await test.step('Create Workspaces', async () => {
        const workspaces = [
          P_WS_MAIN_R,
          P_WS_DSH_COMPARISON1_R,
          P_WS_DSH_COMPARISON2_R,
        ]
        for (const workspace of workspaces) {
          await tdm.createPackage(workspace)
        }
      })

      await test.step('Create Groups', async () => {
        const groups = [
          IMM_GR,
          GRP_P_HIERARCHY_R,
          GRP_P_UAC_R,
          GRP_P_VIEWER_ROOT_R,
          GRP_P_VIEWER_R,
          G_PUBLISH_IMM,
          P_GRP_DIFF_DSH_11_R,
          P_GRP_DIFF_DSH_12_R,
          P_GRP_DIFF_DSH_13_R,
          P_GRP_DIFF_DSH_21_R,
          P_GRP_DIFF_DSH_22_R,
          P_GRP_GROUPING_R,
          G_REV_IMM,
          P_GR_COPYING_IMM,
        ]
        for (const group of groups) {
          await tdm.createPackage(group)
        }
      })

      await test.step('Create Packages', async () => {
        const packages = [
          PK11,
          PK12,
          PK13,
          PK14,
          PK15,
          PK_REV_IMM,
          P_PKG_DMGR_PET_R,
          P_PKG_DMGR_USER_R,
          P_PKG_DMGR_STORE_R,
          P_PKG_PMGR_R,
          P_PKG_PPGR_REST_R,
          P_PKG_PPGR_GQL_R,
          P_PKG_PPGR_SETTINGS_R,
          PK_PUB_IMM_1,
          PK_PUB_IMM_2,
          PK_PUB_IMM_3,
          P_PK_CP_SOURCE,
          P_PK_CP_PATTERN,
          P_PK_PGND,
          PKG_P_VIEWER_R,
        ]
        for (const pkg of packages) {
          await tdm.createPackage(pkg)
        }
      })

      await test.step('Create Dashboards', async () => {
        const dashboards = [D11, D12, D_REV_IMM, P_DSH_DIFF_111_R, P_DSH_DIFF_222_R, P_DSH_DIFF_333_R, P_DSH_DIFF_444_R, P_DSH_DMGR_R, P_DSH_CP_PATTERN, P_DSH_CP_SOURCE, DSH_P_VIEWER_R]
        for (const dashboard of dashboards) {
          await tdm.createPackage(dashboard)
        }
      })

      await test.step('Favor Workspace', async () => {
        await tdm.favorPackage(P_WS_MAIN_R)
      })

      await test.step('Add members to packages ', async () => {
        await tdm.addMembersToPackage({
          packageId: PK_REV_IMM.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['editor'],
        })
        await tdm.addMembersToPackage({
          packageId: D_REV_IMM.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['editor'],
        })
        await tdm.addMembersToPackage({
          packageId: GRP_P_VIEWER_R.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['viewer'],
        })
        await tdm.addMembersToPackage({
          packageId: PKG_P_VIEWER_R.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['viewer'],
        })
        await tdm.addMembersToPackage({
          packageId: DSH_P_VIEWER_R.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['viewer'],
        })
      })

      await test.step('Create API Keys for groups ', async () => {
        await tdm.createPackageApiKeys({
          packageId: GRP_P_VIEWER_R.packageId,
          apiKeys: GRP_P_VIEWER_R.apiKeys!,
        })
      })

      await test.step('Create API Keys for packages ', async () => {
        await tdm.createPackageApiKeys({
          packageId: PKG_P_VIEWER_R.packageId,
          apiKeys: PKG_P_VIEWER_R.apiKeys!,
        })
      })

      await test.step('Create API Keys for dashboards ', async () => {
        await tdm.createPackageApiKeys({
          packageId: DSH_P_VIEWER_R.packageId,
          apiKeys: DSH_P_VIEWER_R.apiKeys!,
        })
      })
    })

    test('Test Versions creation', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')

      await test.step('Publish Versions', async () => {
        const versions = [
          V_P_PKG_DRAFT_R, V_P_PKG_ARCHIVED_R, V_P_PKG_WITHOUT_LABELS_R,
          V_P_PKG_WITHOUT_OPERATIONS_R,
          V_P_PKG_OPERATIONS_MULTI_TYPE_R,
          V_P_PKG_OPERATIONS_REST_R,
          V_P_PKG_OPERATIONS_REST_TWO_DOCS_R,
          V_P_PKG_DOCUMENTS_R,
          V_P_PKG_DOCUMENTS_R,
          V_P_PKG_CHANGELOG_MULTI_BASE_R,
          V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R,
          V_P_PKG_CHANGELOG_REST_BASE_R,
          V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
          V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
          V_P_PKG_CHANGELOG_REST_NO_CHANGES_R,
          V_P_PKG_CHANGELOG_REST_CHANGED_R,
          V_P_PKG_CHANGELOG_REST_CHANGED_PK12_R,
          V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R,
          V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R,
          V_P_PKG_CHANGELOG_REST_TWO_DOCS_R,
          V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R,
          V_P_PKG_CHANGELOG_REST_THREE_DOCS_CHANGED_R,
          V_P_PKG_CHANGELOG_MULTI_DEL_GQL_R,
          V_P_PKG_DEPRECATED_REST_BASE_R,
          V_P_PKG_DEPRECATED_REST_NO_DEPRECATED_R,
          V_P_PKG_DEPRECATED_REST_CHANGED_R,
          V_P_PKG_OVERVIEW_R,
          V_P_PKG_FOR_DASHBOARDS_REST_BASE_R,
          V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R,
          V_P_PKG_FOR_DASHBOARDS_DELETED_R,
          V_P_PKG_FOR_DASHBOARDS_GQL_R,
          V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R,
          V_P_DSH_CONFLICT_PKG_NESTED_R,
          V_P_DSH_NOT_EXIST_PKG_NESTED_R,
          V_P_DSH_OVERVIEW_NESTED_R,
          V_P_DSH_OVERVIEW_R,
          V_P_DSH_CHANGELOG_REST_BASE_R,
          V_P_DSH_CHANGELOG_REST_CHANGED_R,
          V_P_DSH_COMPARISON_BASE_R,
          V_P_DSH_COMPARISON_CHANGED_R,
          V_PKG_DIFF_DSH_REST_BASE_R,
          V_PKG_DIFF_DSH_REST_2000_1_R,
          V_DSH_DIFF_1111_1_R,
          V_DSH_DIFF_1111_2_R,
          V_DSH_DIFF_2222_1_BASE_REV_R,
          V_DSH_DIFF_2222_1_R,
          V_DSH_DIFF_3333_1_R,
          V_DSH_DIFF_4444_1_R,
          V_P_PKG_REV_PREV_R,
          V_P_PKG_REV_1_R,
          V_P_PKG_REV_2_R,
          V_P_DSH_REV_PREV_R,
          V_P_DSH_REV_1_R,
          V_P_DSH_REV_2_R,
          V_PKG_DMGR_PET_BASE_R,
          V_PKG_DMGR_PET_CHANGED_R,
          V_PKG_DMGR_PET_PROP_R,
          V_PKG_DMGR_USER_BASE_R,
          V_PKG_DMGR_USER_CHANGED_R,
          V_PKG_DMGR_STORE_R,
          // V_PKG_DMGR_200_1_R, //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
          // V_PKG_DMGR_200_2_R,
          // V_PKG_DMGR_200_3_R,
          V_DSH_DMGR_BASE_R,
          V_DSH_DMGR_CHANGED_R,
          // V_DSH_DMGR_200_R, //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
          V_PKG_PMGR_BASE_R,
          V_PKG_PMGR_CHANGED_R,
          // V_PKG_PMGR_200_R, //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
          V_PKG_PPGR_REST_BASE_R,
          V_PKG_PPGR_REST_CHANGED_R,
          V_PKG_PPGR_GQL_R,
          V_PKG_PPGR_SETTINGS_R,
          V_P_PKG_EDITING_SEARCH_R,
          V_P_PKG_COPYING_SOURCE_R,
          V_P_DSH_COPYING_SOURCE_R,
          V_P_PKG_PLAYGROUND_R,
          V_P_PKG_UAC_VIEWER_BASE_R,
          V_P_PKG_UAC_VIEWER_CHANGED_R,
          V_P_DSH_UAC_VIEWER_BASE_R,
          V_P_DSH_UAC_VIEWER_CHANGED_R,
          V_P_PKG_REST_PREV_AFTER_CUR_BASE, // 1 - Be sure to keep the publication order
          V_P_PKG_REST_PREV_AFTER_CUR_CHANGED, // 2
          V_P_PKG_REST_PREV_AFTER_CUR_BASE, // 3
        ]
        for (const version of versions) {
          await tdm.publishVersion(version)
        }
      })

      await test.step('Archive Version', async () => {
        await tdm.updatePackageVersion({ ...V_P_PKG_ARCHIVED_R, status: 'archived' })
      })

      await test.step('Publish 2nd revision for some versions', async () => {
        await tdm.publishVersion(V_P_PKG_OVERVIEW_R)
        await tdm.publishVersion(V_P_DSH_OVERVIEW_R)
      })

      await test.step('Delete (hide) package for dashboard overview', async () => {
        await tdm.deletePackage(PK13)
      })

      await test.step('Publish by another User', async () => {
        const tdmUser1 = await createApihubTDM(SS_USER1_PATH)
        const versions = [V_P_PKG_REV_3_R, V_P_DSH_REV_3_R]
        for (const version of versions) {
          await tdmUser1.publishVersion(version)
        }
      })
    })

    test('Create operation groups', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')
      const operationGroups = [
        OGR_DMGR_DOWNLOAD_REST_R,
        OGR_DMGR_DOWNLOAD_GQL_R,
        // OGR_DMGR_MORE_200_R, //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
        OGR_DMGR_FILTERING_REST_R,
        OGR_DMGR_FILTERING_GQL_R,
        OGR_DMGR_CHANGELOG1_R,
        OGR_DMGR_CHANGELOG2_R,
        OGR_DMGR_CHANGELOG3_R,
        OGR_PMGR_DOWNLOAD_REST_R,
        OGR_PMGR_DOWNLOAD_GQL_R,
        // OGR_PMGR_MORE_200_R, //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
        OGR_PMGR_FILTERING_REST_R,
        OGR_PMGR_FILTERING_REST_DEPRECATED_R,
        OGR_PMGR_FILTERING_GQL_R,
        COPYING_REST_GR,
        ORG_UAC_PKG_REST,
        OGR_UAC_DSH_REST,
      ]
      for (const operationGroup of operationGroups) {
        await tdm.createOperationGroup(operationGroup)
      }
    })
  })

  test.describe('Hierarchy', async () => {

    test('Create Groups', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')
      const groups = [
        GRP_P_HIERARCHY_R,
      ]
      for (const group of groups) {
        await tdm.createPackage(group)
      }
    })

    test('Create Packages', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')
      const packages = [
        PKG_P_HIERARCHY_BREAKING_R,
        PKG_P_HIERARCHY_NON_BREAKING_R,
        PKG_P_HIERARCHY_NO_CHANGES_R,
      ]
      for (const pkg of packages) {
        await tdm.createPackage(pkg)
      }
    })

    test('Create Dashboards', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')
      const dashboards = [
        DSH_P_HIERARCHY_BREAKING_R,
        DSH_P_HIERARCHY_NON_BREAKING_R,
        DSH_P_HIERARCHY_NO_CHANGES_R,
      ]
      for (const dashboard of dashboards) {
        await tdm.createPackage(dashboard)
      }
    })

    test('Publish Versions', async ({ apihubTDM: tdm }) => {
      test.skip(isReusableTdExist, 'Reusable Test Data is already exist')
      const versions = [
        V_P_PKG_HIERARCHY_BREAKING_BASE_R,
        V_P_PKG_HIERARCHY_BREAKING_CHANGED_R,
        V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R,
        V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R,
        V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R,
        V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R,
        V_P_DSH_HIERARCHY_BREAKING_BASE_R,
        V_P_DSH_HIERARCHY_BREAKING_CHANGED_R,
        V_P_DSH_HIERARCHY_NON_BREAKING_BASE_R,
        V_P_DSH_HIERARCHY_NON_BREAKING_CHANGED_R,
        V_P_DSH_HIERARCHY_NO_CHANGES_BASE_R,
        V_P_DSH_HIERARCHY_NO_CHANGES_CHANGED_R,
      ]
      for (const version of versions) {
        await tdm.publishVersion(version)
      }
    })
  })
})

test.describe('Non-Reusable Test Data creation', async () => {
  test.skip(CREATE_TD === 'skip', 'Test Data creation is skipped')

  test.describe('General', async () => {
    test('Test Entities creation', async ({ apihubTDM: tdm }) => {

      await test.step('Create Workspaces', async () => {
        const workspaces = [
          P_WS_UPDATE_N,
          P_WS_DELETE_N,
          P_WS_FAV_LIST_N,
          P_WS_FAV_TITLE_N,
          P_WS_UNFAV_LIST_N,
          P_WS_UNFAV_TITLE_N,
          WSP_P_UAC_GENERAL_N,
        ]
        for (const workspace of workspaces) {
          await tdm.createPackage(workspace)
        }
      })

      await test.step('Create Groups', async () => {
        const groups = [
          VAR_GR, G_REV_VAR,
          P_GRP_GROUPING_N,
          G_PUBLISH_VAR,
          G_SETTINGS_VAR,
          P_GR_CRUD,
          P_GR_CHILD_LVL1,
          P_GR_CHILD_LVL2,
          P_GR_UPDATE,
          P_GR_DELETE,
          P_GR_FAV_LIST,
          P_GR_FAV_TITLE,
          P_GR_UNFAV_LIST,
          P_GR_UNFAV_TITLE,
          P_GR_UNFAV_FAV_PAGE,
          P_GR_COPYING_VAR,
          GRP_P_UAC_N,
          GRP_P_UAC_G1_N,
          GRP_P_UAC_G2_N,
          GRP_P_UAC_GENERAL_N,
        ]
        for (const group of groups) {
          await tdm.createPackage(group)
        }
      })

      await test.step('Create Packages', async () => {
        const packages = [
          PK_GS,
          PK_REV_VAR,
          PK_PUB_VAR_1,
          PK_PUB_VAR_2,
          PK_SETTINGS_1,
          PK_SETTINGS_2,
          PK_SETTINGS_3,
          P_PK_DELETE,
          P_PK_FAV_LIST,
          P_PK_UNFAV_LIST,
          P_PK_UNFAV_FAV_PAGE,
          P_PKG_PMGR1_N,
          P_PKG_PMGR2_N,
          P_PKG_PPGR_EDIT_N,
          P_PK_CP_EMPTY,
          P_PK_CP_RELEASE,
          PKG_P_UAC_G_INHER_N,
          PKG_P_UAC_G_ASSIGN_N,
          PKG_P_UAC_G_MULT1_N,
          PKG_P_UAC_G_MULT2_N,
          PKG_P_UAC_G_MULT3_N,
          PKG_P_UAC_G_TOKENS_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackage(pkg)
        }
      })

      await test.step('Create Dashboards', async () => {
        const dashboards = [
          D121,
          D122,
          D123,
          D_REV_VAR,
          P_DSH_UPDATE,
          P_DSH_DELETE,
          P_DSH_FAV_LIST,
          P_DSH_UNFAV_LIST,
          P_DSH_UNFAV_FAV_PAGE,
          P_DSH_DMGR1_N,
          P_DSH_DMGR2_N,
          P_DSH_CP_EMPTY,
          P_DSH_CP_RELEASE,
        ]
        for (const dashboard of dashboards) {
          await tdm.createPackage(dashboard)
        }
      })

      await test.step('Favor Workspaces', async () => {
        const workspaces = [P_WS_UNFAV_LIST_N, P_WS_UNFAV_TITLE_N]
        for (const workspace of workspaces) {
          await tdm.favorPackage(workspace)
        }
      })

      await test.step('Favor Groups', async () => {
        const groups = [P_GR_UNFAV_LIST, P_GR_UNFAV_TITLE, P_GR_UNFAV_FAV_PAGE]
        for (const group of groups) {
          await tdm.favorPackage(group)
        }
      })

      await test.step('Favor Packages', async () => {
        const packages = [P_PK_UNFAV_LIST, P_PK_UNFAV_FAV_PAGE]
        for (const pkg of packages) {
          await tdm.favorPackage(pkg)
        }
      })

      await test.step('Favor Dashboards', async () => {
        const dashboards = [P_DSH_UNFAV_LIST, P_DSH_UNFAV_FAV_PAGE]
        for (const dashboard of dashboards) {
          await tdm.favorPackage(dashboard)
        }
      })

      await test.step('Create API Keys for packages', async () => {
        const packages = [PKG_P_UAC_G_TOKENS_N]
        for (const pkg of packages) {
          await tdm.createPackageApiKeys({
            packageId: pkg.packageId,
            apiKeys: pkg.apiKeys!,
          })
        }
      })

      await test.step('Add members to packages ', async () => {
        await tdm.addMembersToPackage({
          packageId: PKG_P_UAC_G_MULT1_N.packageId,
          emails: [TEST_USER_1.email, TEST_USER_2.email, TEST_USER_4.email],
          roleIds: ['admin'],
        })
        await tdm.addMembersToPackage({
          packageId: PKG_P_UAC_G_MULT2_N.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['admin', 'editor'],
        })
        await tdm.addMembersToPackage({
          packageId: PKG_P_UAC_G_MULT3_N.packageId,
          emails: [TEST_USER_1.email, TEST_USER_2.email],
          roleIds: ['admin'],
        })
        await tdm.addMembersToPackage({
          packageId: PKG_P_UAC_G_TOKENS_N.packageId,
          emails: [TEST_USER_1.email, TEST_USER_2.email, TEST_USER_3.email, TEST_USER_4.email],
          roleIds: ['admin'],
        })
      })
    })

    test('Test Versions creation', async ({ apihubTDM: tdm }) => {
      await test.step('Publish Versions', async () => {
        const versions = [
          V_P_PKG_GLOBAL_SEARCH_N,
          V_P_DSH_RELEASE_N,
          V_P_DSH_DRAFT_N,
          V_P_DSH_REPUBLISH_N,
          V_P_PKG_EDITING_FOR_NEW_REVISION_N,
          V_P_PKG_EDITING_FOR_NEW_VERSION_N,
          V_P_PKG_SET_N,
          V_P_PKG_SET_FOR_DEF_RELEASE_N,
          V_P_PKG_SET_FOR_SET_RELEASE_N,
          V_P_PKG_SET_FOR_UPDATE_N,
          V_P_PKG_SET_FOR_DELETE_N,
          V_P_DSH_CRUD_RELEASE_N,
          V_DSH_DMGR_N,
          V_DSH_DMGR_PROP_N,
          V_PKG_PMGR_N,
          V_PKG_PMGR_PROP_N,
          V_PKG_PMGR_DOWNLOAD_PUBLISH_N,
          V_PKG_PPGR_EDIT_N,
          V_P_PKG_REV_PREV_N,
          V_P_PKG_REV_1_N,
          V_P_DSH_REV_PREV_N,
          V_P_DSH_REV_1_N,
          V_P_PKG_COPYING_RELEASE_N,
          V_P_DSH_COPYING_RELEASE_N,
        ]
        for (const version of versions) {
          await tdm.publishVersion(version)
        }
      })
    })

    test('Set Default Release Version for package', async ({ apihubTDM: tdm }) => {
      await tdm.updatePackage({
        packageId: PK_SETTINGS_2.packageId,
        name: PK_SETTINGS_2.name,
        defaultReleaseVersion: V_P_PKG_SET_FOR_DEF_RELEASE_N.version,
      })
    })

    test('Create operation groups', async ({ apihubTDM: tdm }) => {
      const operationGroups = [
        OGR_DMGR_ADD_TO_EMPTY_N,
        OGR_DMGR_CHANGE_NAME_N,
        OGR_DMGR_CHANGE_DESCRIPTION_N,
        OGR_DMGR_CHANGE_OPERATIONS_N,
        OGR_DMGR_DELETE_N,
        OGR_DMGR_PROP_DELETED_N,
        OGR_DMGR_PROP_REST_N,
        OGR_DMGR_PROP_GQL_N,
        OGR_PMGR_ADD_TO_EMPTY_N,
        OGR_PMGR_CHANGE_NAME_N,
        OGR_PMGR_CHANGE_DESCRIPTION_N,
        OGR_PMGR_CHANGE_OPERATIONS_N,
        OGR_PMGR_DELETE_N,
        OGR_PMGR_PROP_DELETED_N,
        OGR_PMGR_PROP_REST_N,
        OGR_PMGR_PROP_GQL_N,
        OGR_PMGR_DOWNLOAD_PUBLISH_N,
      ]
      for (const operationGroup of operationGroups) {
        await tdm.createOperationGroup(operationGroup)
      }
    })

    test('Update operation groups', async ({ apihubTDM: tdm }) => {
      const operationGroups = [
        OGR_PPGR_EDITING_N,
      ]
      for (const operationGroup of operationGroups) {
        await tdm.updateOperationGroup(operationGroup)
      }
    })

    test('Delete operation groups', async ({ apihubTDM: tdm }) => {
      await tdm.deleteOperationGroup(OGR_DMGR_PROP_DELETED_N)
      await tdm.deleteOperationGroup(OGR_PMGR_PROP_DELETED_N)
    })
  })

  test.describe('UAC', async () => {

    test.describe('Editor', async () => {

      test('Create Groups', async ({ apihubTDM: tdm }) => {
        const groups = [
          GRP_P_EDITOR_ROOT_N,
          GRP_P_EDITOR_N,
        ]
        for (const group of groups) {
          await tdm.createPackage(group)
        }
      })

      test('Create Packages', async ({ apihubTDM: tdm }) => {
        const packages = [
          PKG_P_EDITOR_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackage(pkg)
        }
      })

      test('Create Dashboards', async ({ apihubTDM: tdm }) => {
        const dashboards = [
          DSH_P_EDITOR_N,
        ]
        for (const dashboard of dashboards) {
          await tdm.createPackage(dashboard)
        }
      })

      test('Create API Keys', async ({ apihubTDM: tdm }) => {
        const packages = [
          GRP_P_EDITOR_N,
          PKG_P_EDITOR_N,
          DSH_P_EDITOR_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackageApiKeys({
            packageId: pkg.packageId,
            apiKeys: pkg.apiKeys!,
          })
        }
      })

      test('Add members to packages ', async ({ apihubTDM: tdm }) => {
        await tdm.addMembersToPackage({
          packageId: GRP_P_EDITOR_N.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['editor'],
        })
        await tdm.addMembersToPackage({
          packageId: PKG_P_EDITOR_N.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['editor'],
        })
        await tdm.addMembersToPackage({
          packageId: DSH_P_EDITOR_N.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['editor'],
        })
      })

      test('Publish Versions', async ({ apihubTDM: tdm }) => {
        const versions = [
          V_P_PKG_UAC_EDITOR_BASE_N,
          V_P_PKG_UAC_EDITOR_CHANGED_N,
          V_P_PKG_UAC_EDITOR_EDITING_RELEASE_N,
          V_P_PKG_UAC_EDITOR_EDITING_DRAFT_N,
          V_P_PKG_UAC_EDITOR_EDITING_ARCHIVED_N,
          V_P_PKG_UAC_EDITOR_DELETING_N,
          V_P_DSH_UAC_EDITOR_BASE_N,
          V_P_DSH_UAC_EDITOR_CHANGED_N,
          V_P_DSH_UAC_EDITOR_EDITING_RELEASE_N,
          V_P_DSH_UAC_EDITOR_EDITING_DRAFT_N,
          V_P_DSH_UAC_EDITOR_EDITING_ARCHIVED_N,
          V_P_DSH_UAC_EDITOR_DELETING_N,
        ]
        for (const version of versions) {
          await tdm.publishVersion(version)
        }
      })

      test('Create operation groups', async ({ apihubTDM: tdm }) => {
        const operationGroups = [
          ORG_PKG_UAC_EDITOR_REST_DOWNLOADING_N,
          ORG_PKG_UAC_EDITOR_REST_EDITING_PARAMS_N,
          ORG_PKG_UAC_EDITOR_REST_CHANGING_OPERATIONS_N,
          ORG_PKG_UAC_EDITOR_REST_DELETING_N,
          OGR_DSH_UAC_EDITOR_REST_DOWNLOADING_N,
          ORG_DSH_UAC_EDITOR_REST_EDITING_PARAMS_N,
          ORG_DSH_UAC_EDITOR_REST_CHANGING_OPERATIONS_N,
          ORG_DSH_UAC_EDITOR_REST_DELETING_N,
        ]
        for (const operationGroup of operationGroups) {
          await tdm.createOperationGroup(operationGroup)
        }
      })
    })

    test.describe('Owner', async () => {

      test('Create Groups', async ({ apihubTDM: tdm }) => {
        const groups = [
          GRP_P_OWNER_ROOT_N,
          GRP_P_OWNER_N,
          GRP_P_OWNER_CRUD_N,
          GRP_P_OWNER_EDITING_N,
          GRP_P_OWNER_DELETING_N,
        ]
        for (const group of groups) {
          await tdm.createPackage(group)
        }
      })

      test('Create Packages', async ({ apihubTDM: tdm }) => {
        const packages = [
          PKG_P_OWNER_N,
          PKG_P_OWNER_EDITING_N,
          PKG_P_OWNER_DELETING_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackage(pkg)
        }
      })

      test('Create Dashboards', async ({ apihubTDM: tdm }) => {
        const dashboards = [
          DSH_P_OWNER_N,
          DSH_P_OWNER_EDITING_N,
          DSH_P_OWNER_DELETING_N,
        ]
        for (const dashboard of dashboards) {
          await tdm.createPackage(dashboard)
        }
      })

      test('Create API Keys', async ({ apihubTDM: tdm }) => {
        const packages = [
          GRP_P_OWNER_N,
          PKG_P_OWNER_N,
          DSH_P_OWNER_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackageApiKeys({
            packageId: pkg.packageId,
            apiKeys: pkg.apiKeys!,
          })
        }
      })

      test('Add members to packages ', async ({ apihubTDM: tdm }) => {
        const packages = [
          GRP_P_OWNER_N,
          GRP_P_OWNER_CRUD_N,
          GRP_P_OWNER_EDITING_N,
          GRP_P_OWNER_DELETING_N,
          PKG_P_OWNER_N,
          PKG_P_OWNER_EDITING_N,
          PKG_P_OWNER_DELETING_N,
          DSH_P_OWNER_N,
          DSH_P_OWNER_EDITING_N,
          DSH_P_OWNER_DELETING_N,
        ]
        for (const pkg of packages) {
          await tdm.addMembersToPackage({
            packageId: pkg.packageId,
            emails: [TEST_USER_1.email],
            roleIds: ['owner'],
          })
        }
      })

      test('Publish Versions', async ({ apihubTDM: tdm }) => {
        const versions = [
          V_P_PKG_UAC_OWNER_BASE_N,
          V_P_PKG_UAC_OWNER_CHANGED_N,
          V_P_PKG_UAC_OWNER_EDITING_RELEASE_N,
          V_P_PKG_UAC_OWNER_EDITING_DRAFT_N,
          V_P_PKG_UAC_OWNER_EDITING_ARCHIVED_N,
          V_P_PKG_UAC_OWNER_DELETING_N,
          V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N,
          V_P_DSH_UAC_OWNER_BASE_N,
          V_P_DSH_UAC_OWNER_CHANGED_N,
          V_P_DSH_UAC_OWNER_EDITING_RELEASE_N,
          V_P_DSH_UAC_OWNER_EDITING_DRAFT_N,
          V_P_DSH_UAC_OWNER_EDITING_ARCHIVED_N,
          V_P_DSH_UAC_OWNER_DELETING_N,
          V_P_DSH_UAC_OWNER_EDIT_DSH_DEF_RELEASE_N,
        ]
        for (const version of versions) {
          await tdm.publishVersion(version)
        }
      })

      test('Create operation groups', async ({ apihubTDM: tdm }) => {
        const operationGroups = [
          ORG_PKG_UAC_OWNER_REST_DOWNLOADING_N,
          ORG_PKG_UAC_OWNER_REST_EDITING_PARAMS_N,
          ORG_PKG_UAC_OWNER_REST_CHANGING_OPERATIONS_N,
          ORG_PKG_UAC_OWNER_REST_DELETING_N,
          OGR_DSH_UAC_OWNER_REST_DOWNLOADING_N,
          ORG_DSH_UAC_OWNER_REST_EDITING_PARAMS_N,
          ORG_DSH_UAC_OWNER_REST_CHANGING_OPERATIONS_N,
          ORG_DSH_UAC_OWNER_REST_DELETING_N,
        ]
        for (const operationGroup of operationGroups) {
          await tdm.createOperationGroup(operationGroup)
        }
      })
    })

    test.describe('Admin', async () => {

      test('Create Groups', async ({ apihubTDM: tdm }) => {
        const groups = [
          GRP_P_ADMIN_ROOT_N,
          GRP_P_ADMIN_N,
          GRP_P_ADMIN_CRUD_N,
          GRP_P_ADMIN_EDITING_N,
          GRP_P_ADMIN_DELETING_N,
        ]
        for (const group of groups) {
          await tdm.createPackage(group)
        }
      })

      test('Create Packages', async ({ apihubTDM: tdm }) => {
        const packages = [
          PKG_P_ADMIN_N,
          PKG_P_ADMIN_EDITING_N,
          PKG_P_ADMIN_DELETING_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackage(pkg)
        }
      })

      test('Create Dashboards', async ({ apihubTDM: tdm }) => {
        const dashboards = [
          DSH_P_ADMIN_N,
          DSH_P_ADMIN_EDITING_N,
          DSH_P_ADMIN_DELETING_N,
        ]
        for (const dashboard of dashboards) {
          await tdm.createPackage(dashboard)
        }
      })

      test('Create API Keys', async ({ apihubTDM: tdm }) => {
        const packages = [
          GRP_P_ADMIN_N,
          GRP_P_ADMIN_EDITING_N,
          PKG_P_ADMIN_N,
          PKG_P_ADMIN_EDITING_N,
          DSH_P_ADMIN_N,
          DSH_P_ADMIN_EDITING_N,
        ]
        for (const pkg of packages) {
          await tdm.createPackageApiKeys({
            packageId: pkg.packageId,
            apiKeys: pkg.apiKeys!,
          })
        }
      })

      test('Add members to packages ', async ({ apihubTDM: tdm }) => {
        const packages1 = [
          GRP_P_ADMIN_N,
          GRP_P_ADMIN_CRUD_N,
          GRP_P_ADMIN_DELETING_N,
          PKG_P_ADMIN_N,
          PKG_P_ADMIN_DELETING_N,
          DSH_P_ADMIN_N,
          DSH_P_ADMIN_DELETING_N,
        ]
        for (const pkg of packages1) {
          await tdm.addMembersToPackage({
            packageId: pkg.packageId,
            emails: [TEST_USER_1.email],
            roleIds: ['admin'],
          })
        }
        await tdm.addMembersToPackage({
          packageId: GRP_P_ADMIN_EDITING_N.packageId,
          emails: [TEST_USER_1.email],
          roleIds: ['admin'],
        })
        const packages2 = [
          GRP_P_ADMIN_EDITING_N,
          PKG_P_ADMIN_EDITING_N,
          DSH_P_ADMIN_EDITING_N,
        ]
        for (const pkg of packages2) {
          await tdm.addMembersToPackage({
            packageId: pkg.packageId,
            emails: [TEST_USER_1.email, TEST_USER_2.email, TEST_USER_3.email],
            roleIds: ['admin'],
          })
        }
      })

      test('Publish Versions', async ({ apihubTDM: tdm }) => {
        const versions = [
          V_P_PKG_UAC_ADMIN_BASE_N,
          V_P_PKG_UAC_ADMIN_CHANGED_N,
          V_P_PKG_UAC_ADMIN_EDITING_RELEASE_N,
          V_P_PKG_UAC_ADMIN_EDITING_DRAFT_N,
          V_P_PKG_UAC_ADMIN_EDITING_ARCHIVED_N,
          V_P_PKG_UAC_ADMIN_DELETING_N,
          V_P_PKG_UAC_ADMIN_EDIT_PKG_DEF_RELEASE_N,
          V_P_DSH_UAC_ADMIN_BASE_N,
          V_P_DSH_UAC_ADMIN_CHANGED_N,
          V_P_DSH_UAC_ADMIN_EDITING_RELEASE_N,
          V_P_DSH_UAC_ADMIN_EDITING_DRAFT_N,
          V_P_DSH_UAC_ADMIN_EDITING_ARCHIVED_N,
          V_P_DSH_UAC_ADMIN_DELETING_N,
          V_P_DSH_UAC_ADMIN_EDIT_DSH_DEF_RELEASE_N,
        ]
        for (const version of versions) {
          await tdm.publishVersion(version)
        }
      })

      test('Create operation groups', async ({ apihubTDM: tdm }) => {
        const operationGroups = [
          ORG_PKG_UAC_ADMIN_REST_DOWNLOADING_N,
          ORG_PKG_UAC_ADMIN_REST_EDITING_PARAMS_N,
          ORG_PKG_UAC_ADMIN_REST_CHANGING_OPERATIONS_N,
          ORG_PKG_UAC_ADMIN_REST_DELETING_N,
          OGR_DSH_UAC_ADMIN_REST_DOWNLOADING_N,
          ORG_DSH_UAC_ADMIN_REST_EDITING_PARAMS_N,
          ORG_DSH_UAC_ADMIN_REST_CHANGING_OPERATIONS_N,
          ORG_DSH_UAC_ADMIN_REST_DELETING_N,
        ]
        for (const operationGroup of operationGroups) {
          await tdm.createOperationGroup(operationGroup)
        }
      })
    })
  })
})
