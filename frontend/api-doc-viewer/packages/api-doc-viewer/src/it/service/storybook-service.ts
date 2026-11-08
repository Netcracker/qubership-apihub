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

import { Page } from 'puppeteer'
import { StoryPageImpl } from './impl/story-page-impl'
import { host } from './storybook-functions'
import { StoryPage } from './story-page'

export async function storyPage(page: Page, storyName: string): Promise<StoryPage> {
  return storyPageWithArgs(page, storyName)
}

export async function storyPageWithArgs(
  page: Page,
  storyName: string,
  args?: Record<string, string>,
): Promise<StoryPage> {
  enableConsoleLogs(page, false);
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
  const argsQuery = args
    ? Object.entries(args).map(([key, value]) => `${key}:${value}`).join(';')
    : ''
  await page.goto(`${host()}/iframe.html?args=${argsQuery}&id=${storyName}&viewMode=story`, { waitUntil: 'networkidle2' })
  await waitForStoryRenderFinished(page, storyName)
  // way to support screenshots of long pages
  // await page.goto(`${host()}?path=/story/${storyName}`, { waitUntil: 'networkidle2' })
  // const storyFrame = await waitStoryFrame(page)
  return new StoryPageImpl(page, page)
}

const STORY_RENDER_FINISHED_PHASE = 'finished'
const STORY_RENDER_FINAL_PHASES = [STORY_RENDER_FINISHED_PHASE, 'errored', 'aborted']

/**
 * Waits until Storybook finishes rendering the story, including its `play`: stories select the
 * options their case covers in `play` (`src/stories/shared/auto-switch.ts`), so the IT captures
 * that state and never navigates itself. A `play` that throws fails the test here.
 */
async function waitForStoryRenderFinished(page: Page, storyName: string): Promise<void> {
  const phaseHandle = await page.waitForFunction(
    (finalPhases: string[]) => {
      const preview = (window as { __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } } }).__STORYBOOK_PREVIEW__
      const phase = preview?.currentRender?.phase
      return phase !== undefined && finalPhases.includes(phase) ? phase : false
    },
    {},
    STORY_RENDER_FINAL_PHASES,
  )
  const phase = await phaseHandle.jsonValue()
  if (phase !== STORY_RENDER_FINISHED_PHASE) {
    throw new Error(`Story ${storyName} ended in render phase "${phase}"; see the browser console for the error`)
  }
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
    return;
  }
  page.on("console", e => {
    const currentTest = expect.getState().currentTestName || "";
    if (e.type() === "error") {
       
      console.log(`Error in ${currentTest} - ${e.text()}`)
    }
    page.on("console", e => {
      if (e.type() === "log") {
         
        console.log(`Log in ${currentTest} - ${e.text()}`)
      }
    });
  });
}