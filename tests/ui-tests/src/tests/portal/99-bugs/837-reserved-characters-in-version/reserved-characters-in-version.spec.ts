import { registerVersionFiles, test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import {
  CREATE_LIST_OF_USERS_V1_UPDATED,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  FILE_P_PETSTORE30_CHANGELOG_CHANGED,
  VAR_GR,
} from '@test-data/portal'
import { Group, Package, type Version } from '@test-data/props'
import { HOOK_PUBLISH_TIMEOUT, LONG_EXPECT } from '@test-setup'

/**
 * Portal navigation must keep a version name with characters reserved in URLs: a space, '?', '#', and '%'.
 * Agent snapshot versions are published as encodeURI(name), so they may contain '?', '#', and a literal '%'
 * (https://github.com/Netcracker/qubership-apihub/issues/837).
 *
 * The comparison test uses a version without a literal '%': the backend decodes the previousVersion query
 * parameter twice (ComparisonController), so the comparison of revisions of such a version never loads.
 */

test.describe('Version name with reserved URL characters', () => {
  const G_RESERVED_CHARS_N = new Group({
    name: '837-Reserved-Chars',
    alias: 'GRESCHARS',
    parent: VAR_GR,
  })

  const PKG_RESERVED_CHARS_N = new Package({
    name: 'Package',
    alias: 'PKRESCHARS',
    parent: G_RESERVED_CHARS_N,
  }, { kindPrefix: true })

  // Helper functions - Data
  const makeRevisions = (versionName: string): [Version, Version] => {
    const rev1: Version = {
      pkg: PKG_RESERVED_CHARS_N,
      version: versionName,
      status: 'draft',
      files: [{ file: FILE_P_PETSTORE30_CHANGELOG_BASE }],
    }
    const rev2: Version = {
      ...rev1,
      files: [{ file: FILE_P_PETSTORE30_CHANGELOG_CHANGED, fileId: FILE_P_PETSTORE30_CHANGELOG_BASE.name }],
    }
    return [rev1, rev2]
  }

  // vPercentRev* has a literal '%', as agent snapshot names do; vRev* has no '%' and is used for the comparison.
  // The names differ in more than '%', so a key decoded once too often cannot open the other version.
  const [vPercentRev1, vPercentRev2] = makeRevisions('ATUI percent%20?#837')
  const [vRev1, vRev2] = makeRevisions('ATUI snapshot ?#837')

  // Helper functions - Actions
  // gotoVersion puts the version into the path as it is, so the reserved characters are encoded here.
  const gotoEncodedVersion = async (portalPage: PortalPage, version: Version): Promise<void> => {
    await portalPage.gotoVersion({ ...version, version: encodeURIComponent(version.version) })
  }

  test.beforeAll(async ({ apihubTDM }) => {
    test.setTimeout(HOOK_PUBLISH_TIMEOUT)

    await apihubTDM.createPackage([G_RESERVED_CHARS_N, PKG_RESERVED_CHARS_N])
    // The package is new in each run (VAR_GR carries TEST_ID_N), but a retry runs this hook again in a new
    // worker, and a second publish of a version name adds revisions. So both revisions are published only
    // when the version is missing.
    for (const [rev1, rev2] of [[vPercentRev1, vPercentRev2], [vRev1, vRev2]]) {
      if (!(await apihubTDM.isVersionExist({ packageId: PKG_RESERVED_CHARS_N.packageId, version: rev1.version }))) {
        await apihubTDM.publishVersion(rev1)
        await apihubTDM.publishVersion(rev2)
      }
    }
  })

  test.beforeEach(async ({ usedResources }) => {
    registerVersionFiles(usedResources, [vPercentRev1, vPercentRev2, vRev1, vRev2])
  })

  test('P-BUG-837.1 Open the version and its revision history', async ({ sysadminPage: page }) => {
    const portalPage = new PortalPage(page)
    const { versionPackagePage: versionPage } = portalPage
    const { overviewTab } = versionPage
    const { summary } = overviewTab.summaryTab.body

    await gotoEncodedVersion(portalPage, vPercentRev2)

    await test.step('Verify the overview of the version is open', async () => {
      await expect(summary.currentVersion).toHaveText(vPercentRev2.version)
      await expect.soft(versionPage.toolbar.versionSlt).toHaveText(vPercentRev2.version)
      await expect.soft(summary.revision).toHaveText('2')
    })

    await summary.revisionLink.click()

    await test.step('Verify the revision history of the version is open', async () => {
      await expect(overviewTab.revisionsTab.getRevisionRow('@2').revisionCell).toContainText('(latest)')
      await expect.soft(overviewTab.revisionsTab.getRevisionRow()).toHaveCount(2)
    })
  })

  test('P-BUG-837.2 Compare revisions of the version and open a changed operation', async ({ sysadminPage: page }) => {
    const portalPage = new PortalPage(page)
    const { versionPackagePage: versionPage } = portalPage
    const { compareSelectDialog, comparePackagesPage, compareOperationsPage } = versionPage

    await gotoEncodedVersion(portalPage, vRev2)

    await test.step('Open the comparison of the previous and the latest revisions', async () => {
      await versionPage.toolbar.compareMenu.click()
      await versionPage.toolbar.compareMenu.revisionsItm.click()
      await compareSelectDialog.fillForm({ previousRevision: '@1' })
      await compareSelectDialog.compareBtn.click()
    })

    await test.step('Verify both revisions of the version are compared', async () => {
      await expect(comparePackagesPage.swapper.leftTitle).toHaveText('@1', { timeout: LONG_EXPECT })
      await expect(comparePackagesPage.swapper.rightTitle).toHaveText('@2(latest)')
    })

    await comparePackagesPage.compareContent.getOperationRow(CREATE_LIST_OF_USERS_V1_UPDATED).click()

    await test.step('Verify the operation is compared between both revisions', async () => {
      await expect(compareOperationsPage.swapper.leftTitle).toHaveText('@1', { timeout: LONG_EXPECT })
      await expect(compareOperationsPage.swapper.rightTitle).toHaveText('@2(latest)')
      await expect.soft(compareOperationsPage.docView).toBeVisible()
    })
  })
})
