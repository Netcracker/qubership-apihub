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

import { ElementHandle, Frame, Page } from 'puppeteer'
import { StoryPage } from '../story-page'
import { ViewComponentImpl } from './view-component-impl'
import { ViewComponent } from '../view-component'
import { EventEmitter } from 'events'
import { BooleanControl, EmbeddedOptionsControl, TextControl } from '../controls'
import { BooleanControlImpl } from './boolean-control-impl'
import { EmbeddedOptionsControlImpl } from './embedded-options-control-impl'
import { TextControlImpl } from './text-control-impl'
import { NumberControlImpl } from './number-control-impl'

export class StoryPageImpl implements StoryPage {
  constructor(
    private readonly _page: Page,
    private readonly _storyFrame: Frame,
    private readonly _renderEventTarget: EventEmitter,
    private readonly _waitRenderClear: Promise<void>
  ) {
  }

  public async viewComponent(): Promise<ViewComponent> {
    await this._waitRenderClear
    const element = await this._storyFrame.waitForSelector('class-view')
    if (!element) {
      throw new Error('Unable to find view component')
    }
    return new ViewComponentImpl(element, this._renderEventTarget)
  }

  public async booleanControl(name: string): Promise<BooleanControl> {
    const control = await this._page.waitForSelector(StoryPageImpl.humanNameToControlIdSelector(name))
    if (!control) {
      throw new Error(`Unable to find control ${name}`)
    }
    return new BooleanControlImpl(control, this._page, () => ViewComponentImpl.startWaitingUpdateFinish(this._renderEventTarget))
  }

  public async embeddedOptionsControl(name: string): Promise<EmbeddedOptionsControl> {
    const control = (await this._page.waitForXPath(`//td[./span[text()='${name}']]/following-sibling::td//div`)) as ElementHandle
    if (!control) {
      throw new Error(`Unable to find control ${name}`)
    }
    return new EmbeddedOptionsControlImpl(control, this._page, () => ViewComponentImpl.startWaitingUpdateFinish(this._renderEventTarget))
  }

  public async numberControl(name: string): Promise<NumberControlImpl> {
    const control = (await this._page.waitForSelector(StoryPageImpl.humanNameToControlIdSelector(name))) as ElementHandle
    if (!control) {
      throw new Error(`Unable to find control ${name}`)
    }
    return new NumberControlImpl(control, () => ViewComponentImpl.startWaitingUpdateFinish(this._renderEventTarget), this._page)
  }

  public async textControl(name: string): Promise<TextControl> {
    const control = (await this._page.waitForSelector(StoryPageImpl.humanNameToControlIdSelector(name))) as ElementHandle
    if (!control) {
      throw new Error(`Unable to find control ${name}`)
    }
    return new TextControlImpl(control, this._page, () => ViewComponentImpl.startWaitingUpdateFinish(this._renderEventTarget))
  }

  public async reset(): Promise<void> {
    const button = await this._page.waitForXPath('//button[@title="Reset controls"]', { timeout: 0 }) as ElementHandle<HTMLButtonElement>
    if (!button) {
      throw new Error('Unable to find Reset button')
    }
    await button.click()
    await this._page.mouse.move(0, 0, { steps: 0 })
  }

  public close(): Promise<void> {
    this._page.removeAllListeners('console')
    return Promise.resolve()
  }

  private static humanNameToControlIdSelector(name: string): string {
    const controlId = name.split(/[!"#$%&'()*+,\-./:;=><?@[\\\]^_`{|}~\s]+/).map((value, index) => {
      if (index === 0) {
        return `${value.charAt(0).toLowerCase()}${value.substring(1)}`
      }
      return `${value.charAt(0).toUpperCase()}${value.substring(1)}`
    }).join('')
    return `#control-${controlId}`
  }

  public async showMouse(): Promise<void> {
    await this._storyFrame.evaluate(() => {
      (function () {
        const box = document.createElement('div')
        box.classList.add('mouse-helper')
        const styleElement = document.createElement('style')
        styleElement.innerHTML = `
    .mouse-helper {
      pointer-events: none;
      position: absolute;
      top: 0;
      left: 0;
      width: 20px;
      height: 20px;
      background: rgba(0,0,0,.4);
      border: 1px solid white;
      border-radius: 10px;
      margin-left: -10px;
      margin-top: -10px;
      transition: background .2s, border-radius .2s, border-color .2s;
    }
    .mouse-helper.button-1 {
      transition: none;
      background: rgba(0,0,0,0.9);
    }
    .mouse-helper.button-2 {
      transition: none;
      border-color: rgba(0,0,255,0.9);
    }
    .mouse-helper.button-3 {
      transition: none;
      border-radius: 4px;
    }
    .mouse-helper.button-4 {
      transition: none;
      border-color: rgba(255,0,0,0.9);
    }
    .mouse-helper.button-5 {
      transition: none;
      border-color: rgba(0,255,0,0.9);
    }`

        const updateButtons = (buttons: number): void => {
          for (let i = 0; i < 5; i++) {
            box.classList.toggle(`button-${i}`, Boolean(buttons & (1 << i)))
          }
        }
        document.head.appendChild(styleElement)
        document.body.appendChild(box)
        document.addEventListener('mousemove', event => {
          box.style.left = `${event.pageX}px`
          box.style.top = `${event.pageY}px`
          updateButtons(event.buttons)
        }, true)
        document.addEventListener('mousedown', event => {
          updateButtons(event.buttons)
        }, true)
        document.addEventListener('mouseup', event => {
          updateButtons(event.buttons)
        }, true)
      })()
    })
  }
}
