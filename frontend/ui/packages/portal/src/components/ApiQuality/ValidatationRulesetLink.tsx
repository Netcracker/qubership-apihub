import { type RulesetMetadata } from '@portal/entities/api-quality/rulesets'
import { LINTER_API_TYPE_TITLE_MAP } from '@portal/entities/api-quality/linter-api-types'
import { useEventBus } from '@portal/routes/EventBusProvider'
import { Box, Link, Skeleton } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { styled } from '@mui/material/styles'
import { RulesetSpecTypeChip, RulesetStatusChip } from '@portal/components/ApiQuality/RulesetChips'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import capitalize from 'lodash-es/capitalize'
import type { FC, ReactNode } from 'react'
import { memo, useCallback } from 'react'
import { useLinters } from '@portal/api-hooks/ApiQuality/useLinters'
import { getLinterName } from '@portal/utils/api-quality/linters'

type ValidationRulesetLinkProps = {
  data: RulesetMetadata | undefined
  loading: IsLoading
  // On overflow, hides the status chip, then the API type chip, then truncates the title.
  hideChipsOnOverflow?: boolean
  // Shown after the last visible chip. Works only with `hideChipsOnOverflow`.
  endAdornment?: ReactNode
}

const CHIP_HEIGHT = 24
// A small MUI icon.
const END_ADORNMENT_WIDTH = 20
const FIRST_FLOAT_WIDTH = 1
const CHIPS_MIN_WIDTH = FIRST_FLOAT_WIDTH + END_ADORNMENT_WIDTH
// A space, about three characters of the ruleset name, and an ellipsis.
const MIN_NAME_LENGTH = 5

const FIXED_CHIPS_LAYOUT: SxProps<Theme> = { display: 'flex', justifyContent: 'space-between' }

// The grid fills the title column first and gives the chips what is left.
function getCollapsibleChipsLayout(linterTitle: string): SxProps<Theme> {
  return {
    display: 'grid',
    gridTemplateColumns:
      `minmax(${linterTitle.length + MIN_NAME_LENGTH}ch, max-content) minmax(${CHIPS_MIN_WIDTH}px, 1fr)`,
    columnGap: theme => `calc(${theme.spacing(1)} - ${FIRST_FLOAT_WIDTH}px)`,
  }
}

// First Order Component
export const ValidationRulesetLink: FC<ValidationRulesetLinkProps> = memo<ValidationRulesetLinkProps>(props => {
  const { data, loading, hideChipsOnOverflow = false, endAdornment } = props

  const { showRulesetInfoDialog } = useEventBus()

  const onClickRulesetName = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.stopPropagation()
      event.preventDefault()
      data && showRulesetInfoDialog(data)
    },
    [data, showRulesetInfoDialog],
  )

  const { data: lintersList = [] } = useLinters()

  if (loading) {
    return <Skeleton variant="rectangular" width={100} height={20} />
  }

  if (!data) { // Just type guard
    return null
  }

  const linterId = data.linter
  const linterTitle = getLinterName(linterId, lintersList)
  const fullRulesetTitle = `${linterTitle} ${data.name}`

  const apiTypeChip = (
    <RulesetSpecTypeChip
      key={`validation-ruleset-link-api-type-${data.apiType}`}
      sx={{ m: 0 }}
      label={LINTER_API_TYPE_TITLE_MAP[data.apiType]}
      data-testid="ValidationRulesetApiTypeChip"
    />
  )
  const statusChip = (
    <RulesetStatusChip
      key='validation-ruleset-link-status'
      status={data.status}
      sx={{ m: 0 }}
      label={capitalize(data.status)}
      data-testid="ValidationRulesetStatusChip"
    />
  )

  return (
    <Box
      alignItems='center'
      width='100%'
      minWidth={0}
      sx={hideChipsOnOverflow ? getCollapsibleChipsLayout(linterTitle) : FIXED_CHIPS_LAYOUT}
    >
      <Box display='flex' gap={1} minWidth={0} flexGrow={1}>
        <TextWithOverflowTooltip
          data-id='overflowtext'
          tooltipText={fullRulesetTitle}
          sx={{
            display: 'block',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexGrow: 1,
          }}
        >
          {`${linterTitle} `}
          <Link
            data-testid="ValidationRulesetLinkName"
            onClick={onClickRulesetName}
            sx={{ display: 'inline' }}
          >
            {data.name}
          </Link>
        </TextWithOverflowTooltip>
      </Box>
      {hideChipsOnOverflow
        ? (
          <CollapsibleChips>
            <ChipSlot>{apiTypeChip}</ChipSlot>
            <ChipSlot>{statusChip}</ChipSlot>
            <EndAdornment>{endAdornment}</EndAdornment>
          </CollapsibleChips>
        )
        : (
          <Chips>
            {apiTypeChip}
            {statusChip}
          </Chips>
        )}
    </Box>
  )
})

const Chips = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing(1),
  marginLeft: theme.spacing(1),
}))

// A floated chip that does not fit drops below the first row, where the fixed height hides it.
// The inline end adornment follows the chips left in that row.
const CollapsibleChips = styled(Box)({
  boxSizing: 'content-box',
  maxWidth: 'max-content',
  height: CHIP_HEIGHT,
  paddingRight: END_ADORNMENT_WIDTH,
  overflow: 'hidden',
  // The button centers its text.
  textAlign: 'left',
  // A float alone in its row never drops, so an empty float goes first. It needs a width to count.
  '&::before': {
    content: '""',
    float: 'left',
    width: FIRST_FLOAT_WIDTH,
    height: CHIP_HEIGHT,
  },
})

const ChipSlot = styled(Box)(({ theme }) => ({
  display: 'flex',
  float: 'left',
  height: CHIP_HEIGHT,
  marginRight: theme.spacing(1),
}))

// The negative margin puts the adornment into the container's padding, so it never wraps.
const EndAdornment = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  width: END_ADORNMENT_WIDTH,
  height: CHIP_HEIGHT,
  marginRight: -END_ADORNMENT_WIDTH,
  verticalAlign: 'top',
})
