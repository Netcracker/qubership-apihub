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

import type { FC } from 'react'
import * as React from 'react'
import { memo, useEffect, useState } from 'react'
import { useCreatePackage, usePackage } from '../usePackage'
import { useSelectedWorkspaceContexts } from './MainPageProvider'
import { usePackages } from '../usePackages'
import { useParams } from 'react-router-dom'
import { useIsPrivateMainPage } from './useMainPage'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { ShowCreatePackageDetail } from '@apihub/routes/EventBusProvider'
import { SHOW_CREATE_PACKAGE_DIALOG } from '@apihub/routes/EventBusProvider'
import { GROUP_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { WORKSPACES_PAGE_REFERER } from '@apihub/entities/referer-pages-names'
import { toTitleCase } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { PackageDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/Forms/PackageDialogForm'

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
  const [authorization] = useAuthorization()
  const userId = authorization?.user.key

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
