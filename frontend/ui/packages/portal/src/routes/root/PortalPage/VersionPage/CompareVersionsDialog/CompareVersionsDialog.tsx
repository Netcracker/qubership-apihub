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

import type { FC, SyntheticEvent } from 'react'
import * as React from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { useEffectOnce, useLocation } from 'react-use'
import { useInvalidatePackageVersions, usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { usePackage } from '../../../usePackage'
import { usePackages } from '../../../usePackages'
import { usePackageVersionContent } from '../../../usePackageVersionContent'
import { generateVersionWithRevision } from './generateVersionWithRevision'
import { useVersionCandidate } from './useVersionCandidate'
import { useNavigation } from '../../../../NavigationProvider'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_COMPARE_VERSIONS_DIALOG } from '@apihub/routes/EventBusProvider'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey, handleVersionsRevision } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  API_TYPE_SEARCH_PARAM,
  PACKAGE_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getDefaultApiType } from '@apihub/utils/operation-types'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type {
  CompareVersionsDialogData,
  CompareVersionsDialogFormData,
} from '@netcracker/qubership-apihub-ui-shared/components/CompareVersionsDialogForm'
import { CompareVersionsDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/CompareVersionsDialogForm'

export const CompareVersionsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_COMPARE_VERSIONS_DIALOG}
      render={props => <CompareVersionsPopup {...props}/>}
    />
  )
})

const CompareVersionsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const [originalPackageInputValue, setOriginalPackageInputValue] = useState('')
  const [changedPackageInputValue, setChangedPackageInputValue] = useState('')

  const [originalPackageVersionInputValue, setOriginalPackageVersionInputValue] = useState('')
  const [changedPackageVersionInputValue, setChangedPackageVersionInputValue] = useState('')

  const {
    control,
    setValue,
    workspaces,
    originalPackageOptions,
    changedPackageOptions,
    originalVersionOptions,
    changedVersionOptions,
    onSubmit,
    onSwap,
    isApiTypeFetching,
    isOriginalPackagesLoading,
    isChangedPackagesLoading,
    isOriginalPackageVersionsLoading,
    isChangedPackageVersionsLoading,
    isDefaultOriginalPackageLoading,
    isDashboard,
    arePackagesDifferent,
  } = useDialogData(setOpen, originalPackageInputValue, changedPackageInputValue, originalPackageVersionInputValue, changedPackageVersionInputValue)

  const onOriginalPackageInputChange = useCallback((event: SyntheticEvent, value: string) => setOriginalPackageInputValue(value), [])
  const onChangedPackageInputChange = useCallback((event: SyntheticEvent, value: string) => setChangedPackageInputValue(value), [])

  const onOriginalPackageVersionInputChange = useCallback((event: SyntheticEvent, value: string) => setOriginalPackageVersionInputValue(value), [])
  const onChangedPackageVersionInputChange = useCallback((event: SyntheticEvent, value: string) => setChangedPackageVersionInputValue(value), [])

  return (
    <CompareVersionsDialogForm
      open={open}
      setOpen={setOpen}
      control={control}
      setValue={setValue}
      workspaces={workspaces}
      originalPackageOptions={originalPackageOptions}
      changedPackageOptions={changedPackageOptions}
      originalVersionOptions={originalVersionOptions}
      changedVersionOptions={changedVersionOptions}
      onSubmit={onSubmit}
      onSwap={onSwap}
      isApiTypeFetching={isApiTypeFetching}
      isOriginalPackagesLoading={isOriginalPackagesLoading}
      isChangedPackagesLoading={isChangedPackagesLoading}
      isDashboard={isDashboard}
      onOriginalPackageInputChange={onOriginalPackageInputChange}
      onChangedPackageInputChange={onChangedPackageInputChange}
      onOriginalPackageVersionInputChange={onOriginalPackageVersionInputChange}
      onChangedPackageVersionInputChange={onChangedPackageVersionInputChange}
      isOriginalPackageVersionsLoading={isOriginalPackageVersionsLoading}
      isChangedPackageVersionsLoading={isChangedPackageVersionsLoading}
      isDefaultOriginalPackageLoading={isDefaultOriginalPackageLoading}
      arePackagesDifferent={arePackagesDifferent}
    />
  )
})

