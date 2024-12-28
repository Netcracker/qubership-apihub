/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Page } from 'puppeteer'
import { StoryPageImpl } from './impl/story-page-impl'
import { host } from './storybook-functions'
import type { StoryPage } from './story-page'

export async function storyPage(page: Page, storyName: string): Promise<StoryPage> {
  enableConsoleLogs(page, false)
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('storybook-layout', JSON.stringify({
      resizerPanel: { x: 1300, y: 0 },
      resizerNav: { x: 200, y: 0 },
    }))
    localStorage.setItem('@storybook/manager/store', JSON.stringify({
      layout: {
        'initialActive': 'canvas',
        'showToolbar': true,
        'isFullscreen': false,
        'showPanel': true,
        'showNav': true,
        'panelPosition': 'right',
        'showTabs': true,
      },
    }))
  })
  await page.setViewport({ width: 1800, height: 1000 })
  await page.goto(`${host()}/iframe.html?args=&id=${storyName}&viewMode=story`, { waitUntil: 'networkidle2' })
  //temp solution for screenshot long pages
  // await page.goto(`${host()}?path=/story/${storyName}`, { waitUntil: 'networkidle2' })
  // const storyFrame = await waitStoryFrame(page)
  return new StoryPageImpl(page, page)
}

// async function waitStoryFrame(page: Page): Promise<Frame> {
//   let fulfill: (frame: Frame) => void
//   let retryPid: ReturnType<typeof setTimeout>
//   const promise = new Promise<Frame>(x => fulfill = x)
//   checkFrame()
//
//   function checkFrame(): void {
//     page.removeListener('frameattached', checkFrame)
//     clearTimeout(retryPid)
//     const frame = page.mainFrame().childFrames().find(f => f.name() === 'storybook-preview-iframe')
//     if (frame) {
//       fulfill(frame)
//     } else {
//       page.once('frameattached', checkFrame)
//       retryPid = setTimeout(checkFrame, 50)
//     }
//   }
//
//   return promise
// }

function enableConsoleLogs(page: Page, enable: boolean): void {
  if (!enable) {
    return
  }
  page.on('console', e => {
    const currentTest = expect.getState().currentTestName || ''
    if (e.type() === 'error') {

      console.log(`Error in ${currentTest} - ${e.text()}`)
    }
    page.on('console', e => {
      if (e.type() === 'log') {

        console.log(`Log in ${currentTest} - ${e.text()}`)
      }
    })
  })
}
