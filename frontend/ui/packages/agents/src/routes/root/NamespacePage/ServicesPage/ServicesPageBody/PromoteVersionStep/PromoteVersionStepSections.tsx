import { type FC, memo, useCallback, useMemo } from 'react'

import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { PackageKey, ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { PublishDetails } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { ServiceConfig } from '@agents/entities/publish-config'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import type { Service } from '@agents/entities/services'
import { useSnapshotPublicationInfo } from '../../../useSnapshotPublicationInfo'
import { usePromoteVersionPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
import { BwcStatusTableCell } from '../BwcStatusTableCell'
import { PublicationActionTableCell } from '../PublicationActionTableCell'
import { PublishStatusTableCell } from '../PublishStatusTableCell'
import { ServiceLabelsTableCell } from '../ServiceLabelsTableCell'
import { ServiceOrDocumentationTableCell } from '../ServiceOrDocumentationTableCell'
import type { ServiceSectionModel } from '../ServiceSections/ServiceSection'
import { ServiceSections } from '../ServiceSections/ServiceSections'
import {
  BASELINE_PACKAGE_COLUMN_ID,
  SERVICE_LABELS_COLUMN_ID,
  SERVICE_OR_DOCUMENTATION_COLUMN_ID,
  type ServiceTableColumn,
  type ServiceTableLink,
} from '../ServiceSections/ServiceTable'
import { useAllPublicationDetails } from '../useAllPublicationDetails'
import { useServicePromoteDetails } from './useServicePromoteDetails'

const SERVICES_TO_PROMOTE_SECTION_ID = 'services-to-promote'
const SERVICES_TO_PROMOTE_TOOLTIP =
  'Services that were published in the snapshot from the previous step and have a baseline package. Select them and set the status and version to promote to APIHUB.'
const BWC_STATUS_COLUMN_ID = 'bwc-status'
const CHANGES_COLUMN_ID = 'changes'
const PUBLISH_STATUS_COLUMN_ID = 'publish-status'

type PromotionServiceRow = Partial<{
  service: Service
  spec: Spec
  children: PromotionServiceRow[]
  serviceConfig: ServiceConfig
  publishDetails: PublishDetails
  bwcErrors: number
  changeSummary: ChangesSummary
  baselineFound: boolean
  baselineVersionFound: boolean
  changelogHasErrors: boolean
  builderId: string
  snapshotHasErrors: boolean
  snapshotPackageKey: PackageKey
}>

const promotedVersionLink: ServiceTableLink<PromotionServiceRow> = ({
  original: { serviceConfig, publishDetails },
}) => (
  <PublicationActionTableCell
    serviceConfig={serviceConfig}
    publishDetails={publishDetails ?? EMPTY_PUBLISH_DETAILS}
    versionLinkLabel="View Version"
    data-testid="PromotedVersionButton"
  />
)

type PromoteVersionStepSectionsProps = {
  services: ReadonlyArray<Service>
  promoteStatus: VersionStatus
  selectable: boolean
  selected: ServiceKey[]
  onSelect: (selected: ServiceKey[]) => void
  searchValue: string
  // Leaves the services that "Show only available services" keeps
  filter: (service: Service) => boolean
  isServicesLoading: boolean
}

export const PromoteVersionStepSections: FC<PromoteVersionStepSectionsProps> = memo<PromoteVersionStepSectionsProps>(({
  services,
  promoteStatus,
  selectable,
  selected,
  onSelect,
  searchValue,
  filter,
  isServicesLoading,
}) => {
  const {
    snapshotPublicationInfo,
    isLoading: isSnapshotPublicationInfoLoading,
  } = useSnapshotPublicationInfo({ promote: true })
  const { promotePublicationOptions: { config } } = usePromoteVersionPublicationOptions()
  const [allPublishDetails] = useAllPublicationDetails({ config })

  const columns = useMemo<ReadonlyArray<ServiceTableColumn<PromotionServiceRow>>>(() => [
    {
      id: SERVICE_OR_DOCUMENTATION_COLUMN_ID,
      header: 'Service / Documentation',
      cell: row => <ServiceOrDocumentationTableCell value={row} isPromoteStep={true} promoteStatus={promoteStatus} />,
    },
    {
      id: SERVICE_LABELS_COLUMN_ID,
      header: 'Labels',
      cell: row => <ServiceLabelsTableCell value={row} />,
    },
    {
      id: BASELINE_PACKAGE_COLUMN_ID,
      header: 'Baseline Package',
      cell: row => <BaselinePackageTableCell value={row} />,
    },
    {
      id: BWC_STATUS_COLUMN_ID,
      header: 'BWC Status',
      cell: row => <BwcStatusTableCell value={row} />,
    },
    {
      id: CHANGES_COLUMN_ID,
      header: 'Changes',
      cell: ({ original: { service, changeSummary } }) => (
        service && changeSummary && <Changes mode="compact" value={changeSummary} />
      ),
    },
    {
      id: PUBLISH_STATUS_COLUMN_ID,
      header: 'Publish Status',
      cell: row => row.getIsSelected() && <PromoteVersionDetailsTableCell value={row.original} />,
    },
  ], [promoteStatus])

  // The services of the snapshot that have a baseline package
  const rows = useMemo<PromotionServiceRow[]>(() =>
    services
      .filter(service => !!service.baseline && filter(service))
      .flatMap(service => {
        const servicePublishInfo = snapshotPublicationInfo.services.find(({ key }) => key === service.key)
        if (!servicePublishInfo) {
          return []
        }

        const {
          changeSummary,
          baselineFound,
          baselineVersionFound,
          changelogHasErrors,
          hasErrors,
          packageKey,
        } = servicePublishInfo
        const serviceConfig = config?.serviceConfigs.find(({ serviceId }) => serviceId === service.key)
        return [{
          service: service,
          serviceConfig: serviceConfig,
          publishDetails: allPublishDetails.find(({ publishId }) => publishId === serviceConfig?.publishId) ??
            EMPTY_PUBLISH_DETAILS,
          bwcErrors: (baselineFound && baselineVersionFound) ? changeSummary?.breaking : undefined,
          changeSummary: changeSummary,
          children: service.specs?.map(spec => ({ spec })),
          baselineFound: baselineFound,
          baselineVersionFound: baselineVersionFound,
          changelogHasErrors: changelogHasErrors,
          builderId: config?.builderId,
          snapshotHasErrors: hasErrors,
          snapshotPackageKey: packageKey,
        }]
      }), [
    allPublishDetails,
    config?.builderId,
    config?.serviceConfigs,
    filter,
    services,
    snapshotPublicationInfo.services,
  ])

  // A service the user may not promote with the selected status keeps a disabled checkbox and the lock icon
  const isSelectable = useCallback(
    (service: Service) => selectable && !!service.availablePromoteStatuses?.includes(promoteStatus),
    [promoteStatus, selectable],
  )

  const sections = useMemo<ReadonlyArray<ServiceSectionModel<PromotionServiceRow>>>(() => [{
    id: SERVICES_TO_PROMOTE_SECTION_ID,
    title: 'Services to Promote',
    tooltip: SERVICES_TO_PROMOTE_TOOLTIP,
    columns: columns,
    link: promotedVersionLink,
    rows: rows,
    selection: { selected: selected, onSelect: onSelect, isSelectable: isSelectable },
  }], [columns, isSelectable, onSelect, rows, selected])

  return (
    <ServiceSections
      sections={sections}
      searchValue={searchValue}
      isLoading={isServicesLoading || isSnapshotPublicationInfoLoading}
    />
  )
})

PromoteVersionStepSections.displayName = 'PromoteVersionStepSections'

type PromoteVersionDetailsTableCellProps = {
  value: PromotionServiceRow
}

const PromoteVersionDetailsTableCell: FC<PromoteVersionDetailsTableCellProps> = memo<
  PromoteVersionDetailsTableCellProps
>(({
  value: {
    serviceConfig,
    builderId,
    publishDetails = EMPTY_PUBLISH_DETAILS,
  },
}) => {
  // Starts the build in the browser; its outcome reaches the cell through the statuses poll of the table
  useServicePromoteDetails({ serviceConfig, builderId })

  if (!serviceConfig) {
    return null
  }

  return <PublishStatusTableCell publishDetails={publishDetails} />
})

PromoteVersionDetailsTableCell.displayName = 'PromoteVersionDetailsTableCell'
