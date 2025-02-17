import { test } from '@fixtures'
import { expect } from '@services/expect-decorator'
import { LoginPage } from '@shared/pages'
import { PortalPage } from '@portal/pages'
import { TICKET_BASE_URL } from '@test-setup'
import { INVALID_LOGIN, INVALID_PASSWORD, SYSADMIN } from '@test-data'
import { INVALID_CREDENTIALS_MSG } from '@shared/entities'

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
      await loginPage.signIn(SYSADMIN)

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
    async ({ sysadminPage: page }) => {

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
      await loginPage.signIn({ email: SYSADMIN.email, password: '' })

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
      await loginPage.signIn({ email: '', password: SYSADMIN.password })

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
      await loginPage.signIn({ email: SYSADMIN.email, password: INVALID_PASSWORD })

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
      await loginPage.signIn({ email: INVALID_LOGIN, password: SYSADMIN.password })

      await expect(loginPage.errorAlert).toBeVisible()
      await expect.soft(loginPage.errorAlert).toHaveText(INVALID_CREDENTIALS_MSG)
      await expect.soft(loginPage.errorIcon).toBeVisible()
      await expect.soft(loginPage.loginTxtFld).not.toBeEmpty()
      await expect.soft(loginPage.passwordTxtFld).not.toBeEmpty()

      await loginPage.close()
    })
})
