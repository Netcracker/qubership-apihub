import { test } from '@fixtures'
import { expect, expectText } from '@services/expect-decorator'
import type { VersionedExtensionName } from '@test-data/props'
import { getExtensionVersions, getPortalVersionInfo, getSysInfo } from '@test-data/props'
import { PortalPage } from '@portal/pages'
import { TICKET_BASE_URL } from '@test-setup'
import { VS_CODE_EXTENSION_TOOLTIP } from '@test-data/portal'
import { SYSADMIN } from '@test-data'

// The titles that System Information gives the extensions that report a version.
const EXTENSION_TITLES: Record<VersionedExtensionName, string> = {
  'api-linter': 'API Linter',
  'agents-backend': 'Agents Backend',
}

test.describe('General', () => {

  test('[P-GEN-1.1] Opening Portal page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4277` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto()

      await expect(portalPage.header.userMenu).toBeVisible()
      await expect.soft(portalPage.header.portalBtn).toBeVisible()
      await expect.soft(portalPage.header.vsCodeExtensionBtn).toBeVisible()
      await expect.soft(portalPage.header.appHeaderDivider).toBeVisible()
      await expect.soft(portalPage.header.globalSearchBtn).toBeVisible()
      await expect.soft(portalPage.header.sysInfoBtn).toBeVisible()
      await expect.soft(portalPage.header.userAvatar).toBeVisible()
      await expect.soft(portalPage.sidebar.favoritesBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.sharedBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.privateBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.workspacesBtn).toBeVisible()
    })

  test('[P-GEN-1.2] Check tooltips on the Portal page header',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4277` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)

      await portalPage.goto()
      await portalPage.header.vsCodeExtensionBtn.hover()

      await expect(portalPage.tooltip).toHaveCount(1)
      await expect(portalPage.tooltip).toHaveText(VS_CODE_EXTENSION_TOOLTIP)

      await portalPage.header.userAvatar.hover()

      await expect(portalPage.tooltip).toHaveCount(1)
      await expect(portalPage.tooltip).toHaveText(SYSADMIN.name)
    })

  test('[P-GEN-4] Check System Information about APIHUB',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-1838` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { sysInfoPopup } = portalPage.header
      const { build } = await getSysInfo()
      const extensionVersions = await getExtensionVersions()
      const { frontendVersion, apiProcessorVersion, buildInfo } = await getPortalVersionInfo()

      await portalPage.goto()
      await portalPage.header.sysInfoBtn.click()

      await expect.soft(sysInfoPopup.content).toBeVisible()
      await expect.soft(sysInfoPopup.closeBtn).toBeVisible()
      await expect.soft(sysInfoPopup.backendVersion).toHaveText(`Backend v. ${build.backendVersion}`)

      // A registered extension has a row with its own answer; one that this stand does not register has no row.
      for (const [name, title] of Object.entries(EXTENSION_TITLES) as [VersionedExtensionName, string][]) {
        const version = extensionVersions[name]
        if (version) {
          await expect.soft(sysInfoPopup.extensionVersion(name)).toHaveText(`${title} v. ${version}`)
        } else {
          await expect.soft(sysInfoPopup.extensionVersion(name)).toBeHidden()
        }
      }

      // Both versions carry the build id: `<version>+<10 hex digits>`.
      await expectText.soft(frontendVersion).toMatch(/^\d+\.\d+\.\d+\+[0-9a-f]{10}$/)
      await expectText.soft(apiProcessorVersion).toMatch(/^\d+\.\d+\.\d+\+[0-9a-f]{10}$/)
      await expect.soft(sysInfoPopup.frontendVersion).toHaveText(`Frontend v. ${frontendVersion}`)
      await expect.soft(sysInfoPopup.apiProcessorVersion).toHaveText(`API Processor v. ${apiProcessorVersion}`)

      // `build-info.json` exists only in a branch-tagged image, and the entrypoint leaves the time empty when it has none.
      // A stack on a `src-<hash>` image or on a dev server has no image version under the app versions.
      if (buildInfo) {
        const { branch, commit, committedAt } = buildInfo
        const imageVersion = committedAt ? `${branch}.${commit}.${committedAt}` : `${branch}.${commit}`
        await expect.soft(sysInfoPopup.frontendImageVersion).toHaveText(imageVersion)
        await expect.soft(sysInfoPopup.apiProcessorImageVersion).toHaveText(imageVersion)
      } else {
        await expect.soft(sysInfoPopup.frontendImageVersion).toBeHidden()
        await expect.soft(sysInfoPopup.apiProcessorImageVersion).toBeHidden()
      }
      // TODO: Add checking api/v1/system/info "externalLinks": []
    })

  test('[P-GEN-5] Closing System Information popup',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4276` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { sysInfoPopup } = portalPage.header

      await portalPage.goto()
      await portalPage.header.sysInfoBtn.click()

      await expect(sysInfoPopup.content).toBeVisible()

      await sysInfoPopup.closeBtn.click()

      await expect.soft(sysInfoPopup.content).not.toBeVisible()

      await portalPage.header.sysInfoBtn.click()

      await expect(sysInfoPopup.content).toBeVisible()

      await portalPage.backdrop.click()

      await expect(sysInfoPopup.content).not.toBeVisible()
    })
})
