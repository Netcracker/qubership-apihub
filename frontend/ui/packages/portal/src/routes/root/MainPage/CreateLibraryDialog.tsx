import { type FC, useEffect, useState } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'

import { GROUP_KIND, type Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import { LibraryDialogForm } from '@portal/components/LibraryDialogForm'
import { LIBRARY_PAGE_PATH_PATTERN } from '../../../routes'
import { useCreateLibrary } from '../useLibrary'

import { useShowSuccessNotification } from '../BasePage/Notification'
import { usePackages } from '../usePackages'
import { useSelectedWorkspaceContexts } from './MainPageProvider'

type CreateLibraryDialogProps = {
  parentPackage: Package
  onClose: () => void
}

export const CreateLibraryDialog: FC<CreateLibraryDialogProps> = ({ parentPackage, onClose }) => {
  const [selectedWorkspace] = useSelectedWorkspaceContexts()
  const [packagesTextFilter, setPackagesTextFilter] = useState('')
  const { createLibrary, isLoading, library, error, clearError } = useCreateLibrary()
  const navigate = useNavigate()
  const showSuccessNotification = useShowSuccessNotification()
  const [packages, arePackagesLoading] = usePackages({
    kind: GROUP_KIND,
    parentId: selectedWorkspace?.key,
    showAllDescendants: true,
    textFilter: packagesTextFilter,
  })

  useEffect(() => {
    if (library) {
      showSuccessNotification({ message: 'Library has been created' })
      onClose()
      navigate(generatePath(LIBRARY_PAGE_PATH_PATTERN, { libraryId: encodeURIComponent(library.libraryId) }))
    }
  }, [library, navigate, onClose, showSuccessNotification])

  return (
    <LibraryDialogForm
      open
      setOpen={onClose}
      onSubmit={createLibrary}
      currentWorkspace={selectedWorkspace}
      parentPackage={parentPackage}
      packages={packages}
      arePackagesLoading={arePackagesLoading}
      packageSearch={packagesTextFilter}
      onPackageSearch={setPackagesTextFilter}
      isLoading={isLoading}
      error={error}
      onCoordinatesChange={clearError}
    />
  )
}
CreateLibraryDialog.displayName = 'CreateLibraryDialog'
