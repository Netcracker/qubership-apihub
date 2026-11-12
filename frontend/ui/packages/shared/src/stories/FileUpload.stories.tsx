import type { Meta, StoryFn } from '@storybook/react-vite'
import React from 'react'
import type { FileUploadProps } from '../components/FileUpload'
import { FileUpload } from '../components/FileUpload'
import Box from '@mui/material/Box'

export default {
  title: 'File Upload',
} as Meta

const FileUploadFn: StoryFn<FileUploadProps> = (args) => (
  <FileUpload {...args} >
    <Box>Drop files here</Box>
  </FileUpload>
)
export const FileUploadStory = FileUploadFn.bind({})

FileUploadStory.args = {
  onDrop: (files) => console.log('files', files),
}
FileUploadStory.storyName = 'File Upload'
