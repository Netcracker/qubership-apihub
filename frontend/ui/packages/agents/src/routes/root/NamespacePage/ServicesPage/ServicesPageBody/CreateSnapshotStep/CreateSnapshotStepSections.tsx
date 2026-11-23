import { type FC, memo, useCallback, useMemo } from 'react'

import type { PackageKey, ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import {
  COMPLETE_PUBLISH_STATUS,
  type PublishDetails,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { VersionKey } from '@agents/entities/keys'
import type { ServiceConfig } from '@agents/entities/publish-config'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import type { Service } from '@agents/entities/services'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
import { PublicationActionTableCell } from '../PublicationActionTableCell'
import { PublishStatusTableCell } from '../PublishStatusTableCell'
import { ServiceOrDocumentationTableCell } from '../ServiceOrDocumentationTableCell'
import type { ServiceSectionModel } from '../ServiceSections/ServiceSection'
import { ServiceSections } from '../ServiceSections/ServiceSections'
import {
  BASELINE_PACKAGE_COLUMN_ID,
  SERVICE_OR_DOCUMENTATION_COLUMN_ID,
  type ServiceTableColumn,
  type ServiceTableLink,
} from '../ServiceSections/ServiceTable'
import { useAllPublicationDetails } from '../useAllPublicationDetails'
import { ViewPackageTableCell } from '../ViewPackageTableCell'
import type { BaselineVersionSplit } from './snapshotForm'
import { useServicePublishDetails } from './useServicePublishDetails'

const SERVICES_FROM_DISCOVERY_SECTION_ID = 'services-from-discovery'
const MATCHING_BASELINE_VERSION_SECTION_ID = 'matching-baseline-version'
const NOT_MATCHING_BASELINE_VERSION_SECTION_ID = 'not-matching-baseline-version'
const SERVICES_FROM_DISCOVERY_TOOLTIP =
  'These services have API documents from the Discover Services step. Enter snapshot and baseline versions above to see which services match and can be selected.'
const MATCHING_BASELINE_VERSION_TOOLTIP =
  'These services have a baseline package for the selected baseline version. Select them to include in this snapshot.'
const NOT_MATCHING_BASELINE_VERSION_TOOLTIP =
  'These services have no baseline package for the selected baseline version. They cannot be selected for a snapshot until you link a baseline package in the settings.'
const PUBLISH_STATUS_COLUMN_ID = 'publish-status'

type SnapshotServiceRow = Partial<{
  service: Service
  spec: Spec
  children: SnapshotServiceRow[]
  serviceConfig: ServiceConfig
  publishDetails: PublishDetails
  builderId: string
  snapshotHasErrors: boolean
  snapshotPackageKey: PackageKey
}>

const SERVICE_OR_DOCUMENTATION_COLUMN: ServiceTableColumn<SnapshotServiceRow> = {
  id: SERVICE_OR_DOCUMENTATION_COLUMN_ID,
  header: 'Service / Documentation',
  cell: row => <ServiceOrDocumentationTableCell value={row} />,
}

const BASELINE_PACKAGE_COLUMN: ServiceTableColumn<SnapshotServiceRow> = {
  id: BASELINE_PACKAGE_COLUMN_ID,
  header: 'Baseline Package',
  cell: row => <BaselinePackageTableCell value={row} />,
}

const SNAPSHOT_SERVICE_COLUMNS: ReadonlyArray<ServiceTableColumn<SnapshotServiceRow>> = [
  SERVICE_OR_DOCUMENTATION_COLUMN,
  BASELINE_PACKAGE_COLUMN,
]

// The services of the created snapshot show their publication in the section they were selected in
const SNAPSHOT_SERVICE_COLUMNS_WITH_PUBLISH_STATUS: ReadonlyArray<ServiceTableColumn<SnapshotServiceRow>> = [
  ...SNAPSHOT_SERVICE_COLUMNS,
  {
    id: PUBLISH_STATUS_COLUMN_ID,
    header: 'Publish Status',
    cell: row => row.getIsSelected() && <CreateSnapshotDetailsTableCell value={row.original} />,
  },
]

// A service of the created snapshot links to the snapshot, and any other service to its baseline package
const serviceLink: ServiceTableLink<SnapshotServiceRow> = row => (
  row.original.serviceConfig
    ? (
      <PublicationActionTableCell
        serviceConfig={row.original.serviceConfig}
        publishDetails={row.original.publishDetails ?? EMPTY_PUBLISH_DETAILS}
        versionLinkLabel="View Snapshot"
        data-testid="ViewSnapshotButton"
      />
    )
    : <ViewPackageTableCell value={row} />
)

type CreateSnapshotStepSectionsProps = {
  services: ReadonlyArray<Service>
  areServicesLoading: boolean
  /** The services split by the baseline version; `undefined` until both versions are entered. */
  baselineVersionSplit: BaselineVersionSplit | undefined
  baselineVersion: VersionKey
  selectable: boolean
  selected: ReadonlyArray<ServiceKey>
  onSelect: (selected: ServiceKey[]) => void
  searchValue: string
}

export const CreateSnapshotStepSections: FC<CreateSnapshotStepSectionsProps> = memo<CreateSnapshotStepSectionsProps>(({
  services,
  areServicesLoading,
  baselineVersionSplit,
  baselineVersion,
  selectable,
  selected,
  onSelect,
  searchValue,
}) => {
  const { createSnapshotPublicationOptions: { config } } = useCreateSnapshotPublicationOptions()
  const [allPublishDetails] = useAllPublicationDetails({ config })

  const toSnapshotServiceRow = useCallback((service: Service): SnapshotServiceRow => {
    const serviceConfig = config?.serviceConfigs.find(({ serviceId }) => serviceId === service.key)
    const publishDetails = allPublishDetails.find(({ publishId }) => publishId === serviceConfig?.publishId) ??
      EMPTY_PUBLISH_DETAILS

    return {
      service: service,
      serviceConfig: serviceConfig,
      publishDetails: publishDetails,
      children: service.specs?.map(spec => ({ spec })),
      builderId: config?.builderId,
      snapshotHasErrors: publishDetails.status === COMPLETE_PUBLISH_STATUS && (publishDetails.hasErrors ?? false),
      snapshotPackageKey: serviceConfig?.packageId,
    }
  }, [allPublishDetails, config])

  const isSelectable = useCallback(() => selectable, [selectable])

  const sections = useMemo<ReadonlyArray<ServiceSectionModel<SnapshotServiceRow>>>(() => {
    if (!baselineVersionSplit) {
      return [{
        id: SERVICES_FROM_DISCOVERY_SECTION_ID,
        title: 'Services From Discovery',
        tooltip: SERVICES_FROM_DISCOVERY_TOOLTIP,
        columns: SNAPSHOT_SERVICE_COLUMNS,
        link: serviceLink,
        rows: services.map(toSnapshotServiceRow),
      }]
    }
    return [
      {
        id: MATCHING_BASELINE_VERSION_SECTION_ID,
        title: 'Matching Baseline Version',
        tooltip: MATCHING_BASELINE_VERSION_TOOLTIP,
        columns: config ? SNAPSHOT_SERVICE_COLUMNS_WITH_PUBLISH_STATUS : SNAPSHOT_SERVICE_COLUMNS,
        link: serviceLink,
        rows: baselineVersionSplit.matching.map(toSnapshotServiceRow),
        selection: { selected: selected, onSelect: onSelect, isSelectable: isSelectable },
      },
      {
        id: NOT_MATCHING_BASELINE_VERSION_SECTION_ID,
        title: 'Not Matching Baseline Version',
        tooltip: NOT_MATCHING_BASELINE_VERSION_TOOLTIP,
        columns: getNotMatchingColumns(baselineVersion),
        link: serviceLink,
        rows: baselineVersionSplit.notMatching.map(toSnapshotServiceRow),
      },
    ]
  }, [baselineVersion, config, isSelectable, onSelect, toSnapshotServiceRow, selected, services, baselineVersionSplit])

  return <ServiceSections sections={sections} searchValue={searchValue} isLoading={areServicesLoading} />
})

CreateSnapshotStepSections.displayName = 'CreateSnapshotStepSections'

type CreateSnapshotDetailsTableCellProps = {
  value: SnapshotServiceRow
}

const CreateSnapshotDetailsTableCell: FC<CreateSnapshotDetailsTableCellProps> = memo<
  CreateSnapshotDetailsTableCellProps
>(({
  value: {
    serviceConfig,
    builderId,
    publishDetails = EMPTY_PUBLISH_DETAILS,
  },
}) => {
  // Starts the build in the browser; its outcome reaches the cell through the statuses poll of the table
  useServicePublishDetails({ serviceConfig, builderId })

  if (!serviceConfig) {
    return null
  }

  return <PublishStatusTableCell publishDetails={publishDetails} />
})

CreateSnapshotDetailsTableCell.displayName = 'CreateSnapshotDetailsTableCell'

// The warning of a service without a baseline package names the version that the service cannot be compared with
function getNotMatchingColumns(baselineVersion: VersionKey): ReadonlyArray<ServiceTableColumn<SnapshotServiceRow>> {
  const noBaselinePackageTooltip =
    `No baseline package matches this service for baseline version ${baselineVersion}. This service cannot be selected for this snapshot. To link a package, set the service name in the baseline package settings.`
  return [
    SERVICE_OR_DOCUMENTATION_COLUMN,
    {
      ...BASELINE_PACKAGE_COLUMN,
      cell: row => <BaselinePackageTableCell value={row} noBaselinePackageTooltip={noBaselinePackageTooltip} />,
    },
  ]
}
