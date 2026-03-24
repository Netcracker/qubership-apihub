import { RulesetStatuses, type RulesetMetadata } from '@apihub/entities/api-quality/rulesets'
import { LINTER_API_TYPE_TITLE_MAP } from '@apihub/entities/api-quality/linter-api-types'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { Box, Link, Skeleton } from '@mui/material'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import capitalize from 'lodash-es/capitalize'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useLinters } from '@apihub/api-hooks/ApiQuality/useLinters'
import { getLinterName } from '@apihub/utils/api-quality/linters'

type ValidationRulesetLinkProps = {
  data: RulesetMetadata | undefined
  loading: IsLoading
}

// First Order Component
export const ValidationRulesetLink: FC<ValidationRulesetLinkProps> = memo<ValidationRulesetLinkProps>(props => {
  const { data, loading } = props

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

  return (
    <Box display='flex' justifyContent='space-between' alignItems='center' gap={1} width='100%' minWidth={0}>
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
      <Box display='flex' gap={1} flexShrink={0}>
        <CustomChip
          key={`validation-ruleset-link-api-type-${data.apiType}`}
          value='rulesetSpecType'
          sx={{ m: 0 }}
          label={LINTER_API_TYPE_TITLE_MAP[data.apiType]}
          data-testid="ValidationRulesetApiTypeChip"
        />
        <CustomChip
          key='validation-ruleset-link-status'
          value={data.status === RulesetStatuses.ACTIVE ? 'rulesetActive' : 'rulesetInactive'}
          sx={{ m: 0 }}
          label={capitalize(data.status)}
          data-testid="ValidationRulesetStatusChip"
        />
      </Box>
    </Box>
  )
})
