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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, debounce, Dialog, DialogContent, DialogTitle } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { PopupLayout } from './PopupLayout'
import { Sidebar } from './Sidebar'
import { useEvent } from 'react-use'
import { OperationList } from './OperationList'
import { usePackageKind } from '../../../../../usePackageKind'
import type { OperationListsDelta, PackageContext } from '../types'
import { useOperationMovedEvent } from '../hooks/useOperationMovedEvent'
import { OPERATION_GROUP_LIMIT } from '../consts'
import { useUpdateOperationGroup } from '../hooks/useUpdateOperationGroup'
import { areFiltersApplied, deepIncludes, intersection } from '../utils'
import { toUpdatingOperations } from '../entities'
import { useRearrangedOperationsByDelta } from '../hooks/useRearrangedOperationsByDelta'
import { useGroupOperationsActualCount } from '../hooks/useGroupOperationsActualCount'
import { useClearExcessivePagedGroupOperations, usePagedGroupOperations } from './usePagedGroupOperations'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { EditOperationGroupContentDetails } from '@apihub/routes/EventBusProvider'
import {
  API_AUDIENCE_SELECTED,
  API_KIND_SELECTED,
  OPERATIONS_ADD_TO_GROUP_ACTION,
  OPERATIONS_REMOVE_FROM_GROUP_ACTION,
  REF_PACKAGE_SELECTED,
  TAG_SELECTED,
} from '@apihub/routes/EventBusProvider'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import type {
  ApiAudience,
  ApiKind,
  Operation,
  Operations,
  OperationsData,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const Popup: FC<PopupProps> = (props) => {
  const { open, setOpen } = props
  const groupContext = props.detail as EditOperationGroupContentDetails
  const {
    packageKey,
    versionKey,
    groupInfo: {
      apiType,
      groupName,
      description,
      operationsCount,
      template,
    },
  } = groupContext

  useEvent(REF_PACKAGE_SELECTED, (e) => {
    const packageKey = e.detail as PackageReference | null
    setSelectedRefPackage(packageKey)
    handleFilterChange()
  })
  useEvent(API_KIND_SELECTED, (e) => {
    const apiKind = e.detail as ApiKind
    setSelectedApiKind(apiKind)
    handleFilterChange()
  })
  useEvent(API_AUDIENCE_SELECTED, (e) => {
    const apiAudience = e.detail as ApiAudience
    setSelectedApiAudience(apiAudience)
    handleFilterChange()
  })
  useEvent(TAG_SELECTED, (e) => {
    const tag = e.detail as string
    setSelectedTag(tag)
    handleFilterChange()
  })

  const [selectedRefPackage, setSelectedRefPackage] = useState<PackageReference | null>()
  const [selectedApiKind, setSelectedApiKind] = useState<ApiKind>()
  const [selectedApiAudience, setSelectedApiAudience] = useState<ApiAudience>()
  const [selectedTag, setSelectedTag] = useState<string>()
  const [operationTextFilter, setOperationTextFilter] = useState<string>()
  const [operationListsDelta, setOperationListsDelta] = useState<OperationListsDelta>([])
  const [allCheckedOperations, setAllCheckedOperations] = useState<Operations>([])
  const [initialGroupOperations, setInitialGroupOperations] = useState<Operations>()

  const filtersApplied = areFiltersApplied({
    selectedRefPackage,
    selectedApiKind,
    selectedApiAudience,
    selectedTag,
    operationTextFilter,
  })

  const [packageKind] = usePackageKind()
  const packageContext: PackageContext = useMemo(() => ({
    isDashboard: packageKind === DASHBOARD_KIND,
    packageKey: packageKey,
    version: versionKey,
    refPackageKey: selectedRefPackage?.key,
    refVersion: selectedRefPackage?.version,
  }), [packageKey, packageKind, selectedRefPackage?.key, selectedRefPackage?.version, versionKey])

  const pagedOperationsHookOptions = useMemo(() => ({
    apiType: apiType,
    packageKey: packageContext.packageKey,
    versionKey: packageContext.version,
    refPackageKey: packageContext.refPackageKey,
    kind: selectedApiKind,
    apiAudience: selectedApiAudience,
    tag: selectedTag,
    textFilter: operationTextFilter,
    excludedGroupName: groupName,
  }), [apiType, groupName, operationTextFilter, packageContext.packageKey, packageContext.refPackageKey, packageContext.version, selectedApiAudience, selectedApiKind, selectedTag])

  const {
    pagedData: pagedOperations,
    loading: operationsLoading,
    fetchNextPage: fetchNextOperationsPage,
    fetchingNextPage: operationsNextPageFetching,
    hasNextPage: hasNextOperationsPage,
  } = usePagedGroupOperations(pagedOperationsHookOptions)

  const {
    pagedData: pagedGroupOperations,
    loading: groupOperationsLoading,
    fetching: groupOperationsFetching,
    fetchNextPage: fetchNextGroupOperationsPage,
    fetchingNextPage: groupOperationsNextPageFetching,
    hasNextPage: hasNextGroupOperationsPage,
  } = usePagedGroupOperations({
    apiType: apiType,
    packageKey: packageContext.packageKey,
    versionKey: packageContext.version,
    refPackageKey: packageContext.refPackageKey,
    kind: selectedApiKind,
    apiAudience: selectedApiAudience,
    tag: selectedTag,
    textFilter: operationTextFilter,
    groupName: groupName,
  })
  // Autoload full group operations list
  useEffect(() => {
    if (!groupOperationsLoading && !groupOperationsFetching && !groupOperationsNextPageFetching) {
      if (hasNextGroupOperationsPage) {
        fetchNextGroupOperationsPage()
      } else if (!filtersApplied) {
        setInitialGroupOperations(pagedGroupOperations.flat())
      }
    }
    // To avoid redundant calls of effect
    // eslint-disable-next-line
  }, [pagedGroupOperations])

  const invalidatePagedGroupOperations = useClearExcessivePagedGroupOperations(pagedOperationsHookOptions)

  const handleFilterChange = useCallback(() => {
    setAllCheckedOperations([])
    invalidatePagedGroupOperations()
  }, [invalidatePagedGroupOperations])

  const operations = useMemo(() => pagedOperations.flat(), [pagedOperations])
  const groupOperations = useMemo(() => pagedGroupOperations.flat(), [pagedGroupOperations])

  const filteredOperations = useRearrangedOperationsByDelta({
    sourceOperations: operations,
    oppositeOperations: groupOperations,
    delta: operationListsDelta,
    excludeFromSourceByAction: OPERATIONS_ADD_TO_GROUP_ACTION,
    includeToDeltaByAction: OPERATIONS_REMOVE_FROM_GROUP_ACTION,
    filtersApplied: filtersApplied,
  }) as OperationsData

  const filteredInitialGroupOperations = useRearrangedOperationsByDelta({
    sourceOperations: initialGroupOperations,
    oppositeOperations: undefined,
    delta: operationListsDelta,
    excludeFromSourceByAction: OPERATIONS_REMOVE_FROM_GROUP_ACTION,
    includeToDeltaByAction: OPERATIONS_ADD_TO_GROUP_ACTION,
    filtersApplied: filtersApplied,
  }) as OperationsData | undefined

  const filteredGroupOperations = useRearrangedOperationsByDelta({
    sourceOperations: groupOperations,
    oppositeOperations: operations,
    delta: operationListsDelta,
    excludeFromSourceByAction: OPERATIONS_REMOVE_FROM_GROUP_ACTION,
    includeToDeltaByAction: OPERATIONS_ADD_TO_GROUP_ACTION,
    filtersApplied: filtersApplied,
  }) as OperationsData

  const checkedOperations = intersection(allCheckedOperations, filteredOperations)
  const checkedGroupOperations = intersection(allCheckedOperations, filteredGroupOperations)

  const groupOperationsActualCount = useGroupOperationsActualCount(operationsCount, operationListsDelta)
  const groupOperationsPossibleCount = groupOperationsActualCount + checkedOperations.length
  const isGroupOperationsPossibleCountExceedsLimit = groupOperationsPossibleCount > OPERATION_GROUP_LIMIT

  const onToggleOperationCheckbox = useCallback((value: Operation) => {
    setAllCheckedOperations((allCheckedOperations) => {
      const currentIndex = allCheckedOperations.findIndex(checkedOperation => value === checkedOperation)
      const newCheckedOperations = [...allCheckedOperations]

      if (currentIndex === -1) {
        newCheckedOperations.push(value)
      } else {
        newCheckedOperations.splice(currentIndex, 1)
      }
      return newCheckedOperations
    })
  }, [])

  const onToggleAllOperationsCheckbox = useCallback((checkedOperations: Operations, operations: Operations) => {
    setAllCheckedOperations((allCheckedOperations) => {
      let newAllCheckedOperations: Operations
      if (isNotEmpty(checkedOperations) && checkedOperations.length === operations.length) {
        newAllCheckedOperations = allCheckedOperations.filter(operation => !deepIncludes(checkedOperations, operation))
      } else {
        newAllCheckedOperations = Array.from(new Set([...allCheckedOperations, ...operations]))
      }
      return newAllCheckedOperations
    })
  }, [])

  useOperationMovedEvent({
    checkedOperations: checkedOperations,
    checkedGroupOperations: checkedGroupOperations,
    operations: operations,
    groupOperations: groupOperations,
    operationListsDelta: operationListsDelta,
    setOperationListsDelta: setOperationListsDelta,
    resetCheckedAllOperations: () => setAllCheckedOperations([]),
  })

  const onClose = useCallback(() => {
    invalidatePagedGroupOperations()
    setOpen(false)
  }, [invalidatePagedGroupOperations, setOpen])

  const {
    mutate: updateOperationGroup,
    isLoading: operationGroupUpdating,
  } = useUpdateOperationGroup(
    groupContext,
    {
      onSuccess: onClose,
    },
  )

  const dialogTitle = `Edit ${groupName} Group of ${API_TYPE_TITLE_MAP[apiType!]} Operations`
  const operationsTitle = `${API_TYPE_TITLE_MAP[apiType!]} Operations`
  const groupOperationsTitle = `Group ${groupName}`
  const allOperationsMovedToTheRight = operationsNextPageFetching && isEmpty(filteredOperations)

  return (
    <Dialog
      fullWidth
      maxWidth={false}
      open={open}
      onClose={onClose}
    >
      <DialogTitle
        sx={{
          '&.MuiDialogTitle-root': {
            padding: 'calc(8px + 8px) 16px 8px 16px',
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <TextWithOverflowTooltip
            variant="h2"
            sx={{
              color: 'black',
              maxWidth: 'calc(100% - 450px)',
            }}
            tooltipText={dialogTitle}
          >
            {dialogTitle}
          </TextWithOverflowTooltip>
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <SearchBar
              placeholder="Search operations"
              onValueChange={debounce(setOperationTextFilter, DEFAULT_DEBOUNCE)}
              data-testid="SearchOperations"
            />
            <LoadingButton
              variant="contained"
              disabled={groupOperationsLoading || groupOperationsFetching || groupOperationsNextPageFetching}
              loading={operationGroupUpdating}
              onClick={() => {
                const updatingOperations = filteredInitialGroupOperations && toUpdatingOperations(filteredInitialGroupOperations)
                if (updatingOperations) {
                  updateOperationGroup({
                    groupName: groupName,
                    description: description,
                    operations: updatingOperations,
                    template: template,
                  })
                }
              }}
              data-testid="SaveButton"
            >
              Save
            </LoadingButton>
            <Button
              variant="outlined"
              onClick={onClose}
              data-testid="CancelButton"
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          width: '100%',
          overflow: 'hidden',
          '&.MuiDialogContent-root': {
            padding: 0,
            lineHeight: 0,
            height: '100vh',
          },
        }}
      >
        <PopupLayout
          navigation={(
            <Sidebar
              apiType={apiType as ApiType}
              selectedRefPackage={selectedRefPackage}
              selectedApiKind={selectedApiKind}
              selectedApiAudience={selectedApiAudience}
              selectedTag={selectedTag}
            />
          )}
          leftHeader={operationsTitle}
          leftBody={(
            <OperationList
              packageContext={packageContext}
              operations={filteredOperations}
              checkedOperations={checkedOperations}
              loading={operationsLoading || allOperationsMovedToTheRight}
              fetchNextPage={fetchNextOperationsPage}
              isNextPageFetching={operationsNextPageFetching}
              hasNextPage={hasNextOperationsPage}
              onToggleOperationCheckbox={onToggleOperationCheckbox}
              onToggleAllOperationsCheckbox={onToggleAllOperationsCheckbox}
            />
          )}
          exchangerParameters={{
            toLeftArrow: {
              disabled: isEmpty(checkedGroupOperations),
            },
            toRightArrow: {
              disabled: isEmpty(checkedOperations) || isGroupOperationsPossibleCountExceedsLimit,
              message: isGroupOperationsPossibleCountExceedsLimit
                ? `You cannot add more than ${OPERATION_GROUP_LIMIT} operations to the group.`
                : undefined,
            },
          }}
          rightHeader={(
            <TextWithOverflowTooltip
              sx={{
                maxWidth: '100%',
              }}
              variant="inherit"
              tooltipText={groupOperationsTitle}
            >
              {groupOperationsTitle}
            </TextWithOverflowTooltip>
          )}
          rightBody={(
            <OperationList
              packageContext={packageContext}
              operations={filteredGroupOperations}
              checkedOperations={checkedGroupOperations}
              loading={groupOperationsLoading}
              onToggleOperationCheckbox={onToggleOperationCheckbox}
              onToggleAllOperationsCheckbox={onToggleAllOperationsCheckbox}
            />
          )}
          rightCount={groupOperationsActualCount}
        />
      </DialogContent>
    </Dialog>
  )
}
