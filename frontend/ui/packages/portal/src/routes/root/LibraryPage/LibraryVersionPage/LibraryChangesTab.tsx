import { Alert, Link } from '@mui/material'
import { type FC, memo, useCallback, useState } from 'react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'

import type { JavaApiChangeDescription, JavaApiClassListItem } from '@netcracker/qubership-apihub-api-doc-viewer'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import { CATEGORY_OPERATION } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { RichFiltersLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/RichFiltersLayout'
import { ListBox } from '@netcracker/qubership-apihub-ui-shared/components/Panels/ListBox'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'

import { type LibraryVersion, LibraryVersionBuildStatuses } from '@portal/entities/libraries'
import { useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import {
  filterJavaClasses,
  getJavaClassPageLink,
  getPreviousLibraryVersion,
  JAVA_CHANGE_SEVERITIES,
} from './javaapi/java-api'
import { JavaChangesTable } from './javaapi/JavaChangesTable'
import { JavaTypeFilter, useJavaTypeFilter } from './javaapi/JavaTypeFilter'
import { getLibraryVersionPath } from './library-version'
import { LibraryVersionBuildError } from './LibraryVersionBuildError'
import { useLibraryChanges, useLibraryChangesSummary } from './useLibraryChanges'

export const LibraryChangesTab: FC<Readonly<{ version: LibraryVersion }>> = memo(({ version }) => {
  const [query] = useSearchParams()
  const previous = getPreviousLibraryVersion(query)
  const { data, isLoading, error } = useLibraryChanges(version.libraryId, version.version, previous)
  const { data: changesSummary, error: summaryError } = useLibraryChangesSummary(
    version.libraryId,
    version.version,
    previous,
  )
  const [searchValue, setSearchValue] = useState('')
  const [javaType] = useJavaTypeFilter()
  const [severityFilters, setSeverityFilters] = useSeverityFiltersSearchParam()
  const { hideFiltersPanel, toggleHideFiltersPanel } = usePortalPageSettingsContext()
  const { pathname, search } = useLocation()
  const setBackwardLocation = useSetBackwardLocationContext()
  const matchingClasses = filterJavaClasses(data?.classes ?? [], searchValue, javaType)
  const classes = severityFilters.length
    ? matchingClasses.filter(({ changes }) => {
      return changes.some(({ severity }: JavaApiChangeDescription) => severityFilters.includes(severity))
    })
    : matchingClasses
  // the server compares with these defaults when the query names no other version
  const previousLibraryId = previous.previousLibraryId ?? version.libraryId
  const previousVersion = previous.previousVersion ?? version.previousVersion
  const prepareLinkFn = useCallback(
    (javaClass: JavaApiClassListItem) =>
      getJavaClassPageLink(version.libraryId, version.version, javaClass.className, 'diff', {
        previousLibraryId: previous.previousLibraryId,
        previousVersion: previous.previousVersion,
      }),
    [version.libraryId, version.version, previous.previousLibraryId, previous.previousVersion],
  )
  const onLinkClick = useCallback((): void => {
    setBackwardLocation(current => ({ ...current, fromOperation: { pathname, search } }))
  }, [pathname, search, setBackwardLocation])

  let body = (
    <ListBox>
      <JavaChangesTable classes={classes} prepareLinkFn={prepareLinkFn} onLinkClick={onLinkClick} />
    </ListBox>
  )
  if (version.metadata?.buildStatus === LibraryVersionBuildStatuses.ERROR) {
    body = <LibraryVersionBuildError version={version} />
  } else if (isLoading) body = <LoadingIndicator />
  else if (error || summaryError) body = <Alert severity="error">{error?.message ?? summaryError?.message}</Alert>
  else if (!data) body = <Alert severity="info">No comparison has been computed for this version pair.</Alert>

  return (
    <RichFiltersLayout
      title={
        <PageTitle
          title={previousVersion ? 'API changes compared to' : 'API changes'}
          titleComponent={previousVersion && (
            <TextWithOverflowTooltip tooltipText={previousVersion} variant="inherit" sx={{ minWidth: 0 }}>
              <Link
                component={NavLink}
                to={getLibraryVersionPath(previousLibraryId, previousVersion)}
                data-testid="ComparedToLink"
              >
                {previousVersion}
              </Link>
            </TextWithOverflowTooltip>
          )}
        />
      }
      searchPlaceholder="Search Java types"
      setSearchValue={setSearchValue}
      hideFiltersPanel={hideFiltersPanel}
      onClickFilterButton={toggleHideFiltersPanel}
      filtersApplied={!!javaType}
      filters={<JavaTypeFilter />}
      hideViewToggle
      hideExport
      additionalActions={changesSummary && (
        <ChangeSeverityFilters
          changes={changesSummary}
          changeSeverities={JAVA_CHANGE_SEVERITIES}
          filters={severityFilters}
          handleFilters={selected => setSeverityFilters(selected.toString())}
          category={CATEGORY_OPERATION}
        />
      )}
      body={body}
      data-testid="LibraryChangesTab"
    />
  )
})
LibraryChangesTab.displayName = 'LibraryChangesTab'
