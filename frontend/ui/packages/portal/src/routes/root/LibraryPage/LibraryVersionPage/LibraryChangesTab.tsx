import { Alert, Link } from '@mui/material'
import { type FC, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import type { JavaApiChangeDescription } from '@netcracker/qubership-apihub-api-doc-viewer'
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

import type { LibraryVersionDto } from '@portal/entities/libraries'
import { useSetBackwardLocationContext } from '@portal/routes/BackwardLocationProvider'
import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import {
  filterJavaClasses,
  getJavaClassPageLink,
  getPreviousLibraryVersion,
  JAVA_CHANGE_SEVERITIES,
  sumChangesSummaries,
} from './javaapi/java-api'
import { JavaChangesTable } from './javaapi/JavaChangesTable'
import { JavaTypeFilter, useJavaTypeFilter } from './javaapi/JavaTypeFilter'
import { getLibraryVersionPath } from './library-version'
import { useLibraryJavaApiDiff } from './useLibraryJavaApi'

export const LibraryChangesTab: FC<{ version: LibraryVersionDto }> = ({ version }) => {
  const [query] = useSearchParams()
  const previous = getPreviousLibraryVersion(query)
  const { data, isLoading, error } = useLibraryJavaApiDiff(version.libraryId, version.version, previous)
  const [searchValue, setSearchValue] = useState('')
  const [javaType] = useJavaTypeFilter()
  const [severityFilters, setSeverityFilters] = useSeverityFiltersSearchParam()
  const { hideFiltersPanel, toggleHideFiltersPanel } = usePortalPageSettingsContext()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const setBackwardLocation = useSetBackwardLocationContext()
  const matchingClasses = filterJavaClasses(data?.classes ?? [], searchValue, javaType)
  // TODO(api-doc-viewer): drop the annotation once its .d.ts includes the next-data-model types
  const classes = severityFilters.length
    ? matchingClasses.filter(({ changes }) =>
      changes.some(({ severity }: JavaApiChangeDescription) => severityFilters.includes(severity)),
    )
    : matchingClasses
  const changesSummary = sumChangesSummaries(matchingClasses)
  // the server compares with these defaults when the query names no other version
  const previousLibraryId = previous.previousLibraryId ?? version.libraryId
  const previousVersion = previous.previousVersion ?? version.previousVersion
  const openClass = (className: string): void => {
    setBackwardLocation(current => ({ ...current, fromOperation: { pathname, search } }))
    navigate(getJavaClassPageLink(version.libraryId, version.version, className, 'diff', previous))
  }

  let body = (
    <ListBox>
      <JavaChangesTable classes={classes} onOpen={openClass} />
    </ListBox>
  )
  if (isLoading) body = <LoadingIndicator />
  else if (error) body = <Alert severity="error">{error.message}</Alert>
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
      additionalActions={data && (
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
}
LibraryChangesTab.displayName = 'LibraryChangesTab'
