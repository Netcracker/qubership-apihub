import type { Meta, StoryFn } from '@storybook/react-vite'
import React from 'react'
import type { UploadButtonProps } from '../components/UploadButton'
import { UploadButton } from '../components/UploadButton'

export default {
  title: 'Upload Button',
} as Meta

const UploadButtonFn: StoryFn<UploadButtonProps> = (args) => <UploadButton {...args} />
export const UploadButtonStory = UploadButtonFn.bind({})

UploadButtonStory.args = {
  title: 'Browse',
  onUpload: (files) => console.log('files', files),
}
UploadButtonStory.storyName = 'Upload Button'
