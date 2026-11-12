import type { FC } from 'react'
import { memo } from 'react'
import type { CustomChipProps } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import type { SemanticChipColor } from '@netcracker/qubership-apihub-ui-shared/components/semantic-chip-styles'
import { mergeChipSx, semanticChipSx } from '@netcracker/qubership-apihub-ui-shared/components/semantic-chip-styles'
import type { RulesetStatus } from '@portal/entities/api-quality/rulesets'
import { RulesetStatuses } from '@portal/entities/api-quality/rulesets'

export const RULESET_SPEC_TYPE_CHIP_COLOR: SemanticChipColor = {
  main: '#D6EDFF',
  contrastText: '#004EAE',
}

export const RULESET_STATUS_CHIP_COLORS: Record<RulesetStatus, SemanticChipColor> = {
  [RulesetStatuses.ACTIVE]: {
    main: '#D0FAD4',
    contrastText: '#026104',
  },
  [RulesetStatuses.INACTIVE]: {
    main: '#ECEDEF',
    contrastText: '#353C4E',
  },
}

export type RulesetSpecTypeChipProps = Omit<CustomChipProps, 'value' | 'color'>

export const RulesetSpecTypeChip: FC<RulesetSpecTypeChipProps> = memo<RulesetSpecTypeChipProps>(({
  sx,
  ...props
}) => (
  <CustomChip
    {...props}
    value="rulesetSpecType"
    sx={mergeChipSx(semanticChipSx(RULESET_SPEC_TYPE_CHIP_COLOR), sx)}
  />
))

export type RulesetStatusChipProps = {
  status: RulesetStatus
} & Omit<CustomChipProps, 'value' | 'color'>

export const RulesetStatusChip: FC<RulesetStatusChipProps> = memo<RulesetStatusChipProps>(({
  status,
  sx,
  ...props
}) => (
  <CustomChip
    {...props}
    value={status}
    sx={mergeChipSx(semanticChipSx(RULESET_STATUS_CHIP_COLORS[status]), sx)}
  />
))
