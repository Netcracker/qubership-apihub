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

import type { Meta, StoryObj } from '@storybook/react'
import type { ReactNode } from 'react'
import { FileActions, FileInfoIcon, FileTableUpload } from '../../components/FileTableUpload/FileTableUpload'
import { fullHeight } from '../commons/decorators'
import { SpecLogo } from '../../components/SpecLogo'

const meta: Meta<typeof FileTableUpload> = {
  title: '/File Table Upload/File Table Upload',
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
