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

import { ElementHandle } from 'puppeteer'
import { ViewComponent } from '../view-component'
import { captureScreenshot } from '../storybook-functions'
import { EventEmitter } from 'events'
import { EVENT_NAME_UPDATE_FINISH } from '../storybook-constant'

export class ViewComponentImpl implements ViewComponent {

  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _renderEventTarget: EventEmitter
  ) {
  }

  public async captureScreenshot(): Promise<Buffer | string> {
    return captureScreenshot(this._domElement)
  }

  public prepareToNextRenderFinish(): Promise<void> {
    return ViewComponentImpl.startWaitingUpdateFinish(this._renderEventTarget)
  }

  public static startWaitingUpdateFinish(eventEmitter: EventEmitter): Promise<void> {
    let resolve: () => void
    const promise = new Promise<void>(x => resolve = x)
    eventEmitter.once(EVENT_NAME_UPDATE_FINISH, () => {
      resolve()
    })
    return promise
  }

  public async clickOnLabel(label: string): Promise<void> {
    const renderFinish = this.prepareToNextRenderFinish()
    const element = await this.findTextElement(label)
    await element.click()
    await renderFinish
  }

  private async findTextElement(text: string): Promise<ElementHandle> {
    let elements: ElementHandle[] = await this._domElement.$x(`//*[name()='text'][text()='${text}']`) as ElementHandle<Element>[]
    if (elements.length === 0) {
      elements = await this._domElement.$x(`//*[name()='tspan'][text()='${text}']`) as ElementHandle<Element>[]
    }
    if (elements.length > 0) {
      return elements[0]
    }
    throw new Error(`Element ${text} is not found`)
  }
}
