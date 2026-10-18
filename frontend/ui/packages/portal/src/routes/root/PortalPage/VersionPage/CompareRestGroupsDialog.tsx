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
import { useLocation } from 'react-use'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useOperationGroups } from './useOperationGroups'
import { useRefSearchParam } from '../useRefSearchParam'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_COMPARE_REST_GROUPS_DIALOG } from '@apihub/routes/EventBusProvider'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import {
  GROUP_SEARCH_PARAM,
  optionalSearchParams,
  REF_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type {
  CompareRestGroupsDialogData,
  CompareRestGroupsDialogFormData,
} from '@netcracker/qubership-apihub-ui-shared/components/CompareRestGroupsDialogForm'
import { CompareRestGroupsDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/CompareRestGroupsDialogForm'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

export const CompareRestGroupsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_COMPARE_REST_GROUPS_DIALOG}
      render={props => <CompareRestGroupsPopup {...props}/>}
    />
  )
})

const CompareRestGroupsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const [originalInputValue, setOriginalInputValue] = useState('')
  const [changedInputValue, setChangedInputValue] = useState('')

  const {
    control,
    originalGroupOptions,
    changedGroupOptions,
    onSwap,
    onSubmit,
    isLoadingOriginalGroup,
    isLoadingChangedGroup,
  } = useData(setOpen, originalInputValue, changedInputValue)

  const onOriginalInputChange = useCallback((event: SyntheticEvent, value: string) => setOriginalInputValue(value), [])
  const onChangedInputChange = useCallback((event: SyntheticEvent, value: string) => setChangedInputValue(value), [])

  return <CompareRestGroupsDialogForm
    open={open}
    setOpen={setOpen}
    control={control}
    originalGroupOptions={originalGroupOptions}
    changedGroupOptions={changedGroupOptions}
    onSwap={onSwap}
    onSubmit={onSubmit}
    isLoadingOriginalGroup={isLoadingOriginalGroup}
    isLoadingChangedGroup={isLoadingChangedGroup}
    onOriginalInputChange={onOriginalInputChange}
    onChangedInputChange={onChangedInputChange}
  />
})

function useData(
  setOpen: (value: boolean) => void,
  originalInputValue: string,
  changedInputValue: string,
): CompareRestGroupsDialogData {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const { packageId: defaultPackageKey, versionId: defaultVersionKey, group: currentGroup } = useParams()
  const previousGroup = useSearchParam(GROUP_SEARCH_PARAM)

  const [originalOperationGroups, isLoadingOriginalOperationGroup] = useOperationGroups({
    packageKey: defaultPackageKey!,
    version: defaultVersionKey!,
  })

  const [changedOperationGroups, isLoadingChangedOperationGroup] = useOperationGroups({
    packageKey: defaultPackageKey!,
    version: defaultVersionKey!,
  })

  const [ref] = useRefSearchParam()

  const currentGroupObject = useMemo(() => originalOperationGroups.find(({ groupName }) => groupName === currentGroup), [currentGroup, originalOperationGroups])
  const previousGroupObject = useMemo(() => changedOperationGroups.find(({ groupName }) => groupName === previousGroup), [changedOperationGroups, previousGroup])

  const defaultValues = useMemo(() => ({
    originalGroup: previousGroupObject || null,
    changedGroup: currentGroupObject || null,
  }), [currentGroupObject, previousGroupObject])

  const form = useForm<CompareRestGroupsDialogFormData>({ defaultValues })

  useEffect(() => {
    form.reset(defaultValues)
  }, [form, defaultValues])

  const onSwap = useCallback(() => {
    const { originalGroup, changedGroup } = form.getValues()

    form.reset({
      originalGroup: changedGroup,
      changedGroup: originalGroup,
    })
  }, [form])

  const onSubmit = useMemo(() => form.handleSubmit(({ originalGroup, changedGroup }) => {

    const searchParams = optionalSearchParams({
      [GROUP_SEARCH_PARAM]: { value: originalGroup?.groupName },
      [REF_SEARCH_PARAM]: { value: ref ?? '' },
    })

    setBackwardLocation({ ...backwardLocation, fromOperationsComparison: { pathname: pathname!, search: search! } })
    navigate({
      pathname: `/portal/packages/${defaultPackageKey}/${defaultVersionKey}/groups/${encodeURIComponent(changedGroup?.groupName ?? '')}/compare`,
      search: `${searchParams}`,
    })

    setTimeout(() => setOpen(false), 1000)
  }), [form, ref, setBackwardLocation, backwardLocation, pathname, search, navigate, defaultPackageKey, defaultVersionKey, setOpen])

  const { originalGroup, changedGroup } = form.watch()

  const originalGroupOptions = useMemo(() => {
    return originalOperationGroups.filter(({ groupName }) => groupName !== changedGroup?.groupName &&
      (originalInputValue ? groupName.includes(originalInputValue) : true))
  }, [originalOperationGroups, changedGroup?.groupName, originalInputValue])

  const changedGroupOptions = useMemo(() => {
    return changedOperationGroups.filter(({ groupName }) => groupName !== originalGroup?.groupName &&
      (changedInputValue ? groupName.includes(changedInputValue) : true))
  }, [changedInputValue, changedOperationGroups, originalGroup?.groupName])

  return {
    control: form.control,
    originalGroupOptions: originalGroupOptions,
    changedGroupOptions: changedGroupOptions,
    onSwap: onSwap,
    onSubmit: onSubmit,
    isLoadingOriginalGroup: isLoadingOriginalOperationGroup,
    isLoadingChangedGroup: isLoadingChangedOperationGroup,
  }
}
