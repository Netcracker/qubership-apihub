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
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { useLocation, useSearchParam } from 'react-use'
import { usePackageVersionContent } from '../../usePackageVersionContent'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_COMPARE_REVISIONS_DIALOG } from '@apihub/routes/EventBusProvider'
import { REVISION_DELIMITER } from '@apihub/entities/versions'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import {
  API_TYPE_SEARCH_PARAM,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { getDefaultApiType } from '@apihub/utils/operation-types'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useAllRevisions } from '@apihub/routes/root/PortalPage/VersionPage/usePagedRevisions'
import type {
  CompareRevisionsDialogData,
  CompareRevisionsDialogFormData,
} from '@netcracker/qubership-apihub-ui-shared/components/CompareRevisionsDialogForm'
import { CompareRevisionsDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/CompareRevisionsDialogForm'
import { useNavigation } from '@apihub/routes/NavigationProvider'
import { useRefSearchParam } from '@apihub/routes/root/PortalPage/useRefSearchParam'

export const CompareRevisionsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_COMPARE_REVISIONS_DIALOG}
      render={props => <CompareRevisionsPopup {...props}/>}
    />
  )
})

const CompareRevisionsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const {
    control,
    setValue,
    onSubmit,
    onSwap,
    isApiTypeFetching,
    isRevisionsLoading,
    originalRevisions,
    changedRevisions,
  } = useDialogData(setOpen)

  return (
    <CompareRevisionsDialogForm
      open={open}
      setOpen={setOpen}
      control={control}
      setValue={setValue}
      onSubmit={onSubmit}
      onSwap={onSwap}
      isApiTypeFetching={isApiTypeFetching}
      isRevisionsLoading={isRevisionsLoading}
      originalRevisions={originalRevisions}
      changedRevisions={changedRevisions}
    />
  )
})

function useDialogData(
  setOpen: (value: boolean) => void,
): CompareRevisionsDialogData {
  const { pathname, search } = useLocation()
  const { navigateToVersionsComparison } = useNavigation()
  const [ref] = useRefSearchParam()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const { packageId: defaultPackageKey, versionId: defaultVersionKey } = useParams()
  const { fullVersion: fullDefaultVersion } = useVersionWithRevision(defaultVersionKey, defaultPackageKey)
  const searchPackageKey = useSearchParam(PACKAGE_SEARCH_PARAM) ?? defaultPackageKey
  const searchVersionKey = useSearchParam(VERSION_SEARCH_PARAM)
  const { fullVersion: fullSearchVersion } = useVersionWithRevision(searchVersionKey!, searchPackageKey!)

  const { data: revisions, hasNextPage } = useAllRevisions({
    packageKey: defaultPackageKey,
    versionKey: fullDefaultVersion,
  })

  const { versionKey: defaultVersion, revisionKey: defaultRevisionKey } = getSplittedVersionKey(fullDefaultVersion)
  const { revisionKey: searchRevisionKey } = getSplittedVersionKey(fullSearchVersion)

  const changedRevisionData = useMemo(() => revisions.find(revision => revision.revision === +defaultRevisionKey), [defaultRevisionKey, revisions])
  const originRevisionData = useMemo(() => revisions.find(revision => revision.revision === +searchRevisionKey), [revisions, searchRevisionKey])

  const defaultValues = useMemo(() => {
    return {
      changedRevision: changedRevisionData ?? null,
      originalRevision: originRevisionData ?? null, // set value while edit
    }
  }, [changedRevisionData, originRevisionData])

  const form = useForm<CompareRevisionsDialogFormData>({ defaultValues })

  useEffect(() => {form.reset(defaultValues) }, [defaultValues, form])

  const { changedRevision, originalRevision } = form.watch()

  const onSwap = useCallback(() => {
    form.reset({
      originalRevision: changedRevision,
      changedRevision: originalRevision,
    })
  }, [changedRevision, form, originalRevision])

  const { refetch, isRefetching } = usePackageVersionContent({
    packageKey: defaultPackageKey,
    versionKey: fullDefaultVersion,
    includeOperations: true,
  })

  const onSubmit = useMemo(() => form.handleSubmit(async ({ originalRevision, changedRevision }) => {
    setBackwardLocation({ ...backwardLocation, fromDocumentsComparison: { pathname: pathname!, search: search! } })
    const originalPackageKey = encodeURIComponent(searchPackageKey ?? '')
    const changedPackageKey = encodeURIComponent(defaultPackageKey ?? '')
    const changedVersionKey = encodeURIComponent(`${defaultVersion}${REVISION_DELIMITER}${changedRevision?.revision}`)
    const originVersionKey = `${defaultVersion}${REVISION_DELIMITER}${originalRevision?.revision}`

    const { data } = await refetch()
    const apiTypes = Object.keys(data?.operationTypes ?? {}) as ApiType[]
    const apiType = getDefaultApiType(apiTypes)

    navigateToVersionsComparison({
      packageKey: changedPackageKey,
      versionKey: changedVersionKey,
      search: {
        [VERSION_SEARCH_PARAM]: { value: originVersionKey },
        [PACKAGE_SEARCH_PARAM]: { value: originalPackageKey !== changedPackageKey ? originalPackageKey : '' },
        [API_TYPE_SEARCH_PARAM]: { value: apiType },
        [REF_SEARCH_PARAM]: { value: ref ?? '' },
      },
    })

    !isRefetching && setOpen(false)
  }), [form, setBackwardLocation, backwardLocation, pathname, search, searchPackageKey, defaultPackageKey, defaultVersion, refetch, navigateToVersionsComparison, ref, isRefetching, setOpen])

  const originalRevisions = useMemo(() => {
    return revisions.filter(revision => revision.revision !== changedRevision?.revision)
  }, [changedRevision?.revision, revisions])

  const changedRevisions = useMemo(() => {
    return revisions.filter(revision => revision.revision !== originalRevision?.revision)
  }, [originalRevision?.revision, revisions])

  return {
    control: form.control,
    setValue: form.setValue,
    onSubmit: onSubmit,
    onSwap: onSwap,
    isApiTypeFetching: false,
    changedRevisions: changedRevisions,
    originalRevisions: originalRevisions,
    isRevisionsLoading: hasNextPage,
  }
}
