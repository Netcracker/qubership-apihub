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

describe('Selection Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-selection--selection-api')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Click on class', async () => {
    await story.showMouse()
    await component.clickOnLabel('Class')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const checked = await (await story.booleanControl('Select class')).checked()
    expect(checked).toBeTruthy()
  })

  it('Click on class property', async () => {
    await story.showMouse()
    await component.clickOnLabel('Class property')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const checked = await (await story.booleanControl('Select property')).checked()
    expect(checked).toBeTruthy()
  })

  it('Click on group', async () => {
    await story.showMouse()
    await component.clickOnLabel('Group')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const checked = await (await story.booleanControl('Select group')).checked()
    expect(checked).toBeTruthy()
  })

  it('Click on group property', async () => {
    await story.showMouse()
    await component.clickOnLabel('Group property')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    const checked = await (await story.booleanControl('Select group\'s property')).checked()
    expect(checked).toBeTruthy()
  })

  it('Click on property relation', async () => {
    await story.showMouse()
    const selectRelation = await story.booleanControl('Select property\'s relation')
    await selectRelation.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Click on group relation', async () => {
    await story.showMouse()
    const selectRelation = await story.booleanControl('Select group\'s relation')
    await selectRelation.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Multiple by api', async () => {
    const selectClass = await story.booleanControl('Select class')
    const selectClassProperty = await story.booleanControl('Select property')
    const selectGroup = await story.booleanControl('Select group')
    const selectGroupProperty = await story.booleanControl('Select group\'s property')
    const selectPropertyRelation = await story.booleanControl('Select property\'s relation')
    const selectGroupRelation = await story.booleanControl('Select group\'s relation')

    await selectClass.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await selectClassProperty.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await selectGroup.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await selectGroupProperty.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await selectPropertyRelation.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await selectGroupRelation.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Clear Selection', async () => {
    await story.showMouse()
    const selectClass = await story.booleanControl('Select class')
    const selectClassProperty = await story.booleanControl('Select property')
    const selectGroup = await story.booleanControl('Select group')
    const selectGroupProperty = await story.booleanControl('Select group\'s property')
    const selectPropertyRelation = await story.booleanControl('Select property\'s relation')
    const selectGroupRelation = await story.booleanControl('Select group\'s relation')

    await selectClass.click()
    await selectClassProperty.click()
    await selectGroup.click()
    await selectGroupProperty.click()
    await selectPropertyRelation.click()
    await selectGroupRelation.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    await page.mouse.click(300, 300)
    await page.waitForTimeout(1000)
    expect(await component.captureScreenshot()).toMatchImageSnapshot()

    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    expect(await selectClass.checked()).toBeFalsy()
    expect(await selectGroup.checked()).toBeFalsy()
    expect(await selectPropertyRelation.checked()).toBeFalsy()
    expect(await selectGroupRelation.checked()).toBeFalsy()
  })
})

