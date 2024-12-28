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

import type { ElementHandle, NodeFor, Page, WaitForSelectorOptions } from 'puppeteer'
import type { StoryPage } from '../story-page'
import { ViewComponentImpl } from './view-component-impl'
import type { ViewComponent } from '../view-component'

interface SelectorLookup {
  waitForSelector<Selector extends string>(selector: Selector, options?: WaitForSelectorOptions): Promise<ElementHandle<NodeFor<Selector>> | null>
}

export class StoryPageImpl implements StoryPage {
  constructor(
    private readonly _page: Page,
    private readonly _root: SelectorLookup) {
  }

  async viewComponent(): Promise<ViewComponent> {
    const element = await this._root.waitForSelector('#storybook-root')
    if (!element) {
      throw new Error('Unable to find view component')
    }
    return new ViewComponentImpl(element)
  }
}
