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

describe('Navigation Static Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-navigate--static-apply')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Basic navigate', async () => {
    const classControl = await story.booleanControl('Navigate include class')
    const classProperty = await story.booleanControl('Navigate include class\'s property')
    const group = await story.booleanControl('Navigate include group')
    const groupProperty = await story.booleanControl('Navigate include group\'s property')
    const relation = await story.booleanControl('Navigate include relation')

    const navigate = await story.embeddedOptionsControl('Call `Navigate To` at')

    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await classControl.click(false)
    await classProperty.click(false)
    await group.click(false)
    await groupProperty.click(false)
    await relation.click(false)

    await navigate.check('Left group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await navigate.check('Both group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await navigate.check('Right group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await classControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await classProperty.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await group.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await groupProperty.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await relation.click(false)
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Navigate options', async () => {
    const classControl = await story.booleanControl('Navigate include class')
    const animation = await story.textControl('Navigate option. Animation duration')
    const insets = await story.embeddedOptionsControl('Navigate option. Insets')
    const navigateTo = await story.embeddedOptionsControl('Call `Navigate To` at')

    await classControl.click(false)
    await animation.fill('300', false)
    await insets.check('Bottom: 200', false)
    await navigateTo.check('Left group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await navigateTo.check('Both group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await navigateTo.check('Right group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })
})
