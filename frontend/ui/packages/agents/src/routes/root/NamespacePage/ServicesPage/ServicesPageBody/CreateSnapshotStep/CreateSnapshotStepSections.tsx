import { type FC, memo, useCallback, useMemo } from 'react'

import type { PackageKey, ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'
import {
  COMPLETE_PUBLISH_STATUS,
  type PublishDetails,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

import type { ServiceConfig } from '@agents/entities/publish-config'
import { EMPTY_PUBLISH_DETAILS } from '@agents/entities/publish-details'
import type { Service } from '@agents/entities/services'
import { useServices } from '../../../useServices'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
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
import { useServicePublishDetails } from './useServicePublishDetails'

const SERVICES_FROM_DISCOVERY_SECTION_ID = 'services-from-discovery'
const SERVICES_FROM_DISCOVERY_TOOLTIP =
  'These services have API documents from the Discover Services step. Enter snapshot and baseline versions above to see which services match and can be selected.'
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

const SNAPSHOT_SERVICE_COLUMNS: ReadonlyArray<ServiceTableColumn<SnapshotServiceRow>> = [
  {
    id: SERVICE_OR_DOCUMENTATION_COLUMN_ID,
    header: 'Service / Documentation',
    cell: row => <ServiceOrDocumentationTableCell value={row} />,
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
    id: PUBLISH_STATUS_COLUMN_ID,
    header: 'Publish Status',
    cell: row => row.getIsSelected() && <CreateSnapshotDetailsTableCell value={row.original} />,
  },
]

const snapshotLink: ServiceTableLink<SnapshotServiceRow> = ({ original: { serviceConfig, publishDetails } }) => (
  <PublicationActionTableCell
    serviceConfig={serviceConfig}
    publishDetails={publishDetails ?? EMPTY_PUBLISH_DETAILS}
    versionLinkLabel="View Snapshot"
    data-testid="ViewSnapshotButton"
  />
)

type CreateSnapshotStepSectionsProps = {
  selectable: boolean
  selected: ServiceKey[]
  onSelect: (selected: ServiceKey[]) => void
  searchValue: string
}

export const CreateSnapshotStepSections: FC<CreateSnapshotStepSectionsProps> = memo<CreateSnapshotStepSectionsProps>(({
  selectable,
  selected,
  onSelect,
  searchValue,
}) => {
  const [{ services }, isServicesLoading] = useServices({ onlyWithSpecs: true })
  const { createSnapshotPublicationOptions: { config } } = useCreateSnapshotPublicationOptions()
  const [allPublishDetails] = useAllPublicationDetails({ config })

  const rows = useMemo<SnapshotServiceRow[]>(() =>
    services.map(service => {
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
    }), [allPublishDetails, config?.builderId, config?.serviceConfigs, services])

  // The checkboxes are locked while a snapshot is published and after it
  const isSelectable = useCallback(() => selectable, [selectable])

  const sections = useMemo<ReadonlyArray<ServiceSectionModel<SnapshotServiceRow>>>(() => [{
    id: SERVICES_FROM_DISCOVERY_SECTION_ID,
    title: 'Services From Discovery',
    tooltip: SERVICES_FROM_DISCOVERY_TOOLTIP,
    columns: SNAPSHOT_SERVICE_COLUMNS,
    link: snapshotLink,
    rows: rows,
    selection: { selected: selected, onSelect: onSelect, isSelectable: isSelectable },
  }], [isSelectable, onSelect, rows, selected])

  return <ServiceSections sections={sections} searchValue={searchValue} isLoading={isServicesLoading} />
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
