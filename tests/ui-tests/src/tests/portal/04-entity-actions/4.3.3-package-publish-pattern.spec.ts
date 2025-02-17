import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { PortalPage } from '@portal/pages/PortalPage'
import {
  FILE_P_PETSTORE30,
  PK_PUB_IMM_1,
  PK_PUB_IMM_2,
  PK_PUB_IMM_3,
  RELEASE_PATTERN_MSG,
  RV_PATTERN_DEF,
  RV_PATTERN_NEW,
} from '@test-data/portal'
import { PUBLISH_TIMEOUT, TICKET_BASE_URL } from '@test-setup'
import { SETTINGS_TAB_GENERAL } from '@portal/entities'

test.describe('4.3.3 Package publishing via Portal (Negative)', () => {

  test('[P-PVC-2-N] Set Release version pattern',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8922` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { generalTab } = versionPage.packageSettingsPage

      await portalPage.gotoPackage(PK_PUB_IMM_3, SETTINGS_TAB_GENERAL)

      await test.step('"1234" pattern', async () => {
        await generalTab.editBtn.click()
        await generalTab.patternTxtFld.fill('1234')
        await generalTab.saveBtn.click()

        await expect(generalTab.pattern).toHaveText('1234')
      })

      await test.step('"Regular Expression" pattern', async () => {
        await generalTab.editBtn.click()
        await generalTab.patternTxtFld.fill(RV_PATTERN_DEF)
        await generalTab.saveBtn.click()

        await expect(generalTab.pattern).toHaveText(RV_PATTERN_DEF)
      })

      await test.step('Empty pattern', async () => {
        await generalTab.editBtn.click()
        await generalTab.patternTxtFld.clear()
        await generalTab.saveBtn.click()

        await expect(generalTab.pattern).toHaveText('—')
      })
    })

  test('[P-PVC-3] Publish draft version that does not match the new pattern and the global pattern',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8923` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await portalPage.gotoVersionEditing({
        pkg: PK_PUB_IMM_2,
        version: '@',
      })
      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30)

      await test.step('Publish version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: 'publish-draft', status: 'draft' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.versionSlt).toHaveText('publish-draft')
      })
    })

  test('[P-PVC-4.1-N] Publish release version that does not match the new pattern and the global pattern',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8924` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await portalPage.gotoVersionEditing({
        pkg: PK_PUB_IMM_2,
        version: '@',
      })
      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30)

      await test.step('Publish version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: 'publish-release', status: 'release' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.errorMsg).toHaveText(`${RELEASE_PATTERN_MSG} ${RV_PATTERN_NEW}`)
      })
    })

  test('[P-PVC-4.2-N] Publish release version that does not match the new pattern and matches the global pattern',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8924` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await portalPage.gotoVersionEditing({
        pkg: PK_PUB_IMM_2,
        version: '@',
      })
      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30)

      await test.step('Publish version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: '2000.1', status: 'release' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.errorMsg).toHaveText(`${RELEASE_PATTERN_MSG} ${RV_PATTERN_NEW}`)
      })
    })

  test('[P-PVC-4.3] Publish release version that matches the new pattern',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8924` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await portalPage.gotoVersionEditing({
        pkg: PK_PUB_IMM_2,
        version: '@',
      })
      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30)

      await test.step('Publish version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: '12.Abcd', status: 'release' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.publishBtn).toBeHidden({ timeout: PUBLISH_TIMEOUT })
        await expect(versionPage.toolbar.versionSlt).toHaveText('12.Abcd')
      })
    })

  test('[P-PVC-4.4-N] Publish release version that does not match the global pattern',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-8924` },
    },
    async ({ sysadminPage: page }) => {

      const portalPage = new PortalPage(page)
      const { versionPackagePage: versionPage } = portalPage
      const { configureVersionTab } = versionPage

      await portalPage.gotoVersionEditing({
        pkg: PK_PUB_IMM_1,
        version: '@',
      })
      await configureVersionTab.filesUploader.setInputFiles(FILE_P_PETSTORE30)

      await test.step('Publish version', async () => {
        await configureVersionTab.publishBtn.click()
        await configureVersionTab.publishVersionDialog.fillForm({ version: 'publish-release', status: 'release' })
        await configureVersionTab.publishVersionDialog.publishBtn.click()

        await expect(configureVersionTab.publishVersionDialog.errorMsg).toHaveText(`${RELEASE_PATTERN_MSG} ${RV_PATTERN_DEF}`)
      })
    })
})
