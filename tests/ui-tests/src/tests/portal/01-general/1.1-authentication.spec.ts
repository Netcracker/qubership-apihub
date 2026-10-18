import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { LoginPage } from '@shared/pages'
import { PortalPage } from '@portal/pages'
import { TICKET_BASE_URL } from '@test-setup'
import { INVALID_LOGIN, INVALID_PASSWORD, TEST_SSO_USER, TEST_USER_AUTH } from '@test-data'
import { INVALID_CREDENTIALS_MSG } from '@shared/entities'
import { isLocalHost, newPage } from '@services/utils'
import { createUserStorageStateWithAuthCookieFromApi } from '@services/storage-state/save'

test.describe('Internal Authentication', () => {

  test('[P-LAU-1] Valid credentials',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4255` },
    },
    async ({ page }) => {

      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.signIn(TEST_USER_AUTH)

      await expect(portalPage.header.userMenu).toBeVisible()
      await expect.soft(portalPage.header.globalSearchBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.workspacesBtn).toBeVisible()

      await portalPage.close()
    })

  test('[P-LAU-2] Logout',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4256` },
    },
    async ({ browser }) => {

      const storageState = await createUserStorageStateWithAuthCookieFromApi(TEST_USER_AUTH)
      const context = await browser.newContext({ storageState: storageState })
      const page = await context.newPage()

      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await portalPage.goto()
      await portalPage.header.userMenu.click()
      await portalPage.header.userMenu.logoutItm.click()

      await expect(loginPage.loginFormTitle).toBeVisible()
      await expect.soft(loginPage.signInBtn).toBeVisible()

      await loginPage.reload()

      await expect(loginPage.loginFormTitle).toBeVisible()
      await expect.soft(loginPage.signInBtn).toBeVisible()

      await context.close()
    })

  test('[P-LAU-3-N] Empty fields',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4257` },
    },
    async ({ page }) => {

      const loginPage = new LoginPage(page)

      await loginPage.goto()
      await loginPage.signInBtn.click()

      await expect(loginPage.loginTxtFld).toBeEmpty()
      await expect.soft(loginPage.passwordTxtFld).toBeEmpty()

      await loginPage.close()
    })

  test('[P-LAU-4-N] Only Email',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4258` },
    },
    async ({ page }) => {

      const loginPage = new LoginPage(page)

      await loginPage.goto()
      await loginPage.signIn({ email: TEST_USER_AUTH.email, password: '' })

      await expect(loginPage.loginTxtFld).not.toBeEmpty()
      await expect.soft(loginPage.passwordTxtFld).toBeEmpty()

      await loginPage.close()
    })

  test('[P-LAU-5-N] Only Password',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4259` },
    },
    async ({ page }) => {

      const loginPage = new LoginPage(page)

      await loginPage.goto()
      await loginPage.signIn({ email: '', password: TEST_USER_AUTH.password })

      await expect.soft(loginPage.loginTxtFld).toBeEmpty()
      await expect.soft(loginPage.passwordTxtFld).not.toBeEmpty()

      await loginPage.close()
    })

  test('[P-LAU-6-N] Invalid Password',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4260` },
    },
    async ({ page }) => {

      const loginPage = new LoginPage(page)

      await loginPage.goto()
      await loginPage.signIn({ email: TEST_USER_AUTH.email, password: INVALID_PASSWORD })

      await expect(loginPage.errorAlert).toBeVisible()
      await expect.soft(loginPage.errorAlert).toHaveText(INVALID_CREDENTIALS_MSG)
      await expect.soft(loginPage.errorIcon).toBeVisible()
      await expect.soft(loginPage.loginTxtFld).not.toBeEmpty()
      await expect.soft(loginPage.passwordTxtFld).not.toBeEmpty()

      await loginPage.close()
    })

  test('[P-LAU-7-N] Invalid Email',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4261` },
    },
    async ({ page }) => {

      const loginPage = new LoginPage(page)

      await loginPage.goto()
      await loginPage.signIn({ email: INVALID_LOGIN, password: TEST_USER_AUTH.password })

      await expect(loginPage.errorAlert).toBeVisible()
      await expect.soft(loginPage.errorAlert).toHaveText(INVALID_CREDENTIALS_MSG)
      await expect.soft(loginPage.errorIcon).toBeVisible()
      await expect.soft(loginPage.loginTxtFld).not.toBeEmpty()
      await expect.soft(loginPage.passwordTxtFld).not.toBeEmpty()

      await loginPage.close()
    })
})

test.describe('SSO Authentication', { tag: '@specific' }, () => {
  test.skip(!process.env.TEST_SSO_USER_EMAIL, 'Test environment is not configured for SSO testing')

  const TIMEOUT = 5000

  test('[P-SSO-1] Valid credentials (Email)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4262` },
    },
    async ({ browser }) => {
      test.skip(isLocalHost(), 'Does not support localhost execution')

      const page = await newPage(browser, TEST_SSO_USER)
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()

      await expect.soft(portalPage.header.userMenu).toBeVisible()
      await expect.soft(portalPage.header.globalSearchBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.workspacesBtn).toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-2] Valid credentials (User ID)',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4263` },
    },
    async ({ browser }) => {
      test.skip(isLocalHost(), 'Does not support localhost execution')

      const page = await newPage(browser, { email: TEST_SSO_USER.id, password: TEST_SSO_USER.password })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()

      await expect(portalPage.header.userMenu).toBeVisible()
      await expect.soft(portalPage.header.globalSearchBtn).toBeVisible()
      await expect.soft(portalPage.sidebar.workspacesBtn).toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-3-N] Empty fields',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4265` },
    },
    async ({ browser }) => {

      const page = await newPage(browser, { email: '', password: '' })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()
      await portalPage.waitForTimeout(TIMEOUT)

      await expect(portalPage.header.userMenu).not.toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-4-N] Only Email',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4266` },
    },
    async ({ browser }) => {

      const page = await newPage(browser, { email: TEST_SSO_USER.email, password: '' })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()
      await portalPage.waitForTimeout(TIMEOUT)

      await expect(portalPage.header.userMenu).not.toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-5-N] Only User ID',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4267` },
    },
    async ({ browser }) => {

      const page = await newPage(browser, { email: TEST_SSO_USER.id, password: '' })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()
      await portalPage.waitForTimeout(TIMEOUT)

      await expect(portalPage.header.userMenu).not.toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-6-N] Only Password',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4268` },
    },
    async ({ browser }) => {

      const page = await newPage(browser, { email: '', password: TEST_SSO_USER.password })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()
      await portalPage.waitForTimeout(TIMEOUT)

      await expect(portalPage.header.userMenu).not.toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-7-N] Invalid Password',
    {
      tag: '@smoke',
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4269` },
    },
    async ({ browser }) => {

      const page = await newPage(browser, { email: TEST_SSO_USER.email, password: INVALID_PASSWORD })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()
      await portalPage.waitForTimeout(TIMEOUT)

      await expect(portalPage.header.userMenu).not.toBeVisible()

      await portalPage.close()
    })

  test('[P-SSO-8-N] Invalid Email',
    {
      annotation: { type: 'Test Case', description: `${TICKET_BASE_URL}TestCase-A-4271` },
    },
    async ({ browser }) => {

      const page = await newPage(browser, { email: INVALID_LOGIN, password: TEST_SSO_USER.password })
      const loginPage = new LoginPage(page)
      const portalPage = new PortalPage(page)

      await loginPage.goto()
      await loginPage.ssoSignInBtn.click()
      await portalPage.waitForTimeout(TIMEOUT)

      await expect(portalPage.header.userMenu).not.toBeVisible()

      await portalPage.close()
    })
})
