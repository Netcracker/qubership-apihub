import { type FC, memo, useCallback, useMemo } from 'react'

import type { PackageKey, ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  type PublishDetails,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { VersionKey } from '@agents/entities/keys'
import type { ServiceConfig } from '@agents/entities/publish-config'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import type { Service } from '@agents/entities/services'
import {
  type SnapshotPublication,
  useSnapshotPublications,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
import { PublicationActionTableCell } from '../PublicationActionTableCell'
import { PublicationStatusIndicator } from '../PublicationStatusIndicator'
import { ServiceOrDocumentationTableCell } from '../ServiceOrDocumentationTableCell'
import type { ServiceSectionModel, ServiceSectionSummaryItem } from '../ServiceSections/ServiceSection'
import { ServiceSections } from '../ServiceSections/ServiceSections'
import {
  BASELINE_PACKAGE_COLUMN_ID,
  SERVICE_OR_DOCUMENTATION_COLUMN_ID,
  type ServiceTableColumn,
  type ServiceTableLink,
} from '../ServiceSections/ServiceTable'
import { useSnapshotPublicationDetails } from '../useAllPublicationDetails'
import { ViewPackageTableCell } from '../ViewPackageTableCell'
import type { BaselineVersionSplit } from './snapshotForm'
import { getServicePublishDetails, getSnapshotPublishDetails } from './snapshotPublications'

const SERVICES_FROM_DISCOVERY_SECTION_ID = 'services-from-discovery'
const MATCHING_BASELINE_VERSION_SECTION_ID = 'matching-baseline-version'
const NOT_MATCHING_BASELINE_VERSION_SECTION_ID = 'not-matching-baseline-version'
const SERVICES_FROM_DISCOVERY_TOOLTIP =
  'These services have API documents from the Discover Services step. Enter snapshot and baseline versions above to see which services match and can be selected.'
const MATCHING_BASELINE_VERSION_TOOLTIP =
  'These services have a baseline package for the selected baseline version. Select them to include in this snapshot.'
const NOT_MATCHING_BASELINE_VERSION_TOOLTIP =
  'These services have no baseline package for the selected baseline version. They cannot be selected for a snapshot until you link a baseline package in the settings.'
const SNAPSHOT_SECTION_ID_PREFIX = 'snapshot-'
const SNAPSHOT_SECTION_TOOLTIP =
  'Services already published to the workspace as part of a snapshot created in this workflow.'
const PUBLISH_STATUS_COLUMN_ID = 'publish-status'
const SNAPSHOT_SUMMARY_VERSION_LABEL = 'Snapshot:'
const SNAPSHOT_SUMMARY_BASELINE_LABEL = 'Baseline Version:'
const SNAPSHOT_SUMMARY_SERVICES_LABEL = 'Services:'

type SnapshotServiceRow = Partial<{
  service: Service
  spec: Spec
  children: SnapshotServiceRow[]
  serviceConfig: ServiceConfig
  publishDetails: PublishDetails
  snapshotHasErrors: boolean
  snapshotPackageKey: PackageKey
  snapshotVersionKey: VersionKey
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

const SNAPSHOT_SERVICE_COLUMNS_WITH_PUBLICATION_STATUS: ReadonlyArray<ServiceTableColumn<SnapshotServiceRow>> = [
  ...SNAPSHOT_SERVICE_COLUMNS,
  {
    id: PUBLISH_STATUS_COLUMN_ID,
    header: 'Publication Status',
    // A document row has no publication of its own
    cell: ({ original: { publishDetails } }) =>
      publishDetails && <PublicationStatusIndicator publishDetails={publishDetails} />,
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
  /** Every service of the step, which the rows of the snapshots take. */
  services: ReadonlyArray<Service>
  /** The services that went into no snapshot, which "Services From Discovery" and the split take. */
  servicesOutsideSnapshots: ReadonlyArray<Service>
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
  servicesOutsideSnapshots,
  areServicesLoading,
  baselineVersionSplit,
  baselineVersion,
  selectable,
  selected,
  onSelect,
  searchValue,
}) => {
  const { snapshotPublications } = useSnapshotPublications()
  const allPublishDetails = useSnapshotPublicationDetails(snapshotPublications)

  const isSelectable = useCallback(() => selectable, [selectable])

  const sections = useMemo<ReadonlyArray<ServiceSectionModel<SnapshotServiceRow>>>(() => {
    const snapshotSections = snapshotPublications.map((snapshotPublication, index) => {
      const snapshotPublishDetails = getSnapshotPublishDetails(snapshotPublication, allPublishDetails)
      return {
        id: `${SNAPSHOT_SECTION_ID_PREFIX}${index + 1}`,
        title: toSnapshotSummary(snapshotPublication),
        tooltip: SNAPSHOT_SECTION_TOOLTIP,
        status: isPublicationFinal(snapshotPublishDetails)
          ? <PublicationStatusIndicator publishDetails={snapshotPublishDetails} />
          : null,
        columns: SNAPSHOT_SERVICE_COLUMNS_WITH_PUBLICATION_STATUS,
        link: serviceLink,
        rows: getSnapshotSectionRows(snapshotPublication, services, allPublishDetails),
      }
    })
    if (!baselineVersionSplit) {
      return [
        ...snapshotSections,
        {
          id: SERVICES_FROM_DISCOVERY_SECTION_ID,
          title: 'Services From Discovery',
          tooltip: SERVICES_FROM_DISCOVERY_TOOLTIP,
          columns: SNAPSHOT_SERVICE_COLUMNS,
          link: serviceLink,
          rows: servicesOutsideSnapshots.map(toServiceRowWithDocuments),
        },
      ]
    }
    return [
      ...snapshotSections,
      {
        id: MATCHING_BASELINE_VERSION_SECTION_ID,
        title: 'Matching Baseline Version',
        tooltip: MATCHING_BASELINE_VERSION_TOOLTIP,
        columns: SNAPSHOT_SERVICE_COLUMNS,
        link: serviceLink,
        rows: baselineVersionSplit.matching.map(toServiceRowWithDocuments),
        selection: { selected: selected, onSelect: onSelect, isSelectable: isSelectable },
      },
      {
        id: NOT_MATCHING_BASELINE_VERSION_SECTION_ID,
        title: 'Not Matching Baseline Version',
        tooltip: NOT_MATCHING_BASELINE_VERSION_TOOLTIP,
        columns: getNotMatchingColumns(baselineVersion),
        link: serviceLink,
        rows: baselineVersionSplit.notMatching.map(toServiceRowWithDocuments),
      },
    ]
  }, [
    allPublishDetails,
    baselineVersion,
    baselineVersionSplit,
    isSelectable,
    onSelect,
    selected,
    services,
    servicesOutsideSnapshots,
    snapshotPublications,
  ])

  return <ServiceSections sections={sections} searchValue={searchValue} isLoading={areServicesLoading} />
})

CreateSnapshotStepSections.displayName = 'CreateSnapshotStepSections'

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

function toSnapshotSummary({ name, baseline, config }: SnapshotPublication): ReadonlyArray<ServiceSectionSummaryItem> {
  return [
    { label: SNAPSHOT_SUMMARY_VERSION_LABEL, value: name },
    { label: SNAPSHOT_SUMMARY_BASELINE_LABEL, value: baseline },
    { label: SNAPSHOT_SUMMARY_SERVICES_LABEL, value: String(config.serviceConfigs.length) },
  ]
}

function isPublicationFinal({ status }: PublishDetails): boolean {
  return status === COMPLETE_PUBLISH_STATUS || status === ERROR_PUBLISH_STATUS
}

function toServiceRowWithDocuments(service: Service): SnapshotServiceRow {
  return {
    service: service,
    children: service.specs?.map(spec => ({ spec })),
  }
}

/** Returns the rows of a snapshot section: each service of the snapshot with its documents and its publication. */
function getSnapshotSectionRows(
  { name, config }: SnapshotPublication,
  services: ReadonlyArray<Service>,
  allPublishDetails: ReadonlyArray<PublishDetails>,
): SnapshotServiceRow[] {
  return config.serviceConfigs.flatMap(serviceConfig => {
    const service = services.find(({ key }) => key === serviceConfig.serviceId)
    // The services of the step hold every service of a snapshot, since "Restart Discovery" clears the snapshots; the
    // guard narrows the type
    if (!service) {
      return []
    }
    const publishDetails = getServicePublishDetails(allPublishDetails, serviceConfig)
    return [{
      ...toServiceRowWithDocuments(service),
      serviceConfig: serviceConfig,
      publishDetails: publishDetails,
      snapshotHasErrors: publishDetails.status === COMPLETE_PUBLISH_STATUS && (publishDetails.hasErrors ?? false),
      snapshotPackageKey: serviceConfig.packageId,
      snapshotVersionKey: name,
    }]
  })
}
