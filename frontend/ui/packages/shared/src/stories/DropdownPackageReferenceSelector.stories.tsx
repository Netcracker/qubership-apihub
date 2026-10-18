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
import { fullHeight } from './commons/decorators'
import type { DropdownPackageReferenceSelectorProps } from '../components/DropdownPackageReferenceSelector'
import { DropdownPackageReferenceSelector } from '../components/DropdownPackageReferenceSelector'
import { references } from './samples/reference-samples'
import { useArgs } from '@storybook/preview-api'
import { useCallback } from 'react'

const meta: Meta<typeof DropdownPackageReferenceSelector> = {
  title: 'Dropdown Package Reference Selector',
  component: DropdownPackageReferenceSelector,
  args: {
    references: references,
    loading: false,
  },
  decorators: [fullHeight],
}

export default meta

export const DefaultStory: StoryFn<DropdownPackageReferenceSelectorProps> = (args) => {
  const [, updateArgs] = useArgs()

  const onSearch = useCallback((value: string) => {
    updateArgs({ references: references.filter(reference => reference?.name && reference.name.toLowerCase().includes(value.toLowerCase())) })
  }, [updateArgs])

  const onSearchParam = useCallback((value: string | undefined) => {
    if (value) {
      updateArgs({ selectedPackage: references.find(reference => reference?.key && reference.key.includes(value)) })
    }
  }, [updateArgs])

  return (
    <DropdownPackageReferenceSelector
      {...args}
      onSearch={onSearch}
      onSearchParam={onSearchParam}
    />
  )
}
