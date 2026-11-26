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
import { type FC, Fragment, type ReactElement, type ReactNode, useId, useState } from 'react'

import { InfoHint, VISIBLE_ON_HOVER_HOST_STYLES } from '@netcracker/qubership-apihub-ui-shared/components/InfoHint'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import {
  SERVICE_SECTION_HEADER_BACKGROUND_COLOR,
  SERVICE_SECTION_HEADER_EXPANDED_BACKGROUND_COLOR,
  SERVICE_SECTION_HEADER_EXPANDED_HOVER_BACKGROUND_COLOR,
  SERVICE_SECTION_HEADER_HOVER_BACKGROUND_COLOR,
} from '@netcracker/qubership-apihub-ui-shared/themes/colors'
import type { Pixel } from '@netcracker/qubership-apihub-ui-shared/utils/types'

import {
  type ServiceSelection,
  ServiceTable,
  type ServiceTableColumn,
  type ServiceTableLink,
  type ServiceTableRow,
} from './ServiceTable'

const SECTION_HEADER_CHEVRON_SIZE: Pixel = 16
// The part of a summary value that stays visible however narrow the header is, so the pointer can reach its tooltip
const SUMMARY_VALUE_MIN_WIDTH: Pixel = 32
// With the column gap, a value stands 24 px before the next label, as in the design
const SUMMARY_GROUP_GAP: Pixel = 20
const SUMMARY_COLUMN_GAP: Pixel = 4
// The small info icon after the last value, and its gap
const SUMMARY_HINT_WIDTH: Pixel = 24
// The icon of a status, its gap, and a part of its text
const SUMMARY_STATUS_MIN_WIDTH: Pixel = 56

export type ServiceSectionSummaryItem = Readonly<{
  label: string
  value: string
}>

export type ServiceSectionModel<TRow extends ServiceTableRow<TRow>> = Readonly<{
  /** Unique among the sections of a step. */
  id: string
  /**
   * A plain title, or the label and value pairs of a summary, such as the versions of a snapshot, which spread over
   * the width of the header.
   */
  title: string | ReadonlyArray<ServiceSectionSummaryItem>
  tooltip?: string
  /**
   * Shown at the right end of the header, such as the publication status of a snapshot. `null` keeps its place in a
   * summary empty, so the summary does not move when the status shows.
   */
  status?: ReactNode
  columns: ReadonlyArray<ServiceTableColumn<TRow>>
  link?: ServiceTableLink<TRow>
  rows: TRow[]
  /** Set only on a section where the user picks services; its rows then get checkboxes. */
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
  const hint = tooltip && <InfoHint tooltip={tooltip} descriptionId={hintId} data-testid="ServiceSectionInfoHint" />
  const isSummary = typeof title !== 'string'

  return (
    <SectionRoot
      square
      hasSummary={isSummary}
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
        {!isSummary
          ? (
            <>
              <SectionTitle>
                <Typography component="span" variant="subtitle1" noWrap>
                  {title}
                </Typography>
                {hint}
              </SectionTitle>
              {status && <SectionStatus data-testid="ServiceSectionStatus">{status}</SectionStatus>}
            </>
          )
          : <SectionSummary items={title} hint={hint} status={status} />}
      </SectionHeader>
      <SectionDetails>
        <ServiceTable columns={columns} link={link} rows={rows} selection={selection} isLoading={isLoading} />
      </SectionDetails>
    </SectionRoot>
  )
}

ServiceSection.displayName = 'ServiceSection'

type SectionSummaryProps = {
  items: ReadonlyArray<ServiceSectionSummaryItem>
  hint: ReactNode
  status: ReactNode
}

const SectionSummary: FC<SectionSummaryProps> = ({ items, hint, status }) => (
  <SectionSummaryRoot templateColumns={getSummaryColumns(items.length, !!hint, status !== undefined)}>
    {items.map(({ label, value }, index) => (
      <Fragment key={label}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <SectionSummaryValue>
          <OverflowTooltip title={value}>
            <Typography variant="subtitle4" noWrap>{value}</Typography>
          </OverflowTooltip>
          {index === items.length - 1 && hint}
        </SectionSummaryValue>
      </Fragment>
    ))}
    {status && <SectionSummaryStatus data-testid="ServiceSectionStatus">{status}</SectionSummaryStatus>}
  </SectionSummaryRoot>
)

SectionSummary.displayName = 'SectionSummary'

// A section with a summary keeps the minimum width of its header: in a narrower list the list scrolls, and the header
// still holds its status
const SectionRoot = styled(Accordion, { shouldForwardProp: prop => prop !== 'hasSummary' })<{ hasSummary: boolean }>(
  ({ hasSummary }) => ({
    minWidth: hasSummary ? 'min-content' : undefined,
  }),
)

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
  ...VISIBLE_ON_HOVER_HOST_STYLES,
}))

// The info icon stands closer to the title than the chevron does
const SectionTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  minWidth: 0,
}))

// The table sizes its columns to the width of the section, so its own width must not hold the section wide
const SectionDetails = styled(AccordionDetails)(({ theme }) => ({
  paddingTop: theme.spacing(1),
  contain: 'inline-size',
}))

const SectionStatus = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginLeft: 'auto',
})

// The values keep the black of the design inside the grey header
const SectionSummaryRoot = styled(Box, { shouldForwardProp: prop => prop !== 'templateColumns' })<{
  templateColumns: string
}>(({ theme, templateColumns }) => ({
  display: 'grid',
  gridTemplateColumns: templateColumns,
  alignItems: 'center',
  columnGap: SUMMARY_COLUMN_GAP,
  flex: 1,
  minWidth: 0,
  color: theme.palette.common.black,
}))

const SectionSummaryValue = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: SUMMARY_COLUMN_GAP,
  minWidth: 0,
  paddingRight: SUMMARY_GROUP_GAP,
})

const SectionSummaryStatus = styled(Box)({
  display: 'flex',
  justifyContent: 'flex-end',
  minWidth: 0,
})

// Each label keeps its width, and the values and the status share the rest equally, so the items of the sections line
// up whatever their values are
function getSummaryColumns(itemCount: number, hasHint: boolean, hasStatus: boolean): string {
  const itemColumns = Array.from({ length: itemCount }, (_, index) => {
    const hintWidth = hasHint && index === itemCount - 1 ? SUMMARY_HINT_WIDTH : 0
    return `max-content minmax(${SUMMARY_GROUP_GAP + SUMMARY_VALUE_MIN_WIDTH + hintWidth}px, 1fr)`
  })
  const statusColumns = hasStatus ? [`minmax(${SUMMARY_STATUS_MIN_WIDTH}px, 1fr)`] : []
  return [...itemColumns, ...statusColumns].join(' ')
}
