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

import { ElementHandle, Page } from 'puppeteer'
import { TextControl } from '../controls'

export class TextControlImpl implements TextControl {
  constructor(
    private readonly _domElement: ElementHandle,
    private readonly _page: Page,
    private readonly _prepareToNextRenderFinish: () => Promise<void>
  ) {
  }

  public async fill(text: string, waitUpdate = true): Promise<void> {
    const promise = waitUpdate ? this._prepareToNextRenderFinish() : this._page.waitForTimeout(1)
    await this._page.evaluate((newContent, element) => {
      // WA for react component https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-onchange-event-in-react-js
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      nativeInputValueSetter.call(element, newContent)
      const ev2 = new Event('input', { bubbles: true })
      element.dispatchEvent(ev2)
    }, text, this._domElement)
    return promise
  }
}
