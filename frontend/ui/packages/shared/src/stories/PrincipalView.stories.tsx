import type { Meta, StoryFn } from '@storybook/react-vite'
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
