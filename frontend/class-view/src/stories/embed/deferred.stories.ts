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

import { Meta, StoryFn } from '@storybook/html'
import { ContentObject } from 'main/domain'
import { generateClassObject, storyArgsFunc } from 'stories/common'

export default {
  title: 'Synthetic/Embed',
} satisfies Meta

const CONTENT = {
  classes: [
    generateClassObject('key'),
  ],
} satisfies ContentObject

export const Deferred: StoryFn = storyArgsFunc((_, component) => {
  const div = document.createElement('div')
  div.style.width = '100%'
  div.style.height = '100%'
  div.style.textAlign = 'center'
  div.textContent = 'Wait 10 seconds'
  setTimeout(() => {
    div.textContent = ''
    div.appendChild(component)
  }, 10000)
  return div
}, baseContext => {
  baseContext.component.content = CONTENT
  return baseContext
})
