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
  const ISSUE_ANNOTATION = { type: 'URL', description: 'https://github.com/Netcracker/qubership-apihub/issues/837' }

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

  // V_PERCENT_N has a literal '%', as agent snapshot names do; V_SNAPSHOT_N has no '%' and is used for the
  // comparison. The names differ in more than '%', so a key decoded once too often cannot open the other version.
  const V_PERCENT_N: Version = {
    pkg: PKG_RESERVED_CHARS_N,
    version: 'ATUI percent%20?#837',
    status: 'draft',
    files: [{ file: FILE_P_PETSTORE30_CHANGELOG_BASE }],
  }
  const V_SNAPSHOT_N: Version = { ...V_PERCENT_N, version: 'ATUI snapshot ?#837' }

  // Helper functions - Data
  // Each test publishes its own version with two revisions. The retry index is unique for each attempt of a test,
  // so a retry does not add revisions to the version of an earlier attempt.
  const makeRevisions = (version: Version): [Version, Version] => {
    const rev1: Version = { ...version, version: `${version.version}-${test.info().retry}` }
    const rev2: Version = {
      ...rev1,
      files: [{ file: FILE_P_PETSTORE30_CHANGELOG_CHANGED, fileId: FILE_P_PETSTORE30_CHANGELOG_BASE.name }],
    }
    return [rev1, rev2]
  }

  // Helper functions - Actions
  // gotoVersion puts the version into the path as it is, so the reserved characters are encoded here.
  const gotoEncodedVersion = async (portalPage: PortalPage, version: Version): Promise<void> => {
    await portalPage.gotoVersion({ ...version, version: encodeURIComponent(version.version) })
  }

  test.beforeAll(async ({ apihubTDM }) => {
    await apihubTDM.createPackage([G_RESERVED_CHARS_N, PKG_RESERVED_CHARS_N])
  })

  test('P-BUG-837.1 Open the version and its revision history', { annotation: ISSUE_ANNOTATION },
    async ({ sysadminPage: page, apihubTDM, usedResources }) => {
      test.setTimeout(HOOK_PUBLISH_TIMEOUT)
      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { overviewTab } = versionPage
      const { summary } = overviewTab.summaryTab.body
      const [rev1, rev2] = makeRevisions(V_PERCENT_N)
      registerVersionFiles(usedResources, [rev1, rev2])

      await test.step('Publish two revisions of the version', async () => {
        await apihubTDM.publishVersion(rev1)
        await apihubTDM.publishVersion(rev2)
      })

      await gotoEncodedVersion(portalPage, rev2)

      await test.step('Verify the overview of the version is open', async () => {
        await expect(summary.currentVersion).toHaveText(rev2.version)
        await expect.soft(versionPage.toolbar.versionSlt).toHaveText(rev2.version)
        await expect.soft(summary.revision).toHaveText('2')
      })

      await summary.revisionLink.click()

      await test.step('Verify the revision history of the version is open', async () => {
        await expect(overviewTab.revisionsTab.getRevisionRow('@2').revisionCell).toContainText('(latest)')
        await expect.soft(overviewTab.revisionsTab.getRevisionRow()).toHaveCount(2)
      })
    })

  test('P-BUG-837.2 Compare revisions of the version and open a changed operation', { annotation: ISSUE_ANNOTATION },
    async ({ sysadminPage: page, apihubTDM, usedResources }) => {
      test.setTimeout(HOOK_PUBLISH_TIMEOUT)
      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { compareSelectDialog, comparePackagesPage, compareOperationsPage } = versionPage
      const [rev1, rev2] = makeRevisions(V_SNAPSHOT_N)
      registerVersionFiles(usedResources, [rev1, rev2])

      await test.step('Publish the base and the changed revision', async () => {
        await apihubTDM.publishVersion(rev1)
        await apihubTDM.publishVersion(rev2)
      })

      await gotoEncodedVersion(portalPage, rev2)

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
