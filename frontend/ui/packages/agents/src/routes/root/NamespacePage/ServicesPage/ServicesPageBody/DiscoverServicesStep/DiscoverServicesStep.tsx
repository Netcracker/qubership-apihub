import type { FC } from 'react'
import { memo, useMemo, useState } from 'react'
import { useServices } from '../../../useServices'
import { DiscoverServicesStepTable } from './DiscoverServicesStepTable'
import { DiscoverServicesStepToolbar } from './DiscoverServicesStepToolbar'
import { filterServices } from '../../services'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

export const DiscoverServicesStep: FC = memo(() => {
  const [{ services }, isLoading] = useServices()

  const [searchValue, setSearchValue] = useState('')
  const filteredServices = useMemo(() => filterServices(searchValue, services), [searchValue, services])

  return (
    <>
      <DiscoverServicesStepToolbar onSearch={setSearchValue}/>
      <Placeholder
        invisible={isNotEmpty(filteredServices) || isLoading}
        area={CONTENT_PLACEHOLDER_AREA}
        message={searchValue ? NO_SEARCH_RESULTS: 'No services'}
      >
        <DiscoverServicesStepTable value={filteredServices} isLoading={isLoading}/>
      </Placeholder>
    </>
  )
})
