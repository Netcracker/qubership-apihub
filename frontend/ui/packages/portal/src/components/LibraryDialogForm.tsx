import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import { Alert, styled, TextField, Typography } from '@mui/material'
import type { FC } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { generatePath, Link } from 'react-router-dom'

import {
  BaseDialogForm,
  type BaseDialogFormProps,
  type BaseDialogFormValues,
} from '@netcracker/qubership-apihub-ui-shared/components/Forms/BaseDialogForm'
import { type Package, PRIVATE_PACKAGE_ROLE } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import { LIBRARY_ERROR_MESSAGES, LibraryErrorCodes, type MavenLibraryCreateDto } from '@portal/entities/libraries'
import { LIBRARY_PAGE_PATH_PATTERN } from '../routes'

type LibraryDialogFormValues = BaseDialogFormValues & Pick<MavenLibraryCreateDto, 'repository' | 'coordinates'>

const LIBRARY_ERROR_FIELDS: ReadonlyMap<string, 'coordinates' | 'repository'> = new Map([
  [LibraryErrorCodes.ALREADY_EXISTS, 'coordinates'],
  [LibraryErrorCodes.INVALID_COORDINATES, 'coordinates'],
  [LibraryErrorCodes.REPOSITORY_NOT_CONFIGURED, 'repository'],
])

type LibraryDialogFormProps =
  & Omit<
    BaseDialogFormProps,
    'onSubmit' | 'title' | 'showParent' | 'children' | 'formError' | 'submitError' | 'submitDisabled'
  >
  & {
    parentPackage: Package
    onSubmit: (value: MavenLibraryCreateDto) => void
    error?: Error | null
    onCoordinatesChange: () => void
  }

const MAVEN_FIELDS = [
  // TODO(libraries-backend): Repository stays free text because GET /repositories is for system administrators only.
  // Offer a dropdown once the service opens it to users who may create a library.
  { name: 'repository', label: 'Maven Repository Name', testId: 'MavenRepositoryNameTextField' },
  { name: 'coordinates.groupId', label: 'Maven GroupId', testId: 'MavenGroupIdTextField' },
  { name: 'coordinates.artifactId', label: 'Maven ArtifactId', testId: 'MavenArtifactIdTextField' },
] as const

export const LibraryDialogForm: FC<LibraryDialogFormProps> = ({
  parentPackage,
  onSubmit,
  error,
  onCoordinatesChange,
  submitText = 'Create',
  ...props
}) => {
  const form = useForm<LibraryDialogFormValues>({
    defaultValues: {
      name: '',
      alias: '',
      parentGroup: parentPackage.key,
      description: '',
      isPrivate: false,
      repository: '',
      coordinates: { groupId: '', artifactId: '' },
    },
    mode: 'onChange',
  })
  const errorField = error instanceof HttpError ? LIBRARY_ERROR_FIELDS.get(error.code) : undefined
  const serverErrorMessage = error instanceof HttpError ? LIBRARY_ERROR_MESSAGES.get(error.code) : undefined
  const coordinatesErrorMessage = errorField === 'coordinates' ? serverErrorMessage : undefined
  const repositoryErrorMessage = errorField === 'repository' ? serverErrorMessage : undefined
  const errorMessage = errorField ? coordinatesErrorMessage : error?.message
  const libraryId = error instanceof HttpError && error.code === LibraryErrorCodes.ALREADY_EXISTS
    ? error.params?.libraryId
    : undefined

  return (
    <FormProvider {...form}>
      <BaseDialogForm
        {...props}
        title="Create Library"
        parentPackage={parentPackage}
        onSubmit={form.handleSubmit(value =>
          onSubmit({
            alias: value.alias,
            name: value.name,
            language: 'java',
            parentPackageId: value.parentGroup,
            description: value.description,
            // TODO(libraries-backend): Omitting defaultRole makes the service store "Viewer", which matches no role id
            // (viewer), so the default role grants nothing. Wait for the service to store a valid role id.
            defaultRole: value.isPrivate ? PRIVATE_PACKAGE_ROLE : undefined,
            repository: value.repository.trim(),
            coordinates: {
              groupId: value.coordinates.groupId.trim(),
              artifactId: value.coordinates.artifactId.trim(),
            },
          }),
        )}
        submitText={submitText}
        submitDisabled={!!coordinatesErrorMessage || !!repositoryErrorMessage}
        formError={errorMessage && (
          <CoordinatesError severity="error" icon={<ErrorRoundedIcon />}>
            {libraryId
              ? (
                <>
                  Duplicate Maven coordinates. Library{' '}
                  <Link
                    to={generatePath(LIBRARY_PAGE_PATH_PATTERN, { libraryId: encodeURIComponent(libraryId) })}
                    data-testid="ExistingLibraryLink"
                  >
                    {libraryId}
                  </Link>{' '}
                  already has this repository name and Maven GA. Use it to publish versions, or change the coordinates.
                </>
              )
              : errorMessage}
          </CoordinatesError>
        )}
      >
        <CoordinatesHeading variant="h3">Maven Coordinates</CoordinatesHeading>
        {MAVEN_FIELDS.map(({ name, label, testId }) => {
          const isRepository = name === 'repository'
          const fieldServerError = isRepository ? repositoryErrorMessage : coordinatesErrorMessage
          return (
            <Controller
              key={name}
              name={name}
              control={form.control}
              rules={{ validate: value => !!value.trim() || 'This field is required.' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  required
                  label={label}
                  onChange={event => {
                    field.onChange(event)
                    if (!repositoryErrorMessage || isRepository) onCoordinatesChange()
                  }}
                  error={!!fieldState.error || !!fieldServerError}
                  helperText={fieldState.error?.message ?? (isRepository ? repositoryErrorMessage : undefined)}
                  data-testid={testId}
                />
              )}
            />
          )
        })}
      </BaseDialogForm>
    </FormProvider>
  )
}
LibraryDialogForm.displayName = 'LibraryDialogForm'

const CoordinatesHeading = styled(Typography)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(1),
}))

const CoordinatesError = styled(Alert)(({ theme }) => ({
  color: theme.palette.common.black,
  backgroundColor: theme.palette.error.light,
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '& .MuiAlert-icon': { color: theme.palette.error.main },
}))
