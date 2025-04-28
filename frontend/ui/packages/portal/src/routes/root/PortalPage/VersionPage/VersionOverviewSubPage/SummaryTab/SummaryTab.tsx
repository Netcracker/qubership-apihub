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

import { getOverviewPath } from '@apihub/routes/NavigationProvider'
import { Box, Link, Typography } from '@mui/material'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { PrincipalView } from '@netcracker/qubership-apihub-ui-shared/components/PrincipalView'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import type { FC, ReactNode } from 'react'
import { memo, useMemo } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { OVERVIEW_PAGE, REVISION_HISTORY_PAGE } from '../../../../../../routes'
import { usePackageVersionContent } from '../../../../usePackageVersionContent'
import { OperationTypeChanges } from './OperationTypeChanges'

const SUMMARY_BOX_MARGIN_TOP = 4

const OPERATION_TYPES_ORDER = [API_TYPE_REST, API_TYPE_GRAPHQL]

const PreviousVersion: FC<Partial<{
  packageKey: PackageKey
  versionKey: VersionKey
}>> = ({ packageKey, versionKey }) => {
  let link: ReactNode | undefined
  if (packageKey && versionKey) {
    link = (
      <Link
        component={NavLink}
        to={getOverviewPath({ packageKey, versionKey })}
      >
        {versionKey}
      </Link>
    )
  }
  return (
    <Typography
      sx={{ gridArea: 'previousVersion' }}
      variant="body2"
      data-testid="PreviousVersionTypography"
    >
      {link ?? '-'}
    </Typography>
  )
}

export const SummaryTab: FC = memo(() => {
  const { packageId, versionId } = useParams()
  const { versionContent, isLoading } = usePackageVersionContent({
    packageKey: packageId,
    versionKey: versionId,
    includeSummary: true,
  })
  const {
    operationTypes,
    versionLabels,
    previousVersion,
    previousVersionPackageId,
    createdBy,
    createdAt,
    latestRevision,
    revisionsCount,
  } = versionContent ?? {}
  const { versionKey: splittedVersionKey } = getSplittedVersionKey(versionId, latestRevision)
  const { versionKey: previousVersionKey } = getSplittedVersionKey(previousVersion)

  const sortedOperationTypes = useMemo(() => {
    return operationTypes
      ? Object.values(operationTypes)
        .sort(({ apiType: apiType1 }, { apiType: apiType2 }) => {
          return OPERATION_TYPES_ORDER.indexOf(apiType1) - OPERATION_TYPES_ORDER.indexOf(apiType2)
        })
      : []
  }, [operationTypes])

  if (isLoading) {
    return (
      <LoadingIndicator />
    )
  }

  return (
    <Box>
      {versionLabels && (
        <Box display="flex" gap={1} alignItems="center" width="100%">
          <Box sx={{ whiteSpace: 'break-spaces', width: 'calc(100% - 60px)' }} data-testid="VersionLabels">
            {versionLabels?.map(label => (
              <CustomChip
                sx={{ mr: 1, mt: 0.5 }}
                key={`summary-tab-custom-chip-${label}`}
                value={label}
                label={
                  <OverflowTooltip title={label}>
                    <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </Box>
                  </OverflowTooltip>
                }
              />
            ))}
          </Box>
        </Box>
      )}
      <Box mt={SUMMARY_BOX_MARGIN_TOP}>
        <Typography variant="subtitle1">Version summary</Typography>
        <Box
          sx={{
            display: 'grid',
            mt: 1,
            rowGap: 1,
            columnGap: 5,
            gridTemplateRows: 'repeat(3, max-content)',
            gridTemplateColumns: 'repeat(4, max-content)',
            gridTemplateAreas: `
              'versionTitle          version           publishedByTitle      publishedBy'
              'revisionsCountTitle   revisionsCount    publicationDateTitle  publicationDate'
              'previousVersionTitle  previousVersion   previousVersion       previousVersion'
            `,
          }}
        >
          <Typography sx={{ gridArea: 'versionTitle' }} variant="subtitle2">
            Current version
          </Typography>
          <Typography sx={{ gridArea: 'version' }} variant="body2" data-testid="CurrentVersionTypography">
            {splittedVersionKey}
          </Typography>

          <Typography sx={{ gridArea: 'revisionsCountTitle' }} variant="subtitle2">
            Revisions Count
          </Typography>
          <Typography sx={{ gridArea: 'revisionsCount' }} variant="body2" data-testid="RevisionTypography">
            <Link
              component={NavLink}
              to={{
                pathname: `./${OVERVIEW_PAGE}/${REVISION_HISTORY_PAGE}`,
              }}
            >
              {revisionsCount}
            </Link>
          </Typography>

          <Typography sx={{ gridArea: 'previousVersionTitle' }} variant="subtitle2">
            Previous version
          </Typography>
          <PreviousVersion
            packageKey={previousVersionPackageId ?? packageId}
            versionKey={previousVersionKey}
          />

          <Typography sx={{ gridArea: 'publishedByTitle' }} variant="subtitle2">
            Published by
          </Typography>
          <Typography sx={{ gridArea: 'publishedBy' }} variant="body2" data-testid="PublishedByTypography">
            <PrincipalView value={createdBy} />
          </Typography>

          <Typography sx={{ gridArea: 'publicationDateTitle' }} variant="subtitle2">
            Publication Date
          </Typography>
          <Typography sx={{ gridArea: 'publicationDate' }} variant="body2" data-testid="PublicationDateTypography">
            <FormattedDate value={createdAt} />
          </Typography>
        </Box>
      </Box>
      {sortedOperationTypes
        .map(({ apiType, changesSummary, numberOfImpactedOperations, operationsCount, deprecatedCount, noBwcOperationsCount, internalAudienceOperationsCount, unknownAudienceOperationsCount, apiAudienceTransitions }) =>
          <OperationTypeChanges
            key={apiType}
            apiType={apiType}
            changesSummary={changesSummary}
            numberOfImpactedOperations={numberOfImpactedOperations}
            operationsCount={operationsCount}
            deprecatedOperationsCount={deprecatedCount}
            noBwcOperationsCount={noBwcOperationsCount}
            internalAudienceOperationsCount={internalAudienceOperationsCount}
            unknownAudienceOperationsCount={unknownAudienceOperationsCount}
            apiAudienceTransitions={apiAudienceTransitions}
          />,
        )
      }
    </Box>
  )
})
