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

import { Frame, Page } from 'puppeteer'
import { StoryPageImpl } from './impl/story-page-impl'
import { host } from './storybook-functions'
import { StoryPage } from './story-page'
import { EventEmitter } from 'events'
import { EVENT_NAME_UPDATE_FINISH, FUNCTION_NAME_UPDATE_FINISH } from './storybook-constant'
import { EVENT_UPDATE_FINISH } from 'main/component'

const REPUB_EVENT_UPDATE_FINISH: typeof EVENT_UPDATE_FINISH = 'update-finish'

export async function storyPage(page: Page, storyName: string): Promise<StoryPage> {
  enableConsoleLogs(page, true)
  const renderEventTarget: EventEmitter = new EventEmitter()
  await page.exposeFunction(FUNCTION_NAME_UPDATE_FINISH, () => renderEventTarget.emit(EVENT_NAME_UPDATE_FINISH))
  await page.evaluateOnNewDocument((eventName, listener) => {
    localStorage.setItem('storybook-layout', JSON.stringify({
      resizerPanel: { x: 1300, y: 0 },
      resizerNav: { x: 200, y: 0 }
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document.addEventListener(eventName, (window as any)[listener])
  }, REPUB_EVENT_UPDATE_FINISH, FUNCTION_NAME_UPDATE_FINISH)
  const waitRenderClear = waitRenderClearInterval(renderEventTarget)
  await page.setViewport({ width: 1800, height: 1000 })
  await page.goto(`${host()}?path=/story/${storyName}&it=true`, { waitUntil: 'networkidle2', timeout: 0 })
  await page.waitForSelector('#storybook-panel-root', { timeout: 0 })
  const storyFrame = await waitStoryFrame(page)
  return new StoryPageImpl(page, storyFrame, renderEventTarget, waitRenderClear)
}

function waitRenderClearInterval(renderEventTarget: EventEmitter): Promise<void> {
  let resolve: () => void
  const promise = new Promise<void>(x => resolve = x)
  let timer: ReturnType<typeof setTimeout> | null = null
  const listener = (): void => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      renderEventTarget.off(EVENT_NAME_UPDATE_FINISH, listener)
      timer = null
      resolve()
    }, 500)
  }
  renderEventTarget.on(EVENT_NAME_UPDATE_FINISH, listener)
  return promise
}

async function waitStoryFrame(page: Page): Promise<Frame> {
  let fulfill: (frame: Frame) => void
  let retryPid: ReturnType<typeof setTimeout>
  const promise = new Promise<Frame>(x => fulfill = x)
  checkFrame()

  function checkFrame(): void {
    page.removeListener('frameattached', checkFrame)
    clearTimeout(retryPid)
    const frame = page.mainFrame().childFrames().find(f => f.name() === 'storybook-preview-iframe')
    if (frame) {
      fulfill(frame)
    } else {
      page.once('frameattached', checkFrame)
      retryPid = setTimeout(checkFrame, 50)
    }
  }

  return promise
}

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
