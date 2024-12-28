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
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Box, Card, CardContent, Grid, ListItem, ListItemText, Typography } from '@mui/material'
import { NavLink, useParams } from 'react-router-dom'

import type { ChangeSummary, OperationChangesDto, OperationChangesMetadata } from '@netcracker/qubership-apihub-api-processor'
import { useBackwardLocation } from '../../../useBackwardLocation'
import { useChangesLoadingStatus, useSetChangesLoadingStatus } from '../ChangesLoadingStatusProvider'
import { useChangesSummaryContext } from '../ChangesSummaryProvider'
import { useRefSearchParam } from '../../useRefSearchParam'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { ComparisonSwapper } from '../ComparisonSwapper'
import { useComparisonParams } from '../useComparisonParams'
import { useNavigation } from '../../../../NavigationProvider'
import type {
  GraphQLChangesMetadata,
  RestChangesMetadata,
} from '@netcracker/qubership-apihub-api-processor/dist/cjs/src/types/internal/compare'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  FILTERS_SEARCH_PARAM,
  GROUP_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  TAG_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { filterChangesBySeverity, getMajorSeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { getActionForOperation } from '@apihub/utils/operations'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  ACTION_TYPE_COLOR_MAP,
  ADD_ACTION_TYPE,
  CHANGE_SEVERITIES,
  REMOVE_ACTION_TYPE,
  REPLACE_ACTION_TYPE,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { format } from '@netcracker/qubership-apihub-ui-shared/utils/strings'
import { ChangeSeverityIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityIndicator'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import type { ComparedPackagesBreadcrumbsData } from '../breadcrumbs'

type GroupCompareContentProps = {
  groupChanges: OperationChangesDto[]
  breadcrumbsData: ComparedPackagesBreadcrumbsData | null
}
export const GroupCompareContent: FC<GroupCompareContentProps> = memo(({ groupChanges, breadcrumbsData }) => {
  const { group } = useParams()
  const previousGroup = useSearchParam(GROUP_SEARCH_PARAM)

  const { showCompareRestGroupsDialog } = useEventBus()
  const [selectedTag] = useTagSearchFilter()

  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()

  const {
    originPackageKey,
    originVersionKey,
    changedPackageKey,
    changedVersionKey,
    apiType,
  } = useComparisonParams()
  const [refPackageKey] = useRefSearchParam()

  const [changesSummary] = useChangesSummaryContext({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originPackageKey: originPackageKey,
    originVersionKey: originVersionKey,
    currentGroup: group,
    previousGroup: previousGroup,
  })

  const changesLoadingStatus = useChangesLoadingStatus()
  const setChangesLoadingStatus = useSetChangesLoadingStatus()
  useEffect(() => {
    setChangesLoadingStatus(!changesSummary)
  }, [changesSummary, setChangesLoadingStatus])

  const [filters] = useSeverityFiltersSearchParam()
  const filteredGroupChanges = useMemo(
    () => groupChanges.filter(change => (selectedTag && change.metadata?.tags
      ? Array.isArray(change.metadata?.tags) && change.metadata?.tags.includes(selectedTag) && filterChangesBySeverity(filters, change.changeSummary)
      : filterChangesBySeverity(filters, change.changeSummary))),
    [groupChanges, selectedTag, filters])

  const onClickOperationChange = (): void => {
    setBackwardLocation({ ...backwardLocation, fromOperationsComparison: location })
  }

  const { navigateToGroupCompareContent } = useNavigation()

  const handleSwap = useCallback(() => {
    const searchParams = {
      [GROUP_SEARCH_PARAM]: { value: group },
      [FILTERS_SEARCH_PARAM]: { value: filters },
      [TAG_SEARCH_PARAM]: { value: selectedTag },
    }

    navigateToGroupCompareContent({
      packageKey: originPackageKey ?? changedPackageKey!,
      versionKey: `${changedVersionKey}`,
      previousGroup: `${previousGroup}`,
      search: searchParams,
    })
  }, [changedPackageKey, changedVersionKey, filters, group, navigateToGroupCompareContent, originPackageKey, previousGroup, selectedTag])

  if (changesLoadingStatus || isEmpty(groupChanges)) {
    return (
      <LoadingIndicator/>
    )
  }

  return (
    <Card>
      <ComparisonSwapper
        breadcrumbsData={breadcrumbsData}
        handleSwap={handleSwap}
        showCompareDialog={showCompareRestGroupsDialog}
      />
      <Placeholder
        invisible={isNotEmpty(filteredGroupChanges)}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No differences">
        <CardContent
          sx={{
            display: 'flex',
            height: `calc(100% - ${VERSION_SWAPPER_HEIGHT})`,
            flexDirection: 'column',
            overflow: 'auto',
            pt: 0,
          }}
        >
          <Box pt={2}>
            {
              filteredGroupChanges.map((change) => {
                const {
                  operationId,
                  changeSummary,
                  metadata: metadataObject,
                  changes,
                } = change

                const metadata = metadataObject as OperationChangesMetadata & Partial<RestChangesMetadata> & Partial<GraphQLChangesMetadata>

                const { action } = changes?.[0] ?? {}
                const operationAction = getActionForOperation(change, REPLACE_ACTION_TYPE)
                const severity = getMajorSeverity(changeSummary!)

                const isMetaDataPresent = !!(metadata?.title && metadata?.path && metadata?.method)
                const previousMetadata = metadata?.previousOperationMetadata

                const comparingSearchParams = optionalSearchParams({
                  [PACKAGE_SEARCH_PARAM]: { value: changedPackageKey === originPackageKey ? '' : encodeURIComponent(originPackageKey!) },
                  [VERSION_SEARCH_PARAM]: { value: originVersionKey! },
                  [REF_SEARCH_PARAM]: { value: refPackageKey },
                  [GROUP_SEARCH_PARAM]: { value: previousGroup },
                  [FILTERS_SEARCH_PARAM]: { value: [...CHANGE_SEVERITIES].join() },
                })

                return (
                  <Grid
                    key={crypto.randomUUID()}
                    component={NavLink}
                    container
                    spacing={0}
                    sx={{
                      textDecoration: 'none',
                      color: '#353C4E',
                      height: '70px',
                      marginBottom: '8px',
                      position: 'relative',
                    }}
                    to={{
                      pathname: format(
                        '/portal/packages/{}/{}/groups/{}/compare/{}/{}',
                        encodeURIComponent(originPackageKey!),
                        encodeURIComponent(changedVersionKey!),
                        encodeURIComponent(group!),
                        `${apiType}`,
                        encodeURIComponent(operationId),
                      ),
                      search: `${comparingSearchParams}`,
                    }}
                    onClick={onClickOperationChange}
                    data-testid="ComparisonRow"
                  >
                    <Grid
                      item
                      xs={6}
                      sx={{
                        borderRight: '1px solid #D5DCE3',
                        background: ACTION_TYPE_COLOR_MAP[operationAction as keyof typeof ACTION_TYPE_COLOR_MAP] ?? '#F2F3F5',
                      }}
                      data-testid="LeftComparisonSummary"
                    >
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'row',
                      }}>
                        <ChangeSeverityIndicator
                          severity={severity as ChangeSeverity}
                          sx={{
                            alignItems: 'center',
                            display: 'flex',
                            overflow: 'hidden',
                            zIndex: '1',
                            '&:hover': {
                              color: '#FFFFFF',
                              padding: '5px',
                              width: '105px',
                            },
                          }}
                        />
                        <Spec
                          key={operationId}
                          value={isMetaDataPresent && action !== ADD_ACTION_TYPE && previousMetadata ||
                          !previousMetadata && action === REMOVE_ACTION_TYPE ? {
                            title: previousMetadata?.title ?? metadata.title,
                            operationId: operationId,
                            method: previousMetadata?.method ?? metadata.method,
                            path: (previousMetadata as typeof metadata)?.path ?? metadata.path,
                          } : undefined}
                        />
                      </Box>
                    </Grid>

                    <Grid
                      item
                      xs={6}
                      sx={{ background: ACTION_TYPE_COLOR_MAP[operationAction as keyof typeof ACTION_TYPE_COLOR_MAP] ?? '#F2F3F5' }}
                      data-testid="RightComparisonSummary"
                    >
                      <Spec
                        key={`changed-${operationId}`}
                        value={isMetaDataPresent && action !== REMOVE_ACTION_TYPE && previousMetadata ||
                        !previousMetadata && action === ADD_ACTION_TYPE ? {
                          title: metadata.title,
                          operationId: operationId,
                          method: metadata.method,
                          path: metadata.path as string,
                        } : undefined}
                        changes={changeSummary}
                      />
                    </Grid>
                  </Grid>
                )
              })
            }
          </Box>
        </CardContent>
      </Placeholder>
    </Card>
  )
})

type SpecProps = {
  value?: Partial<{
    operationId: string
    title: string
    path: string
    method: string
  }>
  changes?: ChangeSummary
}

const Spec: FC<SpecProps> = memo<SpecProps>(({ value, changes }) => {
  const { method = '', path = '', title = '' } = value ?? {}

  const secondary = (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center' }} data-testid="OperationPath">
      {method && <CustomChip component="span" sx={{ mr: 1 }} value={method} variant={'outlined'}/>}
      {path && (
        <OverflowTooltip title={path}>
          <Typography component="span" noWrap variant="inherit">{path}</Typography>
        </OverflowTooltip>
      )}
    </Box>
  )
  return (
    <ListItem
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',

        padding: changes ? '2px 16px' : '8px 16px',
        paddingTop: value ? 0 : '44px',
        overflow: 'hidden',
        gap: '2px',
      }}
    >
      <Box display="flex" gap={1}>
        <ListItemText
          primary={title}
          secondary={secondary}
          secondaryTypographyProps={{ noWrap: true }}
        />
      </Box>
      {changes && (
        <Changes value={changes}/>
      )}
    </ListItem>
  )
})

