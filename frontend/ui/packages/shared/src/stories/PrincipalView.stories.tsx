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

import type { Meta, StoryFn } from '@storybook/react'
import type { PrincipalViewProps } from '../components/PrincipalView'
import { PrincipalView } from '../components/PrincipalView'
import type { Principal } from '../entities/principals'
import { API_KEY, USER } from '../entities/principals'

const TOKEN_SAMPLE: Principal = {
  type: API_KEY,
  id: 'token',
  name: 'Token name',
}

const USER_SAMPLE: Principal = {
  type: USER,
  id: 'user',
  name: 'User name',
  avatarUrl: '?',
}

export default {
  title: 'Principal View',
} as Meta

const TokenViewFn: StoryFn<PrincipalViewProps> = (args) => (
  <PrincipalView {...args}/>
)

export const TokenViewStory = TokenViewFn.bind({})

TokenViewStory.args = {
  value: TOKEN_SAMPLE,
}

const UserViewFn: StoryFn<PrincipalViewProps> = (args) => (
  <PrincipalView {...args}/>
)

export const UserViewStory = UserViewFn.bind({})

UserViewStory.args = {
  value: USER_SAMPLE,
}
