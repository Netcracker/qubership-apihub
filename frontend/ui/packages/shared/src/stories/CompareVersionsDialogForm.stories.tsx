import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import type {
  CompareVersionsDialogFormData,
  CompareVersionsDialogFormProps,
} from '../components/CompareVersionsDialogForm'
import { CompareVersionsDialogForm } from '../components/CompareVersionsDialogForm'
import { packageVersion } from './samples/package-version-samples'
import { WORKSPACES } from './samples/packages-sample'
import { PACKAGE_OPTIONS } from './samples/packge-samples'

const meta: Meta<typeof CompareVersionsDialogForm> = {
  component: CompareVersionsDialogForm,
}

export default meta
type Story = StoryObj<typeof meta>

const StoryComponent = (args: CompareVersionsDialogFormProps): ReactElement => {
  const defaultValues = useMemo(() => {
    return {
      originalWorkspace: null,
      changedWorkspace: null,
      originalPackage: null,
      changedPackage: null,
      originalVersion: null,
      changedVersion: null,
    }
  }, [])

  const { control, setValue } = useForm<CompareVersionsDialogFormData>({ defaultValues })

  return (
    <CompareVersionsDialogForm
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
    workspaces: WORKSPACES,
    originalPackageOptions: PACKAGE_OPTIONS,
    changedPackageOptions: PACKAGE_OPTIONS,
    originalVersionOptions: [packageVersion],
    changedVersionOptions: [packageVersion],
    onSwap: () => null,
    isApiTypeFetching: false,
    isOriginalPackagesLoading: false,
    isChangedPackagesLoading: false,
    isOriginalPackageVersionsLoading: false,
    isChangedPackageVersionsLoading: false,
    isDashboard: false,
  },
  render: StoryComponent,
}
