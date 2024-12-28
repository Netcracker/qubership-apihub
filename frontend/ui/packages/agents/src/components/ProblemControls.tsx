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

import type { Dispatch, FC, SetStateAction } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { Box, ToggleButton, Typography } from '@mui/material'

import { useSnapshotPublicationInfo } from '../routes/root/NamespacePage/useSnapshotPublicationInfo'
import type {
  ValidationFilter,
} from '../routes/root/NamespacePage/ServicesPage/ServicesPageBody/ValidationResultsStep/ValidationResultsStep'
import {
  BWC_ERRORS_FILTER,
  NO_BASELINE_FILTER,
  NO_BWC_ERRORS_FILTER,
} from '../routes/root/NamespacePage/ServicesPage/ServicesPageBody/ValidationResultsStep/ValidationResultsStep'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import {
  ERROR_STATUS_MARKER_VARIANT,
  StatusMarker,
  SUCCESS_STATUS_MARKER_VARIANT, WARNING_STATUS_MARKER_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/StatusMarker'

export type ProblemsControlsProps = {
  filters: (ValidationFilter | null)[]
  setFilters: Dispatch<SetStateAction<(ValidationFilter | null)[]>>
}

export const ProblemControls: FC<ProblemsControlsProps> = memo<ProblemsControlsProps>(({ filters, setFilters }) => {
  const { snapshotPublicationInfo } = useSnapshotPublicationInfo()
  const { services } = snapshotPublicationInfo

  const withBwcErrorsCount = useMemo(() => services.filter(({
    changeSummary,
    baselineVersionFound,
  }) => baselineVersionFound && changeSummary?.breaking).length, [services])
  const withoutBwcErrorsCount = useMemo(() => services.filter(({
    changeSummary,
    baselineVersionFound,
  }) => baselineVersionFound && changeSummary?.breaking === 0).length, [services])
  const noBaselineCount = useMemo(() => services.filter(({
    baselineFound,
    baselineVersionFound,
  }) => !baselineVersionFound || !baselineFound).length, [services])

  const handleFilterClick = useCallback((value: Array<ValidationFilter | null>): void => {
    setFilters(value)
  }, [setFilters])

  return (
    <Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
      <CustomToggleButtonGroup
        value={filters}
        onClick={handleFilterClick}
      >
        <ToggleButton value={BWC_ERRORS_FILTER} sx={{ gap: 1 }}>
          <StatusMarker
            value={ERROR_STATUS_MARKER_VARIANT}
            title="Services with BWC errors"
            placement="top"
          />
          <Typography fontSize={11}>{withBwcErrorsCount}</Typography>
        </ToggleButton>
        <ToggleButton value={NO_BWC_ERRORS_FILTER} sx={{ gap: 1 }}>
          <StatusMarker
            value={SUCCESS_STATUS_MARKER_VARIANT}
            title="Services without BWC errors"
            placement="top"
          />
          <Typography fontSize={11}>{withoutBwcErrorsCount}</Typography>
        </ToggleButton>
        <ToggleButton value={NO_BASELINE_FILTER} sx={{ gap: 1 }}>
          <StatusMarker
            value={WARNING_STATUS_MARKER_VARIANT}
            title="Services without baseline version"
            placement="top"
          />
          <Typography fontSize={11}>{noBaselineCount}</Typography>
        </ToggleButton>
      </CustomToggleButtonGroup>
    </Box>
  )
})
