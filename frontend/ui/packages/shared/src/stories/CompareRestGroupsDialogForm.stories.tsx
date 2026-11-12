import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type {
  CompareRestGroupsDialogFormData,
  CompareRestGroupsDialogFormProps,
} from '../components/CompareRestGroupsDialogForm'
import { CompareRestGroupsDialogForm } from '../components/CompareRestGroupsDialogForm'
import { operationGroups } from './samples/operation-groups-samples'

const meta: Meta<typeof CompareRestGroupsDialogForm> = {
  component: CompareRestGroupsDialogForm,
}

export default meta
type Story = StoryObj<typeof meta>

const StoryComponent = (args: CompareRestGroupsDialogFormProps): ReactElement => {
  const defaultValues = useMemo(() => {
    return {
      originalGroup: null,
      changedGroup: null,
    }
  }, [])

  const { control } = useForm<CompareRestGroupsDialogFormData>({ defaultValues })

  return (
    <CompareRestGroupsDialogForm
      {...args}
      control={control}
    />
  )
}

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    open: true,
    setOpen: () => null,
    onSubmit: () => null,
    onSwap: () => null,
    originalGroupOptions: operationGroups,
    changedGroupOptions: operationGroups,
    isLoadingOriginalGroup: false,
    isLoadingChangedGroup: false,
    onOriginalInputChange: () => null,
    onChangedInputChange: () => null,
  },
  render: StoryComponent,
}
