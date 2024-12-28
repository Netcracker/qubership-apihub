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
import React, { memo, useMemo } from 'react'
import { Box, Tooltip, Typography } from '@mui/material'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  BREAKING_CHANGE_SEVERITY,
  DEFAULT_CHANGE_SEVERITY_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { NumberOfImpactedOperations } from '@netcracker/qubership-apihub-ui-shared/entities/version-contents'
import { CATEGORY_OPERATION } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import { DefaultWarningIcon } from '@netcracker/qubership-apihub-ui-shared/icons/WarningIcon'
import { API_AUDIENCE_EXTERNAL, API_AUDIENCE_INTERNAL, API_AUDIENCE_UNKNOWN, type ApiAudienceTransition } from '@netcracker/qubership-apihub-api-processor'

export type OperationTypeChangesProps = Readonly<{
  apiType: ApiType
  operationsCount: number
  deprecatedOperationsCount: number
  noBwcOperationsCount: number
  changesSummary: ChangesSummary
  numberOfImpactedOperations: NumberOfImpactedOperations
  internalAudienceOperationsCount: number
  unknownAudienceOperationsCount: number
  apiAudienceTransitions: ApiAudienceTransition[]
}>

export const OperationTypeChanges: FC<OperationTypeChangesProps> = memo<OperationTypeChangesProps>(({
  apiType,
  changesSummary,
  numberOfImpactedOperations,
  operationsCount,
  deprecatedOperationsCount,
  noBwcOperationsCount,
  internalAudienceOperationsCount,
  unknownAudienceOperationsCount,
  apiAudienceTransitions,
}) => {

  const changeCounter = useMemo(() => changesSummary ?? DEFAULT_CHANGE_SEVERITY_MAP, [changesSummary])
  const affectedOperationCounter = useMemo(() => numberOfImpactedOperations ?? DEFAULT_CHANGE_SEVERITY_MAP, [numberOfImpactedOperations])
  const internalAudienceCounter = useMemo(() => {
    return apiAudienceTransitions?.find(({ previousAudience, currentAudience }) => previousAudience === API_AUDIENCE_EXTERNAL && currentAudience === API_AUDIENCE_INTERNAL)?.operationsCount ?? 0
  }, [apiAudienceTransitions])

  const unknownAudienceCounter = useMemo(() => {
    return apiAudienceTransitions?.reduce((counter, { previousAudience, currentAudience, operationsCount }) => {
      if ((previousAudience === API_AUDIENCE_EXTERNAL || previousAudience === API_AUDIENCE_INTERNAL) && currentAudience === API_AUDIENCE_UNKNOWN) {
        return counter + operationsCount
      }
      return counter
    }, 0) ?? 0
  }, [apiAudienceTransitions])

  const operationsGridTemplateAreas = useMemo(() => {
    let gridTemplateAreas = `
      'title empty'
      'operationCountTitle operationCount'
      'deprecatedCountTitle deprecatedCount'
      'noBwcCountTitle noBwcCount'
    `
    if (internalAudienceOperationsCount !== 0) {
      gridTemplateAreas += '\'internalAudienceTitle internalAudienceCount\''
    }
    if (unknownAudienceOperationsCount !== 0) {
      gridTemplateAreas += '\'unknownAudienceTitle unknownAudienceCount\''
    }
    return gridTemplateAreas
  }, [internalAudienceOperationsCount, unknownAudienceOperationsCount])

  return (
    <Box mt={4} data-testid={`ValidationsContent-${apiType}`}>
      <Box display="flex">
        <Box
          sx={{
            ...OPERATION_TYPE_SUMMARY_STYLE,
            gridTemplateAreas: operationsGridTemplateAreas,
          }}
        >
          <Typography sx={{ gridAria: 'title' }} variant="subtitle1">
            {`${API_TYPE_TITLE_MAP[apiType]} Operations`}
          </Typography>
          <Typography sx={{ gridArea: 'operationCountTitle' }} variant="subtitle2">
            Total number of operations
          </Typography>
          <Typography sx={{ gridArea: 'operationCount' }} variant="body2" data-testid="NumberOfOperationsTypography">
            {operationsCount}
          </Typography>

          <Typography sx={{ gridArea: 'deprecatedCountTitle' }} variant="subtitle2">
            Number of deprecated operations
          </Typography>
          <Typography
            sx={{ gridArea: 'deprecatedCount' }}
            variant="body2"
            data-testid="NumberOfDeprecatedOperationsTypography"
          >
            {deprecatedOperationsCount}
          </Typography>

          <Typography sx={{ gridArea: 'noBwcCountTitle' }} variant="subtitle2">
            Number of no-BWC operations
          </Typography>
          <Typography
            sx={{ gridArea: 'noBwcCount' }}
            variant="body2"
            data-testid="NumberOfNoBwcOperationsTypography"
          >
            {noBwcOperationsCount}
          </Typography>

          {internalAudienceOperationsCount !== 0 && (
            <>
              <Typography sx={{ gridArea: 'internalAudienceTitle' }} variant="subtitle2">
                Number of operations for internal audience
              </Typography>
              <Typography
                sx={{ gridArea: 'internalAudienceCount' }}
                variant="body2"
              >
                <Box display="flex">
                  {internalAudienceOperationsCount}
                  {internalAudienceCounter !== 0 && (
                    <Tooltip title={`API audience changed from external to internal for ${internalAudienceCounter} operations`}>
                      <Box><DefaultWarningIcon /></Box>
                    </Tooltip>
                  )}
                </Box>
              </Typography>
            </>
          )}
          {unknownAudienceOperationsCount !== 0 && (
            <>
              <Typography sx={{ gridArea: 'unknownAudienceTitle' }} variant="subtitle2">
                Number of operations for unknown audience
              </Typography>
              <Typography
                sx={{ gridArea: 'unknownAudienceCount' }}
                variant="body2"
              >
                <Box display="flex">
                  {unknownAudienceOperationsCount}
                  {unknownAudienceCounter !== 0 && (
                    <Tooltip title={`API audience changed from external/internal to unknown for ${unknownAudienceCounter} operations`}>
                      <Box><DefaultWarningIcon /></Box>
                    </Tooltip>
                  )}
                </Box>
              </Typography>
            </>
          )}
        </Box>
        <Box
          sx={{
            ...OPERATION_TYPE_SUMMARY_STYLE,
            gridTemplateAreas: `
              'title empty'
              'bwcNumberTitle bwcNumber'
              'changesTitle changes'
              'affectedOperationTitle affectedOperation'
            `,
          }}
        >
          <Typography sx={{ gridAria: 'title' }} variant="subtitle1">
            {`${API_TYPE_TITLE_MAP[apiType]} Validation`}
          </Typography>
          <Typography sx={{ gridArea: 'bwcNumberTitle' }} variant="subtitle2">
            Number of BWC errors
          </Typography>
          <Typography sx={{ gridArea: 'bwcNumber' }} variant="body2" data-testid="NumberOfBwcErrorsTypography">
            {changeCounter[BREAKING_CHANGE_SEVERITY]}
          </Typography>

          <Typography sx={{ gridArea: 'changesTitle' }} variant="subtitle2">
            Changes
          </Typography>
          <Box
            sx={{
              gridArea: 'changes',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Changes value={changeCounter} mode="compact" zeroView={true} />
          </Box>

          <Typography sx={{ gridArea: 'affectedOperationTitle' }} variant="subtitle2">
            Number of affected operations
          </Typography>
          <Box
            sx={{
              gridArea: 'affectedOperation',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Changes value={affectedOperationCounter} mode="compact" category={CATEGORY_OPERATION} zeroView={true} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
})

const OPERATION_TYPE_SUMMARY_STYLE = {
  display: 'grid',
  mt: 1,
  mr: 15,
  rowGap: 1,
  columnGap: 5,
  gridTemplateColumns: 'repeat(2, max-content)',
}
