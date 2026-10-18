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

import { ViewComponent } from './service/view-component'
import { StoryPage } from './service/story-page'
import { storyPage } from './service/storybook-service'

describe('Navigation Deferred Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-navigate--deferred-apply')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Basic navigate', async () => {
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const navigateTo = await story.embeddedOptionsControl('Navigate To')
    await navigateTo.check('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check("Class's property")
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check("Group's property")
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Relation')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Non-existent')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Navigate options', async () => {
    const animation = await story.textControl('Navigate option. Animation duration')
    const insets = await story.embeddedOptionsControl('Navigate option. Insets')
    const navigateTo = await story.embeddedOptionsControl('Navigate To')

    await animation.fill('0', false)
    await insets.check('Left: 50', false)
    await navigateTo.check('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
