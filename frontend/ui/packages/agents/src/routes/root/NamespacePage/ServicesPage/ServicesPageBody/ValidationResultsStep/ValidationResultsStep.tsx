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
import { memo, useEffect, useMemo, useState } from 'react'
import { ValidationResultsStepTable } from './ValidationResultsStepTable'
import { useServices } from '../../../useServices'
import { filterServices } from '../../services'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'
import { Box } from '@mui/material'
import type { ServicePublishInfo } from '@apihub/entities/service-publish-info'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  ERROR_STEP_STATUS,
  RUNNING_STEP_STATUS, SUCCESS_STEP_STATUS,
  useValidationResultsStep,
} from '../../ServicesPageProvider/ServicesStepsProvider'
import { ProblemControls } from '../../../../../../components/ProblemControls'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

// TODO: Move to another place
export const BWC_ERRORS_FILTER = 'bwc-errors'
export const NO_BWC_ERRORS_FILTER = 'no-bwc-errors'
export const NO_BASELINE_FILTER = 'no-baseline'

export type ValidationFilter =
  typeof BWC_ERRORS_FILTER
  | typeof NO_BWC_ERRORS_FILTER
  | typeof NO_BASELINE_FILTER

const FILTERED_SERVICES_MAP: Record<ValidationFilter, (value: ServicePublishInfo) => boolean> = {
  [BWC_ERRORS_FILTER]: (value) => value.baselineVersionFound && !!(value?.changeSummary?.breaking),
  [NO_BWC_ERRORS_FILTER]: (value) => value.baselineVersionFound && value?.changeSummary?.breaking === 0,
  [NO_BASELINE_FILTER]: (value) => !value.baselineVersionFound || !value.baselineFound,
}

export const ValidationResultsStep: FC = memo(() => {
  const [{ services }, isServicesLoading] = useServices({ onlyWithSpecs: true })
  const { snapshotPublicationInfo, isLoading: isSnapshotPublicationInfoLoading } = useSnapshotPublicationInfo()
  const isLoading = isServicesLoading || isSnapshotPublicationInfoLoading

  const [searchValue, setSearchValue] = useState('')
  const [filters, setFilters] = useState<(ValidationFilter | null)[]>([])

  const filteredServices = useMemo(
    () => {
      if (isNotEmpty(filters)) {
        return filterServices(searchValue, services).filter(({ key: serviceKey }) => {
          const { services } = snapshotPublicationInfo
          const currentService = services.find(({ key }) => key === serviceKey)

          return filters.some(filterItem => {
            return currentService && FILTERED_SERVICES_MAP[filterItem!](currentService)
          })
        })
      }
      return filterServices(searchValue, services)
    },
    [filters, searchValue, services, snapshotPublicationInfo],
  )

  const promotableServices = useMemo(
    () => services
      .filter(service => !!snapshotPublicationInfo.services.find(({ key }) => key === service.key && !!service.baseline)),
    [services, snapshotPublicationInfo.services],
  )

  const [, setValidationResultsStep] = useValidationResultsStep()
  useEffect(() => {
    if (isLoading) {
      setValidationResultsStep(prevState => ({ ...prevState, status: RUNNING_STEP_STATUS }))
    } else {
      const status = isNotEmpty(promotableServices) ? SUCCESS_STEP_STATUS : ERROR_STEP_STATUS
      setValidationResultsStep(prevState => ({ ...prevState, status }))
    }
  }, [isLoading, promotableServices, promotableServices.length, setValidationResultsStep])

  return (
    <>
      <Box sx={{ display: 'flex', alignSelf: 'center', ml: 'auto', pt: 1, gap: 1 }}>
        <ProblemControls filters={filters} setFilters={setFilters}/>
        <SearchBar
          value={searchValue}
          onValueChange={setSearchValue}
        />
      </Box>
      <Placeholder
        invisible={isNotEmpty(filteredServices) || isLoading}
        area={CONTENT_PLACEHOLDER_AREA}
        message={NO_SEARCH_RESULTS}
      >
        <ValidationResultsStepTable value={filteredServices} isLoading={isLoading}/>
      </Placeholder>
    </>
  )
})

