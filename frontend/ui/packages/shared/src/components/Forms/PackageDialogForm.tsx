import type { FC } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { EMPTY_PACKAGE, type Package, type PackageKind, WORKSPACE_KIND } from '../../entities/packages'
import { BaseDialogForm, type BaseDialogFormProps, type BaseDialogFormValues } from './BaseDialogForm'

type PackageDialogFormValues = Omit<Package, 'packageVisibility'> & BaseDialogFormValues

export type PackageDialogFormProps = Omit<
  BaseDialogFormProps,
  'onSubmit' | 'showParent' | 'children' | 'formError' | 'submitDisabled'
> & {
  kind: PackageKind
  onSubmit: (value: Package) => void
}

export const PackageDialogForm: FC<PackageDialogFormProps> = ({ kind, parentPackage, onSubmit, ...props }) => {
  const form = useForm<PackageDialogFormValues>({
    defaultValues: {
      ...EMPTY_PACKAGE,
      kind: kind,
      parentGroup: parentPackage?.key,
      isPrivate: false,
    },
  })

  return (
    <FormProvider {...form}>
      <BaseDialogForm
        {...props}
        parentPackage={parentPackage}
        showParent={kind !== WORKSPACE_KIND}
        onSubmit={form.handleSubmit(({ isPrivate, ...value }) => onSubmit({
          ...value,
          packageVisibility: isPrivate,
        }))}
      />
    </FormProvider>
  )
}
PackageDialogForm.displayName = 'PackageDialogForm'
