import { RULESET_API_TYPE_TITLE_MAP, RulesetStatuses, type RulesetMetadata } from '@apihub/entities/api-quality/rulesets'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { Box, Link, Skeleton, Typography } from '@mui/material'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import capitalize from 'lodash-es/capitalize'
import type { FC, ReactElement } from 'react'
import { memo, useCallback } from 'react'

type ValidationRulesetLinkProps = {
  data: RulesetMetadata | undefined
  loading: IsLoading
  showLabel?: boolean
}

// First Order Component
export const ValidationRulesettLink: FC<ValidationRulesetLinkProps> = memo<ValidationRulesetLinkProps>(props => {
  const { data, loading, showLabel = true } = props

  const { showRulesetInfoDialog } = useEventBus()

  const onClickRulesetName = useCallback(
    () => data && showRulesetInfoDialog(data),
    [data, showRulesetInfoDialog],
  )

  if (loading) {
    return <Skeleton variant="rectangular" width={100} height={20} />
  }

  if (!data) { // Just type guard
    return null
  }

  const elements: ReactElement[] = []

  elements.push(
    <Typography
      key='validation-ruleset-link-name'
      variant='body2'
      onClick={onClickRulesetName}
    >
      <Link>
        {data.name}
      </Link>
    </Typography>,
  )

  elements.push(
    <CustomChip
      key={`validation-ruleset-link-api-type-${data.apiType}`}
      value='rulesetSpecType'
      sx={{ m: 0 }}
      label={RULESET_API_TYPE_TITLE_MAP[data.apiType]}
    />,
  )

  elements.push(
    <CustomChip
      key='validation-ruleset-link-status'
      value={data.status === RulesetStatuses.ACTIVE ? 'rulesetActive' : 'rulesetInactive'}
      sx={{ m: 0 }}
      label={capitalize(data.status)}
    />,
  )

  if (showLabel) {
    elements.splice(0, 0, (
      <Typography
        key='validation-ruleset-link-label'
        variant='body2'
        component='span'
      >
        Ruleset
      </Typography>
    ))
  }

  if (elements.length === 0) {
    return elements[0]
  }

  return (
    <Box display='flex' alignItems='center' gap={1}>
      {elements}
    </Box>
  )
})
