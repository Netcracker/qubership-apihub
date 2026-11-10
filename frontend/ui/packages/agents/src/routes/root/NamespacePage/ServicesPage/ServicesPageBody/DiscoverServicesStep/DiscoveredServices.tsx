import { type FC, memo, useMemo, useState } from 'react'

import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'

import type { Service } from '@agents/entities/services'
import { BaselinePackageTableCell } from '../BaselinePackageTableCell'
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
import { ViewPackageTableCell } from '../ViewPackageTableCell'
import {
  type DiscoveredServiceGroup,
  discoveredServiceGroupOf,
  WITH_BASELINE_PACKAGE_GROUP,
  WITHOUT_API_DOCUMENTS_GROUP,
  WITHOUT_BASELINE_PACKAGE_GROUP,
} from './discoveredServiceGroups'
import { DiscoverServicesStepToolbar } from './DiscoverServicesStepToolbar'

type DiscoveredServiceRow = Partial<{
  service: Service
  spec: Spec
  children: DiscoveredServiceRow[]
}>

type DiscoveredServiceSectionHeader = Readonly<{
  group: DiscoveredServiceGroup
  title: string
  tooltip: string
}>

type DiscoveredServicesProps = {
  services: ReadonlyArray<Service>
  isDiscoveryRunning: boolean
  onRestartDiscovery: () => void
}

// In the order of the design
const DISCOVERED_SERVICE_SECTION_HEADERS: ReadonlyArray<DiscoveredServiceSectionHeader> = [
  {
    group: WITH_BASELINE_PACKAGE_GROUP,
    title: 'Services with Baseline Package',
    tooltip:
      'These services have a linked baseline package and API documents discovered in the selected cloud and namespace. You can select them when you create a snapshot on the next step.',
  },
  {
    group: WITHOUT_BASELINE_PACKAGE_GROUP,
    title: 'Services without a Baseline Package',
    tooltip:
      'These services were discovered but no baseline package is linked to them. You can include them in a snapshot only when the baseline version is No previous version. They cannot be promoted until a baseline package is configured.',
  },
  {
    group: WITHOUT_API_DOCUMENTS_GROUP,
    title: 'Services without API Documents',
    tooltip:
      'These services were discovered but the agent found no API documents to publish. They cannot be selected for a snapshot.',
  },
]

const DISCOVERED_SERVICE_COLUMNS: ReadonlyArray<ServiceTableColumn<DiscoveredServiceRow>> = [
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
]

const viewPackageLink: ServiceTableLink<DiscoveredServiceRow> = row => <ViewPackageTableCell value={row} />

export const DiscoveredServices: FC<DiscoveredServicesProps> = memo<DiscoveredServicesProps>(({
  services,
  isDiscoveryRunning,
  onRestartDiscovery,
}) => {
  const [searchValue, setSearchValue] = useState('')

  const sections = useMemo<ReadonlyArray<ServiceSectionModel<DiscoveredServiceRow>>>(
    () =>
      DISCOVERED_SERVICE_SECTION_HEADERS.map(({ group, title, tooltip }) => ({
        id: group,
        title: title,
        tooltip: tooltip,
        columns: DISCOVERED_SERVICE_COLUMNS,
        link: viewPackageLink,
        rows: services
          .filter(service => discoveredServiceGroupOf(service) === group)
          .map(service => ({
            service: service,
            children: service.specs?.map(spec => ({ spec })),
          })),
      })),
    [services],
  )

  return (
    <>
      <DiscoverServicesStepToolbar
        isDiscoveryRunning={isDiscoveryRunning}
        onRestartDiscovery={onRestartDiscovery}
        onSearch={setSearchValue}
      />
      <ServiceSections sections={sections} searchValue={searchValue} isLoading={false} />
    </>
  )
})

DiscoveredServices.displayName = 'DiscoveredServices'
