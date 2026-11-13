import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type {
  CompareRevisionsDialogFormData,
  CompareRevisionsDialogFormProps,
} from '../components/CompareRevisionsDialogForm'
import { CompareRevisionsDialogForm } from '../components/CompareRevisionsDialogForm'
import { revisions } from './samples/revisions-samples'

const meta: Meta<typeof CompareRevisionsDialogForm> = {
  component: CompareRevisionsDialogForm,
}

export default meta
type Story = StoryObj<typeof meta>

const StoryComponent = (args: CompareRevisionsDialogFormProps): ReactElement => {
  const defaultValues = useMemo(() => {
    return {
      changedRevision: null,
      originalRevision: null,
    }
  }, [])

  const { control, setValue } = useForm<CompareRevisionsDialogFormData>({ defaultValues })

  return (
    <CompareRevisionsDialogForm
      {...args}
      control={control}
      setValue={setValue}
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
    originalRevisions: revisions,
    changedRevisions: revisions,
    isApiTypeFetching: false,
    isRevisionsLoading: false,
  },
  render: StoryComponent,
}
