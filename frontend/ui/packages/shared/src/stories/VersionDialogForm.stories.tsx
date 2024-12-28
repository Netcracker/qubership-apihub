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

import type { ReactElement } from 'react'
import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type { Meta, StoryObj } from '@storybook/react'
import type { VersionStatus } from '../entities/version-status'
import { DRAFT_VERSION_STATUS, NO_PREVIOUS_RELEASE_VERSION_OPTION } from '../entities/version-status'
import type { VersionDialogFormProps, VersionFormData } from '../components/VersionDialogForm'
import { VersionDialogForm } from '../components/VersionDialogForm'

const meta: Meta<typeof VersionDialogForm> = {
  component: VersionDialogForm,
}

export default meta
type Story = StoryObj<typeof meta>

const StoryComponent = (args: VersionDialogFormProps): ReactElement => {
  const defaultValues = useMemo(() => ({
    version: '',
    status: DRAFT_VERSION_STATUS as VersionStatus,
    labels: [],
    descriptorFile: null,
    previousVersion: NO_PREVIOUS_RELEASE_VERSION_OPTION,
  }), [])

  const { control, setValue, formState } = useForm<VersionFormData>({ defaultValues })

  return (
    <VersionDialogForm
      {...args}
      control={control}
      setValue={setValue}
      formState={formState}
    />
  )
}

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    open: true,
    setOpen: () => null,
    onSubmit: () => null,
    versions: [],
    previousVersions: [],
    getVersionLabels: () => [],
    packagePermissions: [],
    isPublishing: false,
    hideDescriptorField: true,
    hideDescriptorVersionField: true,
  },
  render: StoryComponent,
}