function useDialogData(
  setOpen: (value: boolean) => void,
  originalPackageInputValue: string,
  changedPackageInputValue: string,
  originalPackageVersionInputValue: string,
  changedPackageVersionInputValue: string,
): CompareVersionsDialogData {
  const { pathname, search } = useLocation()
  const { navigateToVersionsComparison } = useNavigation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  // TODO: Need to move it outside
  const invalidatePackageVersions = useInvalidatePackageVersions()
  useEffectOnce(() => invalidatePackageVersions())

  const { packageId: defaultPackageKey, versionId: defaultVersionKey } = useParams()
  const searchPackageKey = useSearchParam(PACKAGE_SEARCH_PARAM) ?? defaultPackageKey
  const searchVersionKey = useSearchParam(VERSION_SEARCH_PARAM)

  const [defaultWorkspacePackage, isDefaultWorkspacePackageLoading] = usePackage({
    packageKey: defaultPackageKey,
    showParents: true,
  })
  const [searchWorkspacePackage, isSearchWorkspacePackageLoading] = usePackage({
    packageKey: searchPackageKey,
    showParents: true,
  })

  const [workspaces, isWorkspacesLoading] = usePackages({ kind: WORKSPACE_KIND })

  const defaultWorkspace = useMemo(() => {
    if (!isWorkspacesLoading && !isDefaultWorkspacePackageLoading && workspaces && defaultWorkspacePackage) {
      const searchItem = defaultWorkspacePackage.parents?.find(item => item.kind === WORKSPACE_KIND)
      return workspaces.find(item => item.key === searchItem?.key) ?? null
    }
    return null
  }, [defaultWorkspacePackage, workspaces, isDefaultWorkspacePackageLoading, isWorkspacesLoading])

  const searchWorkspace = useMemo(() => {
    if (!isWorkspacesLoading && !isSearchWorkspacePackageLoading && workspaces && searchWorkspacePackage) {
      const searchItem = searchWorkspacePackage.parents?.find(item => item.kind === WORKSPACE_KIND)
      return workspaces.find(item => item.key === searchItem?.key) ?? null
    }
    return null
  }, [isWorkspacesLoading, isSearchWorkspacePackageLoading, workspaces, searchWorkspacePackage])

  const { versionContent: defaultVersionContent } = usePackageVersionContent({
    packageKey: defaultPackageKey,
    versionKey: defaultVersionKey,
  })

  const isDefaultVersionWithLatestRevision = defaultVersionContent?.latestRevision
  const defaultVersion = useVersionCandidate({
    packageKey: defaultPackageKey,
    versionKey: defaultVersionKey,
    versionContent: defaultVersionContent,
  })

  const { versionContent: searchVersionContent } = usePackageVersionContent({
    packageKey: searchPackageKey,
    versionKey: searchVersionKey,
  })

  const isSearchVersionWithLatestRevision = searchVersionContent?.latestRevision
  const searchVersion = useVersionCandidate({
    packageKey: searchPackageKey,
    versionKey: searchVersionKey,
    versionContent: searchVersionContent,
  })

  // defaults for initial values
  const [defaultChangedPackage] = usePackage({
    packageKey: defaultPackageKey,
  })
  const [defaultOriginalPackage, isDefaultOriginalPackageLoading] = usePackage({
    packageKey: searchPackageKey,
  })

  const defaultValues = useMemo(() => {
    return {
      originalWorkspace: searchWorkspace ?? defaultWorkspace ?? null,
      changedWorkspace: defaultWorkspace ?? null,
      originalPackage: defaultOriginalPackage ?? null,
      changedPackage: defaultChangedPackage ?? null,
      originalVersion: searchVersion ?? null,
      changedVersion: defaultVersion ?? null,
    }
  }, [searchWorkspace, defaultWorkspace, defaultOriginalPackage, defaultChangedPackage, searchVersion, defaultVersion])

  const form = useForm<CompareVersionsDialogFormData>({ defaultValues })
  const {
    originalWorkspace,
    changedWorkspace,
    originalPackage,
    changedPackage,
    originalVersion,
    changedVersion,
  } = form.watch()

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const onSwap = useCallback(() => {
    const {
      originalWorkspace,
      changedWorkspace,
      originalPackage,
      changedPackage,
      originalVersion,
      changedVersion,
    } = form.getValues()
    form.reset({
      originalWorkspace: changedWorkspace,
      changedWorkspace: originalWorkspace,
      originalPackage: changedPackage,
      changedPackage: originalPackage,
      originalVersion: changedVersion,
      changedVersion: originalVersion,
    })
  }, [form])

  const { refetch, isRefetching } = usePackageVersionContent({
    packageKey: changedPackage?.key,
    versionKey: changedVersion?.key,
    includeOperations: true,
  })

  const onSubmit = useMemo(() => form.handleSubmit(async ({
    originalPackage,
    changedPackage,
    originalVersion,
    changedVersion,
  }) => {
    setBackwardLocation({ ...backwardLocation, fromDocumentsComparison: { pathname: pathname!, search: search! } })
    const { versionKey: splittedOriginalVersionKey } = getSplittedVersionKey(originalVersion!.key, originalVersion?.latestRevision)
    const { versionKey: splittedChangedVersionKey } = getSplittedVersionKey(changedVersion!.key, changedVersion?.latestRevision)
    const { data } = await refetch()
    const apiTypes = Object.keys(data?.operationTypes ?? {}) as ApiType[]
    const apiType = getDefaultApiType(apiTypes)

    navigateToVersionsComparison({
      packageKey: changedPackage!.key,
      versionKey: splittedChangedVersionKey,
      search: {
        [VERSION_SEARCH_PARAM]: { value: splittedOriginalVersionKey },
        [PACKAGE_SEARCH_PARAM]: { value: originalPackage!.key !== changedPackage!.key ? originalPackage!.key : '' },
        [API_TYPE_SEARCH_PARAM]: { value: apiType },
      },
    })

    !isRefetching && setOpen(false)
  }), [form, setBackwardLocation, backwardLocation, pathname, search, refetch, isRefetching, navigateToVersionsComparison, setOpen])

  const optionsKind: PackageKind | PackageKind[] = useMemo(() => {
    if (!originalPackage && !changedPackage) {
      return [PACKAGE_KIND, DASHBOARD_KIND]
    }

    return [originalPackage?.kind, changedPackage?.kind].includes(DASHBOARD_KIND)
      ? DASHBOARD_KIND
      : PACKAGE_KIND
  }, [originalPackage, changedPackage])

  const [originalPackages, isOriginalPackagesLoading] = usePackages({
    kind: optionsKind,
    limit: 100,
    parentId: originalWorkspace?.key,
    showAllDescendants: true,
    textFilter: originalPackageInputValue,
  })
  const [changedPackages, isChangedPackagesLoading] = usePackages({
    kind: optionsKind,
    limit: 100,
    parentId: changedWorkspace?.key,
    showAllDescendants: true,
    textFilter: changedPackageInputValue,
  })

  const [originalVersions, isOriginalPackageVersionsLoading] = usePackageVersions({
    packageKey: originalPackage?.key,
    textFilter: originalPackageVersionInputValue,
  })
  const [changedVersions, isChangedPackageVersionsLoading] = usePackageVersions({
    packageKey: changedPackage?.key,
    textFilter: changedPackageVersionInputValue,
  })

  const originalVersionOptions = useMemo(() => {
    const searchVersionWithRevision = generateVersionWithRevision(searchVersionContent)
    const handledVersions = handleVersionsRevision(originalVersions)
    const { versionKey: changedVersionKey } = getSplittedVersionKey(changedVersion?.key, changedVersion?.latestRevision)
    const content = (searchVersionWithRevision && !isSearchVersionWithLatestRevision)
      ? [searchVersionWithRevision, ...handledVersions]
      : handledVersions

    return originalPackage?.key === changedPackage?.key
      ? content.filter(({ key }) => key !== changedVersionKey)
      : content
  }, [searchVersionContent, originalVersions, changedVersion?.key, changedVersion?.latestRevision, isSearchVersionWithLatestRevision, originalPackage?.key, changedPackage?.key])

  const changedVersionOptions = useMemo(() => {
    const defaultVersionWithRevision = generateVersionWithRevision(defaultVersionContent)
    const handledVersions = handleVersionsRevision(changedVersions)
    const { versionKey: originalVersionKey } = getSplittedVersionKey(originalVersion?.key, originalVersion?.latestRevision)
    const content = (defaultVersionWithRevision && !isDefaultVersionWithLatestRevision)
      ? [defaultVersionWithRevision, ...handledVersions]
      : handledVersions

    return originalPackage?.key === changedPackage?.key
      ? content.filter(({ key }) => key !== originalVersionKey)
      : content
  }, [defaultVersionContent, changedVersions, originalVersion?.key, originalVersion?.latestRevision, isDefaultVersionWithLatestRevision, originalPackage?.key, changedPackage?.key])

  const isDashboard = defaultOriginalPackage?.kind === DASHBOARD_KIND
  const arePackagesDifferent = defaultOriginalPackage?.key !== defaultChangedPackage?.key

  return {
    control: form.control,
    setValue: form.setValue,
    workspaces: workspaces,
    originalPackageOptions: originalPackages,
    changedPackageOptions: changedPackages,
    originalVersionOptions: originalVersionOptions,
    changedVersionOptions: changedVersionOptions,
    onSubmit: onSubmit,
    onSwap: onSwap,
    isApiTypeFetching: false,
    isOriginalPackagesLoading: isOriginalPackagesLoading,
    isChangedPackagesLoading: isChangedPackagesLoading,
    isOriginalPackageVersionsLoading: isOriginalPackageVersionsLoading,
    isChangedPackageVersionsLoading: isChangedPackageVersionsLoading,
    isDefaultOriginalPackageLoading: isDefaultOriginalPackageLoading,
    isDashboard: isDashboard,
    arePackagesDifferent: arePackagesDifferent,
  }
}
