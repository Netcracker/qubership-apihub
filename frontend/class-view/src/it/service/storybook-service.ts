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
import { EVENT_NAME_UPDATE_FINISH } from './storybook-constant'
import { EVENT_UPDATE_FINISH } from 'main/component'

const REPUB_EVENT_UPDATE_FINISH: typeof EVENT_UPDATE_FINISH = 'update-finish'

const RENDER_SIGNAL = '__CLASS_VIEW_UPDATE_FINISH__'

export async function storyPage(page: Page, storyName: string): Promise<StoryPage> {
  enableConsoleLogs(page, false)
  const renderEventTarget: EventEmitter = new EventEmitter()
  // Bridge browser→Node.js: the iframe emits a DOM event on render finish,
  // which we relay via console.log (see storyFrame.evaluate below) because
  // page.exposeFunction can't reach the OOPIF. This listener converts it
  // back into a Node.js EventEmitter event that tests await.
  page.on('console', msg => {
    if (msg.text() === RENDER_SIGNAL) {
      renderEventTarget.emit(EVENT_NAME_UPDATE_FINISH)
    }
  })
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('storybook-layout', JSON.stringify({
      resizerPanel: { x: 1300, y: 0 },
      resizerNav: { x: 200, y: 0 }
    }))
  })
  await page.setViewport({ width: 1800, height: 1000 })
  await page.goto(`${host()}?path=/story/${storyName}&it=true`, { waitUntil: 'networkidle2', timeout: 0 })
  await page.waitForSelector('#storybook-panel-root', { timeout: 0 })
  const storyFrame = await waitStoryFrame(page)
  // Emit render-finish DOM event as console.log so the bridge above can catch it.
  await storyFrame.evaluate((eventName, signal) => {
    document.addEventListener(eventName, () => console.log(signal))
  }, REPUB_EVENT_UPDATE_FINISH, RENDER_SIGNAL)
  // The component may have already rendered during page.goto(). Trigger
  // a re-render so our freshly attached listener catches the event.
  const waitRenderClear = waitRenderClearInterval(renderEventTarget)
  await storyFrame.evaluate(() => {
    const el = document.querySelector('class-view')
    if (el) {
      (el as any).invalidate()
    }
  })
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
    page.off('frameattached', checkFrame)
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
