import { AgentPage } from '@agent/pages'
import { test } from '@fixtures'
import { PortalPage } from '@portal/pages/PortalPage'
import { expect } from '@services/expect-decorator'
import { PK_A_UPLOAD_R, SEARCH_NAMESPACE, TEST_CLOUD } from '@test-data/agent'
import { MIDDLE_EXPECT, TICKET_BASE_URL } from '@test-setup'
import { isDevProxyMode, isLocalHost } from '@services/utils'

test.describe('01. General', () => {

  test('[A-GEN-1] Opening Agent page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6374` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)

      await agentPage.goto()

      await expect(agentPage.header.userMenu).toBeVisible()
      await expect.soft(agentPage.header.portalBtn).toBeVisible()
      await expect.soft(agentPage.header.agentBtn).toBeVisible()
      await expect.soft(agentPage.header.vsCodeExtensionBtn).toBeVisible()
      await expect.soft(agentPage.header.appHeaderDivider).toBeVisible()
      await expect.soft(agentPage.header.sysInfoBtn).toBeVisible()
      await expect.soft(agentPage.header.userAvatar).toBeVisible()
      await expect.soft(agentPage.cloudAc).toBeEnabled()
      await expect.soft(agentPage.namespaceAc).toBeDisabled()
    })

  test('[A-GEN-2] Navigation to the Portal page',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6375` },
    },
    async ({ sysadminPage: page }) => {
      test.skip(isLocalHost(), 'Does not support localhost execution')

      const agentPage = new AgentPage(page)
      const portalPage = new PortalPage(page)

      await agentPage.goto()
      await agentPage.header.portalBtn.click()

      await expect(portalPage.header.userMenu).toBeVisible({ timeout: MIDDLE_EXPECT })
      await expect.soft(portalPage.sidebar.workspacesBtn).toBeVisible()
    })

  test('[A-GEN-3] Navigation from the Portal page',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4279` },
    },
    async ({ sysadminPage: page }) => {
      test.skip(isDevProxyMode(), 'Does not support dev proxy mode')

      const portalPage = new PortalPage(page)
      const agentPage = new AgentPage(page)

      await portalPage.goto()
      await portalPage.header.agentBtn.click()

      await expect(agentPage.header.userMenu).toBeVisible({ timeout: MIDDLE_EXPECT })
      await expect.soft(agentPage.cloudAc).toBeVisible()
    })

    test('[A-GEN-5] Navigation from the Upload options',
      {
        tag: '@smoke',
      },
      async ({ sysadminPage: page }) => {
        test.skip(isDevProxyMode(), 'Does not support dev proxy mode')

        const portalPage = new PortalPage(page)
        const agentPage = new AgentPage(page)
        const { versionPackagePage: versionPage } = portalPage
        const { methodsForUploadDialog } = versionPage

        await portalPage.gotoPackage(PK_A_UPLOAD_R)
        await versionPage.howToUploadBtn.click()
        await methodsForUploadDialog.toAgentBtn.click()

        await expect(agentPage.cloudAc).toBeVisible()
      })

  test('[A-GEN-4] Namespace search',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-6377` },
    },
    async ({ sysadminPage: page }) => {

      const agentPage = new AgentPage(page)
      const { namespaceAc } = agentPage
      const { targetNamespace, hiddenNamespace, queryPart1, queryPart2, queryPart3 } = SEARCH_NAMESPACE

      await agentPage.goto()
      await agentPage.selectCloud(TEST_CLOUD)

      await test.step('Open Namespace select', async () => {
        await namespaceAc.click()

        await expect.soft(namespaceAc.getListItem(targetNamespace)).toBeVisible()
        await expect.soft(namespaceAc.getListItem(hiddenNamespace)).toBeVisible()
      })

      await test.step('Enter the first part of the search query', async () => {
        await namespaceAc.type(queryPart1)

        await expect.soft(namespaceAc.getListItem(hiddenNamespace)).toBeHidden()
        await expect.soft(namespaceAc.getListItem(targetNamespace)).toBeVisible()
      })

      await test.step('Enter the second part of the search query', async () => {
        await namespaceAc.type(queryPart2)

        await expect.soft(namespaceAc.getListItem()).toHaveCount(1)
        await expect.soft(namespaceAc.getListItem(targetNamespace)).toBeVisible()
      })

      await test.step('Clear search query', async () => {
        await namespaceAc.clear()

        await expect(namespaceAc).toBeEmpty()
      })

      await test.step('Enter the third part of the search query', async () => {
        await namespaceAc.type(queryPart3)

        await expect.soft(namespaceAc.getListItem(hiddenNamespace)).toBeHidden()
        await expect.soft(namespaceAc.getListItem(targetNamespace)).toBeVisible()
      })
    })
})
