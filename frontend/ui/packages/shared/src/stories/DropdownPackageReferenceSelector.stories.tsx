import type { Meta, StoryFn } from '@storybook/react-vite'
import { fullHeight } from './commons/decorators'
import type { DropdownPackageReferenceSelectorProps } from '../components/DropdownPackageReferenceSelector'
import { DropdownPackageReferenceSelector } from '../components/DropdownPackageReferenceSelector'
import { references } from './samples/reference-samples'
import { useArgs } from 'storybook/preview-api'
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
