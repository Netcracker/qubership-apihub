import type { Meta, StoryFn } from '@storybook/react-vite'
import { useArgs } from 'storybook/preview-api'
import { useCallback } from 'react'
import type { OperationFiltersProps } from '../components/OperationFilters/OperationFilters'
import { OperationFilters } from '../components/OperationFilters/OperationFilters'
import { operationTags } from './samples/tags-samples'
import { references } from './samples/reference-samples'
import { versionContent } from './samples/version-content-samples'
import { API_TYPE_REST } from '../entities/api-types'

const meta: Meta<OperationFiltersProps> = {
  title: 'Operation Filters',
  args: {
    tags: operationTags,
    areTagsLoading: false,
    isPackageVersionContentLoading: false,
    isReferencesLoading: false,
    references: references,
    apiType: API_TYPE_REST,
    versionContent: versionContent,
    hiddenGeneralFilters: false,
  },
  component: OperationFilters,
}

export default meta

export const DefaultStory: StoryFn<OperationFiltersProps> = (args) => {
  const [, updateArgs] = useArgs()

  const onTagSearch = useCallback((value: string) => {
    updateArgs({ tags: operationTags.filter(tag => tag.toLowerCase().includes(value.toLowerCase())) })
  }, [updateArgs])

  const onClickExpandCollapseButton = useCallback((value: boolean) => {
    updateArgs({ hiddenGeneralFilters: value })
  }, [updateArgs])

  return (
    <OperationFilters
      {...args}
      onTagSearch={onTagSearch}
      onClickExpandCollapseButton={onClickExpandCollapseButton}
    />
  )
}
