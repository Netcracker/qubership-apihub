import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type {
  CompareOperationPathsDialogFormData,
  CompareOperationPathsDialogFormProps,
} from '../components/CompareOperationPathsForm'
import { CompareOperationPathsDialogForm } from '../components/CompareOperationPathsForm'
import { restDeprecatedOperations } from './samples/operations-samples'

const meta: Meta<typeof CompareOperationPathsDialogForm> = {
  component: CompareOperationPathsDialogForm,
}

export default meta
type Story = StoryObj<typeof meta>

const StoryComponent = (args: CompareOperationPathsDialogFormProps): ReactElement => {
  const defaultValues = useMemo(() => {
    return {
      originalOperation: null,
      changedOperation: null,
    }
  }, [])

  const { control } = useForm<CompareOperationPathsDialogFormData>({ defaultValues })

  return (
    <CompareOperationPathsDialogForm
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
    originalOperationOptions: restDeprecatedOperations,
    changedOperationOptions: restDeprecatedOperations,
    isOriginalOperationsLoading: false,
    isChangedOperationsLoading: false,
    onOriginalInputChange: () => null,
    onChangedInputChange: () => null,
  },
  render: StoryComponent,
}
