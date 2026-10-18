import { test } from '@fixtures'
import type { ApihubTestDataManager } from '@services/test-data-manager'
import {
  CREATE_LIST_OF_USERS_V1_UPDATED,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  FILE_P_PETSTORE30_CHANGELOG_CHANGED,
  IMM_GR,
} from '@test-data/portal'
import { Dashboard, Group, Package, type Version } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'

/**
 * Group under Reusable (IMM_GR) for bug-regression packages/dashboards.
 */
export const G_BUGS_IMM = new Group({
  name: 'Bugs',
  alias: 'GBUGSIMM',
  parent: IMM_GR,
  description: 'Reusable group for bug-regression test data',
})

/**
 * Suite subgroup.
 */
export const G_CHANGES_DESC_R = new Group({
  name: '706-Dsh-Changes-Description',
  alias: 'GCHDESC',
  parent: G_BUGS_IMM,
})

/**
 * Package with a three-version release chain.
 *
 * v1 (base) -> v2 (changed) -> v3 (same as v2, no delta).
 */
export const PKG_CHANGES_DESC_R = new Package({
  name: 'Package',
  alias: 'PKCHDESC',
  parent: G_CHANGES_DESC_R,
}, { kindPrefix: true })

/**
 * Dashboard that compares package v1 vs v3 via two release versions.
 */
export const DSH_CHANGES_DESC_R = new Dashboard({
  name: 'Dashboard',
  alias: 'DSHCHDESC',
  parent: G_CHANGES_DESC_R,
}, { kindPrefix: true })

export const FILE_CHANGES_DESC_BASE = FILE_P_PETSTORE30_CHANGELOG_BASE
export const FILE_CHANGES_DESC_CHANGED = FILE_P_PETSTORE30_CHANGELOG_CHANGED

/** Operation whose change details must be expandable on the dashboard API Changes tab. */
export const OP_CHANGES_DESC = CREATE_LIST_OF_USERS_V1_UPDATED

/** Exact human-readable change description asserted in the UI. */
export const MSG_CHANGES_DESC = OP_CHANGES_DESC.changes!.breaking!.description

export const V_CHANGES_DESC_PKG_1_R: Version = {
  pkg: PKG_CHANGES_DESC_R,
  version: '2000.1',
  status: 'release',
  files: [{ file: FILE_CHANGES_DESC_BASE }],
}

export const V_CHANGES_DESC_PKG_2_R: Version = {
  pkg: PKG_CHANGES_DESC_R,
  version: '2000.2',
  status: 'release',
  previousVersion: V_CHANGES_DESC_PKG_1_R.version,
  files: [{ file: FILE_CHANGES_DESC_CHANGED, fileId: FILE_CHANGES_DESC_BASE.name }],
}

export const V_CHANGES_DESC_PKG_3_R: Version = {
  pkg: PKG_CHANGES_DESC_R,
  version: '2000.3',
  status: 'release',
  previousVersion: V_CHANGES_DESC_PKG_2_R.version,
  files: [{ file: FILE_CHANGES_DESC_CHANGED, fileId: FILE_CHANGES_DESC_BASE.name }],
}

export const V_CHANGES_DESC_DSH_1_R: Version = {
  pkg: DSH_CHANGES_DESC_R,
  version: '2000.1',
  status: 'release',
  refs: [
    { refId: PKG_CHANGES_DESC_R.packageId, version: V_CHANGES_DESC_PKG_1_R.version },
  ],
}

export const V_CHANGES_DESC_DSH_2_R: Version = {
  pkg: DSH_CHANGES_DESC_R,
  version: '2000.2',
  status: 'release',
  previousVersion: V_CHANGES_DESC_DSH_1_R.version,
  refs: [
    { refId: PKG_CHANGES_DESC_R.packageId, version: V_CHANGES_DESC_PKG_3_R.version },
  ],
}

/**
 * Creates reusable entities when missing.
 * Idempotent via createPackage / publishVersionIfMissing.
 */
export const setupChangesDescTestData = async (apihubTDM: ApihubTestDataManager): Promise<void> => {
  test.setTimeout(HOOK_PUBLISH_TIMEOUT)

  await apihubTDM.createPackage([
    G_BUGS_IMM,
    G_CHANGES_DESC_R,
    PKG_CHANGES_DESC_R,
    DSH_CHANGES_DESC_R,
  ])

  await apihubTDM.publishVersionIfMissing(V_CHANGES_DESC_PKG_1_R)
  await apihubTDM.publishVersionIfMissing(V_CHANGES_DESC_PKG_2_R)
  await apihubTDM.publishVersionIfMissing(V_CHANGES_DESC_PKG_3_R)
  await apihubTDM.publishVersionIfMissing(V_CHANGES_DESC_DSH_1_R)
  await apihubTDM.publishVersionIfMissing(V_CHANGES_DESC_DSH_2_R)
}
