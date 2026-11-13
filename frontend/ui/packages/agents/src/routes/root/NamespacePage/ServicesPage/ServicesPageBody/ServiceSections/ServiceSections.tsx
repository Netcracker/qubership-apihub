import { Box, styled } from '@mui/material'
import { type ReactElement, useMemo } from 'react'

import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { genericMemo } from '@netcracker/qubership-apihub-ui-shared/utils/components'

import { filterRowsBySearch } from './serviceRows'
import { ServiceSection, type ServiceSectionModel } from './ServiceSection'
import type { ServiceTableRow } from './ServiceTable'

const NO_SERVICES = 'No services'

type ServiceSectionsProps<TRow extends ServiceTableRow<TRow>> = {
  sections: ReadonlyArray<ServiceSectionModel<TRow>>
  searchValue: string
  isLoading: boolean
}

function ServiceSectionsComponent<TRow extends ServiceTableRow<TRow>>({
  sections,
  searchValue,
  isLoading,
}: ServiceSectionsProps<TRow>): ReactElement {
  // While the services load, every section stays, so its table shows the loading rows
  const shownSections = useMemo(
    () =>
      sections
        .map(section => ({ ...section, rows: filterRowsBySearch(section.rows, searchValue) }))
        .filter(({ rows }) => isLoading || isNotEmpty(rows)),
    [isLoading, searchValue, sections],
  )

  return (
    <Placeholder
      invisible={isNotEmpty(shownSections)}
      area={CONTENT_PLACEHOLDER_AREA}
      message={searchValue ? NO_SEARCH_RESULTS : NO_SERVICES}
    >
      <SectionList>
        {shownSections.map(section => <ServiceSection key={section.id} section={section} isLoading={isLoading} />)}
      </SectionList>
    </Placeholder>
  )
}

ServiceSectionsComponent.displayName = 'ServiceSections'

export const ServiceSections = genericMemo(ServiceSectionsComponent)

// The sections scroll together inside the step, so the footer of the wizard stays in view
const SectionList = styled(Box)(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  marginTop: theme.spacing(1),
}))
