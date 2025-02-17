/* eslint-disable ui-testing/no-browser-commands-in-tests */
/* eslint-disable ui-testing/no-wait-in-tests */
import { expect, test } from '@fixtures'
import { PortalPage } from '@portal/pages'
import { BASE_ORIGIN } from '@test-setup'
import { readFileSync } from 'fs'
import { saveSsFileByLocalViaAPI } from '@services/storage-state'
import { SYSADMIN } from '@test-data'

// TestCase-A-9527
// TestCase-A-9634

test.describe.configure({ mode: 'parallel' })

const data = readFileSync(`./src/tests/adv/urls/${process.env.ADV_FILE}.json`, 'utf8')
const paths: string[] = JSON.parse(data).urls

for (const [index, path] of paths.entries()) {
  const url = `${BASE_ORIGIN}${path}`

  test(path,
    {
      annotation: { type: 'URL', description: url },
    },
    async ({ sysadminPage: page }) => {

      if (index % 5000 === 0 && index !== 0) {
        await saveSsFileByLocalViaAPI(SYSADMIN)
      }

      const consolePromise = page.waitForEvent('console', msg =>
        msg.type() === 'debug' && (msg.text() === 'operation-viewer:ok' || msg.text() === 'operation-viewer:failed'))

      page.on('console', msg => {
        console.log(`${msg.type()}:"${msg.text()}"`)
      })

      await new PortalPage(page).goto(url)

      await test.step('Success message', async () => {
        const msg = (await consolePromise).text()
        if (msg === 'operation-viewer:failed') {
          test.info().annotations.push({ type: 'Issue', description: 'Rendering failure' })
        }
        expect(msg).toEqual('operation-viewer:ok')
      })
    })
}
