import { test } from '@fixtures'
import type { ApihubTestDataManager } from '@services/test-data-manager'
import { FILE_P_PETSTORE30 } from '@test-data/portal'
import { VAR_GR } from '@test-data/portal/groups'
import { Dashboard, Group, Package, type Version } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT } from '@test-setup'

/**
 * Suite group under Non-Reusable (VAR_GR); removed by the global teardown.
 */
export const G_PVP_VAR = new Group({
  name: 'Previous-Version-Package',
  alias: 'GPVP',
  parent: VAR_GR,
})

/**
 * Package and dashboard whose versions are published in the tests.
 * Names include TEST_ID_N so that the package search in the publish dialog finds exactly them.
 */
export const PKG_PVP_MAIN_N = new Package({
  name: 'PVP-Main',
  alias: 'PKPVPMAIN',
  parent: G_PVP_VAR,
}, { kindPrefix: true, testId: 'non-reusable' })

export const DSH_PVP_MAIN_N = new Dashboard({
  name: 'PVP-Main',
  alias: 'DSHPVPMAIN',
  parent: G_PVP_VAR,
}, { kindPrefix: true, testId: 'non-reusable' })

/**
 * Package and dashboard that provide previous versions from another package.
 */
export const PKG_PVP_OTHER_N = new Package({
  name: 'PVP-Other',
  alias: 'PKPVPOTHER',
  parent: G_PVP_VAR,
}, { kindPrefix: true, testId: 'non-reusable' })

export const DSH_PVP_OTHER_N = new Dashboard({
  name: 'PVP-Other',
  alias: 'DSHPVPOTHER',
  parent: G_PVP_VAR,
}, { kindPrefix: true, testId: 'non-reusable' })

export const V_PVP_OTHER_RELEASE_N: Version = {
  pkg: PKG_PVP_OTHER_N,
  version: '2000.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
}

/** Must be offered for a draft version and hidden for a release one. */
export const V_PVP_OTHER_DRAFT_N: Version = {
  pkg: PKG_PVP_OTHER_N,
  version: 'other-draft',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30 }],
}

/** Opened in editing mode to publish new versions of the main package. */
export const V_PVP_MAIN_BASE_N: Version = {
  pkg: PKG_PVP_MAIN_N,
  version: 'base',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30 }],
}

/** Already refers to the previous version of another package. */
export const V_PVP_MAIN_FOREIGN_PREV_N: Version = {
  pkg: PKG_PVP_MAIN_N,
  version: 'foreign-prev',
  status: 'draft',
  previousVersion: V_PVP_OTHER_RELEASE_N.version,
  previousVersionPackageId: PKG_PVP_OTHER_N.packageId,
  files: [{ file: FILE_P_PETSTORE30 }],
}

export const V_PVP_MAIN_PUBLISHED_N: Version = {
  pkg: PKG_PVP_MAIN_N,
  version: '2000.2',
  status: 'release',
}

export const V_PVP_DSH_OTHER_RELEASE_N: Version = {
  pkg: DSH_PVP_OTHER_N,
  version: '2000.1',
  status: 'release',
  refs: [{ refId: PKG_PVP_OTHER_N.packageId, version: V_PVP_OTHER_RELEASE_N.version }],
}

/** Opened in editing mode to publish new versions of the main dashboard. */
export const V_PVP_DSH_MAIN_BASE_N: Version = {
  pkg: DSH_PVP_MAIN_N,
  version: 'base',
  status: 'draft',
  refs: [{ refId: PKG_PVP_OTHER_N.packageId, version: V_PVP_OTHER_RELEASE_N.version }],
}

/** Published by the test through the publish dialog; see V_PVP_MAIN_PUBLISHED_N for the key. */
export const V_PVP_DSH_MAIN_PUBLISHED_N: Version = {
  pkg: DSH_PVP_MAIN_N,
  version: '2000.2',
  status: 'release',
}

/**
 * Creates the suite entities.
 * The versions are not changed by the tests, so they are reused on a retry instead of being republished.
 */
export const setupPreviousVersionPackageTestData = async (apihubTDM: ApihubTestDataManager): Promise<void> => {
  test.setTimeout(HOOK_PUBLISH_TIMEOUT)

  await apihubTDM.createPackage([
    G_PVP_VAR,
    PKG_PVP_MAIN_N,
    PKG_PVP_OTHER_N,
    DSH_PVP_MAIN_N,
    DSH_PVP_OTHER_N,
  ])

  await apihubTDM.publishVersionIfMissing(V_PVP_OTHER_RELEASE_N)
  await apihubTDM.publishVersionIfMissing(V_PVP_OTHER_DRAFT_N)
  await apihubTDM.publishVersionIfMissing(V_PVP_MAIN_BASE_N)
  await apihubTDM.publishVersionIfMissing(V_PVP_MAIN_FOREIGN_PREV_N)
  await apihubTDM.publishVersionIfMissing(V_PVP_DSH_OTHER_RELEASE_N)
  await apihubTDM.publishVersionIfMissing(V_PVP_DSH_MAIN_BASE_N)
}
