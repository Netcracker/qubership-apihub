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

import { WORKSPACES_PAGE_REFERER } from '@apihub/entities/referer-pages-names'
import type { ShowCreatePackageDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_CREATE_PACKAGE_DIALOG } from '@apihub/routes/EventBusProvider'
import { PackageDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/Forms/PackageDialogForm'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { GROUP_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { toTitleCase } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCreatePackage, usePackage } from '../usePackage'
import { usePackages } from '../usePackages'
import { useSelectedWorkspaceContexts } from './MainPageProvider'
import { useIsPrivateMainPage } from './useMainPage'

export const CreatePackageDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CREATE_PACKAGE_DIALOG}
      render={props => <CreatePackagePopup {...props}/>}
    />
  )
})

const CreatePackagePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { workspaceKey, groupId } = useParams()
  const { parentPackageKey, kind } = detail as ShowCreatePackageDetail
  const [selectedWorkspace] = useSelectedWorkspaceContexts()
  const [parentPackage] = usePackage({ packageKey: parentPackageKey, showParents: true })
  const [packagesTextFilter, setPackagesTextFilter] = useState<string>(parentPackage?.name || '')

  const [packages, arePackagesLoading] = usePackages({
    kind: GROUP_KIND,
    parentId: selectedWorkspace?.key,
    showAllDescendants: true,
    textFilter: packagesTextFilter,
  })

  const isPrivatePage = useIsPrivateMainPage()
  const [user] = useUser()
  const userId = user?.key

  const optionRefererPage = isPrivatePage ? userId : WORKSPACES_PAGE_REFERER

  const [createPackage, isLoading, isSuccess, error] = useCreatePackage(workspaceKey ?? groupId ?? optionRefererPage)

  useEffect(() => {
    isSuccess && setOpen(false)
  }, [isSuccess, setOpen])

  return (
    <PackageDialogForm
      open={open}
      setOpen={setOpen}
      onSubmit={createPackage}
      title={`Create ${toTitleCase(kind)}`}
      kind={kind}
      currentWorkspace={selectedWorkspace}
      arePackagesLoading={arePackagesLoading}
      packages={packages}
      parentPackage={parentPackage}
      isLoading={isLoading}
      submitError={error}
      onPackageSearch={setPackagesTextFilter}
      submitText="Create"
    />
  )
})
