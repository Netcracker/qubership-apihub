import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { FileActions, FileInfoIcon, FileTableUpload } from '../../components/FileTableUpload/FileTableUpload'
import { fullHeight } from '../commons/decorators'
import { SpecLogo } from '../../components/SpecLogo'

const meta: Meta<typeof FileTableUpload> = {
  title: 'File Table Upload/File Table Upload',
  parameters: {
    layout: 'fullscreen',
  },
  component: FileTableUpload,
  decorators: [fullHeight],
}

export default meta
type Story = StoryObj<typeof meta>

const longFileName = 'Test file 1 with a super long looooooooooooooooooooooooooooooooooooooooooooong name'
const fileName = 'Test file 2'

export const WithFilesStory: Story = {
  name: 'With Files',
  args: {
    uploadFilesMap: {
      longFileName: {
        file: new File([], longFileName),
        labels: ['important', 'work'],
      },
      fileName: {
        file: new File([], fileName),
        labels: ['personal', 'holiday'],
      },
    },
    showPlaceholder: true,
    onAddFiles: () => null,
    getFileClickHandler: () => null,
    getFileLeftIcon: () => <SpecLogo value={''}/>,
    getFileRightIcon: () => <FileInfoIcon/>,
    getFileActions: (file: File): ReactNode => {
      return <FileActions
        file={file}
        onDeleteAction={() => null}
        onRestoreAction={() => null}
        onEditAction={() => null}
      />
    },
  },
}

export const EmptyStory: Story = {
  name: 'Empty',
  args: {
    uploadFilesMap: {},
  },
}
