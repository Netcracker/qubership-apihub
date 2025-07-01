/* eslint-disable ui-testing/no-browser-commands-in-tests */
/* eslint-disable ui-testing/no-wait-in-tests */
import { expect, test } from '@fixtures'
import { PortalPage } from '@portal/pages'
import { BASE_URL } from '@test-setup'
import { readFileSync } from 'fs'

// TestCase-A-9527
// TestCase-A-9634

test.describe.configure({ mode: 'parallel' })

const data = readFileSync(`./src/tests/adv/urls/${process.env.ADV_FILE}.json`, 'utf8')
const paths: string[] = JSON.parse(data).urls

for (const path of paths) {
  const url = `${BASE_URL.origin}${path}`

  test(path,
    {
      annotation: { type: 'URL', description: url },
    },
    async ({ sysadminPage: page }) => {

      const responsePromise = page.waitForResponse(response =>
        response.url().includes('changes?'))

      const consolePromise = page.waitForEvent('console', msg =>
        msg.type() === 'debug' && (msg.text() === 'operation-viewer:ok' || msg.text() === 'operation-viewer:failed'))

      page.on('console', msg => {
        console.log(`${msg.type()}:"${msg.text()}"`)
      })

      await new PortalPage(page).goto(url)

      const response = await responsePromise
      const jsonData = await response.json()

      if (jsonData.operations.length === 0) {
        test.info().annotations.push({ type: 'Issue', description: 'No operations' })
        await page.evaluate(() => {
          console.debug('operation-viewer:ok')
        })
        return
      }

      await test.step('Success message', async () => {
        const msg = (await consolePromise).text()
        if (msg === 'operation-viewer:failed') {
          test.info().annotations.push({ type: 'Issue', description: 'Rendering failure' })
        }
        expect(msg).toEqual('operation-viewer:ok')
      })
    })
}
