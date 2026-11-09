import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  accordionSummaryClasses,
  Box,
  styled,
  Typography,
} from '@mui/material'
import { type ReactElement, type ReactNode, useId, useState } from 'react'

import {
  SERVICE_SECTION_HEADER_BACKGROUND_COLOR,
  SERVICE_SECTION_HEADER_EXPANDED_BACKGROUND_COLOR,
  SERVICE_SECTION_HEADER_EXPANDED_HOVER_BACKGROUND_COLOR,
  SERVICE_SECTION_HEADER_HOVER_BACKGROUND_COLOR,
} from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

import { INFO_HINT_HOST_STYLES, InfoHint } from '@agents/components/InfoHint'
import {
  type ServiceSelection,
  ServiceTable,
  type ServiceTableColumn,
  type ServiceTableLink,
  type ServiceTableRow,
} from './ServiceTable'

const SECTION_HEADER_CHEVRON_SIZE: Pixel = 16
const SECTION_HEADER_INFO_HINT_SIZE: Pixel = 20

export type ServiceSectionModel<TRow extends ServiceTableRow<TRow>> = Readonly<{
  // Unique among the sections of a step
  id: string
  title: ReactNode
  tooltip?: string
  // Stands at the right end of the header, such as the publication status of a snapshot
  status?: ReactNode
  columns: ReadonlyArray<ServiceTableColumn<TRow>>
  link?: ServiceTableLink<TRow>
  rows: TRow[]
  // Only a section where the user picks services has one; its rows then carry checkboxes
  selection?: ServiceSelection
}>

type ServiceSectionProps<TRow extends ServiceTableRow<TRow>> = {
  section: ServiceSectionModel<TRow>
  isLoading: boolean
}

export function ServiceSection<TRow extends ServiceTableRow<TRow>>({
  section: { id, title, tooltip, status, columns, link, rows, selection },
  isLoading,
}: ServiceSectionProps<TRow>): ReactElement {
  const [expanded, setExpanded] = useState(true)
  const baseId = useId()
  const hintId = `${baseId}-hint`

  return (
    <Accordion
      square
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      data-testid={`ServiceSection-${id}`}
    >
      <SectionHeader
        id={`${baseId}-header`}
        aria-controls={`${baseId}-content`}
        aria-describedby={tooltip ? hintId : undefined}
        data-testid="ServiceSectionHeader"
      >
        {expanded
          ? <KeyboardArrowDownIcon sx={{ fontSize: SECTION_HEADER_CHEVRON_SIZE }} />
          : <KeyboardArrowRightIcon sx={{ fontSize: SECTION_HEADER_CHEVRON_SIZE }} />}
        <SectionTitle>
          <Typography component="span" variant="subtitle1" noWrap>
            {title}
          </Typography>
          {tooltip && (
            <InfoHint
              title={tooltip}
              size={SECTION_HEADER_INFO_HINT_SIZE}
              descriptionId={hintId}
              data-testid="ServiceSectionInfoHint"
            />
          )}
        </SectionTitle>
        {status && <SectionStatus>{status}</SectionStatus>}
      </SectionHeader>
      <SectionDetails>
        <ServiceTable columns={columns} link={link} rows={rows} selection={selection} isLoading={isLoading} />
      </SectionDetails>
    </Accordion>
  )
}

ServiceSection.displayName = 'ServiceSection'

const SectionHeader = styled(AccordionSummary)(({ theme }) => ({
  minHeight: 44,
  padding: theme.spacing(0, 1.5),
  borderRadius: 6,
  backgroundColor: SERVICE_SECTION_HEADER_BACKGROUND_COLOR,
  // The chevrons take this color; the title keeps the black of its variant
  color: theme.palette.text.secondary,
  // MUI greys a summary with keyboard focus; the outline of the theme marks that focus instead
  [`&.${accordionSummaryClasses.focusVisible}`]: {
    backgroundColor: SERVICE_SECTION_HEADER_BACKGROUND_COLOR,
  },
  '&:hover': {
    backgroundColor: SERVICE_SECTION_HEADER_HOVER_BACKGROUND_COLOR,
  },
  [`&.${accordionSummaryClasses.expanded}`]: {
    backgroundColor: SERVICE_SECTION_HEADER_EXPANDED_BACKGROUND_COLOR,
  },
  [`&.${accordionSummaryClasses.expanded}:hover`]: {
    backgroundColor: SERVICE_SECTION_HEADER_EXPANDED_HOVER_BACKGROUND_COLOR,
  },
  [`& .${accordionSummaryClasses.content}`]: {
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
  },
  ...INFO_HINT_HOST_STYLES,
}))

// The info icon stands closer to the title than the chevron does
const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minWidth: 0,
}))

const SectionDetails = styled(AccordionDetails)(({ theme }) => ({
  paddingTop: theme.spacing(1),
}))

const SectionStatus = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
})
