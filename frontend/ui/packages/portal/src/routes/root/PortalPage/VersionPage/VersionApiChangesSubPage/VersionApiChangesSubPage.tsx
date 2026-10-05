import { Link } from '@mui/material'
import { type FC, memo, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'

import { CATEGORY_OPERATION } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import { RichFiltersLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/RichFiltersLayout'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CHANGE_SEVERITIES } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { CONTRACT_TYPE_DDL, type ContractType, toRouteApiType } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import {
  usePackageSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/routes/package/usePackageSearchParam'
import { isEmptyTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import {
  usePreviousReleaseVersion,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/PreviousReleaseOptionsProvider'

import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'
import { isApiTypeSelectorShown } from '@portal/utils/operation-types'
import { VERSION_TAB_IDS } from '../VersionTabApiTypes/version-tab-allowed-api-types'
import { getVersionPath } from '../../../../NavigationProvider'
import { usePackage } from '../../../usePackage'
import { useVersionSearchParam } from '../../../useVersionSearchParam'
import { useRefSearchParam } from '../../useRefSearchParam'
import { ChangesSummaryProvider } from '../ChangesSummaryProvider'
import { ComparisonChangeSeverityFilters } from '../ComparisonChangeSeverityFilters'
import { ExportChangesMenu } from '../ExportChangesMenu'
import { useApiAudienceSearchFilter } from '../useApiAudienceSearchFilters'
import { useApiKindSearchFilter } from '../useApiKindSearchFilters'
import { useCheckOperationFiltersApplied } from '../useCheckOperationFiltersApplied'
import { useEnsureValidRouteApiType } from '../useEnsureValidRouteApiType'
import { useOperationGroupSearchFilter } from '../useOperationGroupSearchFilter'
import { useSetPathParam } from '../useSetPathParam'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { useVersionTabApiTypes } from '../useVersionTabApiTypes'
import { ApiChangesCard } from './ApiChangesCard'
import { ApiChangesNavigation } from './ApiChangesNavigation'

// High Order Component //
export const VersionApiChangesSubPage: FC = memo(() => {
  const { packageId, apiType = DEFAULT_API_TYPE } = useParams<{
    packageId: string
    versionId: string
    apiType?: ApiType | ContractType
  }>()
  const routeApiType = toRouteApiType(apiType)
  const [apiKindFilter] = useApiKindSearchFilter()
  const [apiAudienceFilter] = useApiAudienceSearchFilter()
  const [selectedTag] = useTagSearchFilter()
  const [severityFilter] = useSeverityFiltersSearchParam()
  const [refKey] = useRefSearchParam()
  const [previousVersion] = useVersionSearchParam()
  const [previousVersionPackageKey] = usePackageSearchParam()
  const [operationGroup] = useOperationGroupSearchFilter()
  const setPathParam = useSetPathParam()
  const { tabs, isLoading } = useVersionTabApiTypes()
  const { allowedApiTypes } = tabs[VERSION_TAB_IDS.apiChanges]

  useEnsureValidRouteApiType(allowedApiTypes, isLoading)

  const emptyTag = isEmptyTag(selectedTag)

  const previousReleaseVersion = usePreviousReleaseVersion()
  const { versionKey: previousReleaseVersionKey } = getSplittedVersionKey(previousReleaseVersion)

  const [searchValue, setSearchValue] = useState('')

  const [packageObject] = usePackage({ showParents: true })
  const isDashboard = packageObject?.kind === DASHBOARD_KIND
  const isDdl = routeApiType === CONTRACT_TYPE_DDL
  const hideDdlFiltersOnPackage = isDdl && !isDashboard
  const filtersApplied = useCheckOperationFiltersApplied(isDashboard) && !hideDdlFiltersOnPackage

  const { hideFiltersPanel, toggleHideFiltersPanel } = usePortalPageSettingsContext()

  const versionElement = useMemo(() => (
    <Link
      component={NavLink}
      to={getVersionPath({ packageKey: packageId!, versionKey: previousReleaseVersion! })}
      data-testid="ComparedToLink"
    >
      {previousReleaseVersionKey}
    </Link>
  ), [packageId, previousReleaseVersion, previousReleaseVersionKey])

  return (
    <ChangesSummaryProvider>
      <RichFiltersLayout
        title={
          <PageTitle
            title={API_CHANGES_TITLE}
            titleComponent={versionElement}
            onApiTypeChange={setPathParam}
            apiType={routeApiType}
            allowedApiTypes={allowedApiTypes}
            withApiSelector={isApiTypeSelectorShown(allowedApiTypes)}
          />
        }
        searchPlaceholder="Search"
        setSearchValue={setSearchValue}
        exportButton={
          <ExportChangesMenu
            apiType={routeApiType}
            textFilter={searchValue}
            severityChanges={CHANGE_SEVERITIES}
            kind={apiKindFilter}
            apiAudience={apiAudienceFilter}
            tag={selectedTag}
            severityFilter={severityFilter}
            refPackageId={refKey}
            emptyTag={emptyTag}
            group={operationGroup}
            previousVersion={previousVersion}
            previousVersionPackageId={previousVersionPackageKey}
          />
        }
        additionalActions={
          <ComparisonChangeSeverityFilters
            category={CATEGORY_OPERATION}
            apiType={routeApiType}
          />
        }
        filtersApplied={filtersApplied}
        hideFilterButton={hideDdlFiltersOnPackage}
        hideFiltersPanel={hideDdlFiltersOnPackage || hideFiltersPanel}
        filters={<ApiChangesNavigation />}
        onClickFilterButton={toggleHideFiltersPanel}
        body={<ApiChangesCard searchValue={searchValue} />}
        data-testid="ApiChangesTab"
      />
    </ChangesSummaryProvider>
  )
})

VersionApiChangesSubPage.displayName = 'VersionApiChangesSubPage'

const API_CHANGES_TITLE = 'API changes compared to '
