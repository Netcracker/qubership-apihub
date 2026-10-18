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
import { useParams } from 'react-router-dom'
import { useOperations } from './useOperations'
import { useOperationLocation } from './useOperationLocation'
import { usePackageParamsWithRef } from '../usePackageParamsWithRef'
import { useOperation } from './useOperation'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { useNavigation } from '../../../NavigationProvider'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_COMPARE_OPERATIONS_DIALOG } from '@apihub/routes/EventBusProvider'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { OPERATION_SEARCH_PARAM, REF_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { CompareOperationPathsDialogData } from '@netcracker/qubership-apihub-ui-shared/components/CompareOperationPathsForm'
import { CompareOperationPathsDialogForm } from '@netcracker/qubership-apihub-ui-shared/components/CompareOperationPathsForm'

export const CompareOperationPathsDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_COMPARE_OPERATIONS_DIALOG}
      render={props => <CompareOperationPathsPopup {...props}/>}
    />
  )
})

const CompareOperationPathsPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const [originalInputValue, setOriginalInputValue] = useState('')
  const [changedInputValue, setChangedInputValue] = useState('')

  const {
    control,
    originalOperationOptions,
    changedOperationOptions,
    onSwap,
    onSubmit,
    isOriginalOperationsLoading,
    isChangedOperationsLoading,
  } = useData(setOpen, originalInputValue, changedInputValue)

  const onOriginalInputChange = useCallback((event: SyntheticEvent, value: string) => setOriginalInputValue(value), [])
  const onChangedInputChange = useCallback((event: SyntheticEvent, value: string) => setChangedInputValue(value), [])

  return <CompareOperationPathsDialogForm
    open={open}
    setOpen={setOpen}
    control={control}
    originalOperationOptions={originalOperationOptions}
    changedOperationOptions={changedOperationOptions}
    onSwap={onSwap}
    onSubmit={onSubmit}
    isOriginalOperationsLoading={isOriginalOperationsLoading}
    isChangedOperationsLoading={isChangedOperationsLoading}
    onOriginalInputChange={onOriginalInputChange}
    onChangedInputChange={onChangedInputChange}
  />
})

//todo need retest (without nested value)
type FormData = {
  originalOperation: OperationData | null
  changedOperation: OperationData | null
}

function useData(
  setOpen: (value: boolean) => void,
  originalInputValue: string,
  changedInputValue: string,
): CompareOperationPathsDialogData {
  const { pathname, search } = useLocation()
  const { navigateToOperationsComparison } = useNavigation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const {
    packageId: defaultPackageKey,
    versionId,
    operationId: defaultOperationKey,
    apiType,
  } = useParams()
  const { fullVersion: defaultVersionKey } = useVersionWithRevision(versionId, defaultPackageKey)

  const [operationPackageKey, operationVersionKey] = usePackageParamsWithRef()
  const { operationKey: originalOperationKey } = useOperationLocation()
  const { fullVersion: version } = useVersionWithRevision(operationVersionKey, operationPackageKey)

  const [originalOperations, isOriginalOperationsLoading] = useOperations({
    packageKey: operationPackageKey,
    versionKey: version,
    apiType: apiType as ApiType,
    textFilter: originalInputValue,
  })
  const [changedOperations, isChangedOperationsLoading] = useOperations({
    packageKey: operationPackageKey,
    versionKey: version,
    apiType: apiType as ApiType,
    textFilter: changedInputValue,
  })

  // defaults for initial values
  const { data: defaultChangedOperation } = useOperation({
    packageKey: operationPackageKey,
    versionKey: version,
    operationKey: defaultOperationKey,
    apiType: apiType as ApiType,
  })
  const { data: defaultOriginalOperation } = useOperation({
    packageKey: operationPackageKey,
    versionKey: version,
    operationKey: originalOperationKey,
    apiType: apiType as ApiType,
  })

  const ref = useSearchParam(REF_SEARCH_PARAM)

  const defaultValues = useMemo(() => ({
    originalOperation: defaultOriginalOperation ?? null,
    changedOperation: defaultChangedOperation ?? null,
  }), [defaultChangedOperation, defaultOriginalOperation])

  const form = useForm<FormData>({ defaultValues })

  useEffect(() => {
    form.reset(defaultValues)
  }, [form, defaultValues])

  const onSwap = useCallback(() => {
    const { originalOperation, changedOperation } = form.getValues()

    form.reset({
      originalOperation: changedOperation,
      changedOperation: originalOperation,
    })
  }, [form])

  const onSubmit = useMemo(() => form.handleSubmit(({ originalOperation, changedOperation }) => {
    setBackwardLocation({ ...backwardLocation, fromOperationsComparison: { pathname: pathname!, search: search! } })
    navigateToOperationsComparison({
      packageKey: defaultPackageKey!,
      versionKey: defaultVersionKey!,
      apiType: apiType as ApiType,
      operationKey: changedOperation!.operationKey,
      search: {
        [OPERATION_SEARCH_PARAM]: { value: originalOperation!.operationKey },
        [REF_SEARCH_PARAM]: { value: ref ?? '' },
      },
    })

    setTimeout(() => setOpen(false), 1000)
  }), [form, ref, setBackwardLocation, backwardLocation, pathname, search, navigateToOperationsComparison, defaultPackageKey, defaultVersionKey, apiType, setOpen])

  const { originalOperation, changedOperation } = form.watch()

  const originalOperationOptions = useMemo(() => {
    return originalOperations.filter(({ operationKey }) => operationKey !== changedOperation?.operationKey)
  }, [originalOperations, changedOperation])

  const changedOperationOptions = useMemo(() => {
    return changedOperations.filter(({ operationKey }) => operationKey !== originalOperation?.operationKey)
  }, [changedOperations, originalOperation])

  return {
    control: form.control,
    originalOperationOptions: originalOperationOptions,
    changedOperationOptions: changedOperationOptions,
    onSwap: onSwap,
    onSubmit: onSubmit,
    isOriginalOperationsLoading: isOriginalOperationsLoading,
    isChangedOperationsLoading: isChangedOperationsLoading,
  }
}
