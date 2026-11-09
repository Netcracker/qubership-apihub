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

import { type FC, memo, useMemo, useState } from 'react'

import type { Spec } from '@netcracker/qubership-apihub-ui-shared/entities/specs'

import type { Service } from '@agents/entities/services'
import { useServices } from '../../../useServices'
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
import { DiscoverServicesStepToolbar } from './DiscoverServicesStepToolbar'

const DISCOVERED_SERVICES_SECTION_ID = 'discovered-services'

type DiscoveredServiceRow = Partial<{
  service: Service
  spec: Spec
  children: DiscoveredServiceRow[]
}>

const DISCOVERED_SERVICE_COLUMNS: ReadonlyArray<ServiceTableColumn<DiscoveredServiceRow>> = [
  {
    id: SERVICE_OR_DOCUMENTATION_COLUMN_ID,
    header: 'Service / Documentation',
    cell: row => <ServiceOrDocumentationTableCell value={row}/>,
  },
  {
    id: SERVICE_LABELS_COLUMN_ID,
    header: 'Labels',
    cell: row => <ServiceLabelsTableCell value={row}/>,
  },
  {
    id: BASELINE_PACKAGE_COLUMN_ID,
    header: 'Baseline Package',
    cell: row => <BaselinePackageTableCell value={row}/>,
  },
]

const viewPackageLink: ServiceTableLink<DiscoveredServiceRow> = row => <ViewPackageTableCell value={row}/>

export const DiscoverServicesStep: FC = memo(() => {
  const [{ services }, isLoading] = useServices()
  const [searchValue, setSearchValue] = useState('')

  // TODO(ui-agents): group the services by what discovery found in them
  const sections = useMemo<ReadonlyArray<ServiceSectionModel<DiscoveredServiceRow>>>(() => [{
    id: DISCOVERED_SERVICES_SECTION_ID,
    title: 'Discovered Services',
    columns: DISCOVERED_SERVICE_COLUMNS,
    link: viewPackageLink,
    rows: services.map(service => ({
      service: service,
      children: service.specs?.map(spec => ({ spec })),
    })),
  }], [services])

  return (
    <>
      <DiscoverServicesStepToolbar onSearch={setSearchValue}/>
      <ServiceSections sections={sections} searchValue={searchValue} isLoading={isLoading}/>
    </>
  )
})

DiscoverServicesStep.displayName = 'DiscoverServicesStep'
