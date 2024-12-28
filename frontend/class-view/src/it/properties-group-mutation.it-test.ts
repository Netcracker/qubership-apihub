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

describe('Properties Group Mutation Test', () => {
  let story: StoryPage
  let component: ViewComponent

  beforeEach(async () => {
    await jestPuppeteer.resetPage()
    story = await storyPage(page, 'synthetic-topology--properties-group-mutation')
    component = await story.viewComponent()
  })

  afterEach(async () => {
    await story?.close()
  })

  it('Change group name', async () => {
    const optionsNameControl = await story.embeddedOptionsControl('Group name')
    await optionsNameControl.check('Short')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
    await optionsNameControl.check('Long')
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Add property', async () => {
    const booleanControl = await story.booleanControl('Add property')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Change deprecated', async () => {
    const optionsNameControl = await story.embeddedOptionsControl('Group name')
    await optionsNameControl.check('Short')
    const booleanControl = await story.booleanControl('Deprecated')
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot()
  })

  it('Check deterministic mutability', async () => {
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: () => 'group-deterministic-mutability'
    })
    const booleanControl = await story.booleanControl('Add property')
    await booleanControl.click()
    await booleanControl.click()
    await booleanControl.click()
    await booleanControl.click()
    expect(await component.captureScreenshot()).toMatchImageSnapshot({
      customSnapshotIdentifier: () => 'group-deterministic-mutability'
    })
  })
})
