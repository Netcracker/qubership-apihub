import { MenuItem, Select, type SelectChangeEvent } from '@mui/material'
import {
  RULESET_API_TYPE_TITLE_MAP,
  type RulesetApiType,
  RulesetApiTypes,
} from '@netcracker/qubership-apihub-ui-portal/src/entities/api-quality/rulesets'
import { type FC, memo } from 'react'

const STYLE = {
  '& .MuiSelect-select': {
    pt: 0.75,
    pb: 0.75,
  },
  minWidth: '110px',
}

const MENU_PROPS = {
  PaperProps: {
    sx: {
      borderRadius: 1.5,
    },
  },
}

const INPUT_PROPS = { 'aria-label': 'API Type' }

type RulesetApiTypeSelectorProps = {
  apiType: RulesetApiType
  onChange?: (event: SelectChangeEvent) => void
}

export const RulesetApiTypeSelector: FC<RulesetApiTypeSelectorProps> = memo<RulesetApiTypeSelectorProps>(({
  apiType,
  onChange,
}) => {
  return (
    <Select
      variant="filled"
      value={apiType}
      onChange={onChange}
      sx={STYLE}
      inputProps={INPUT_PROPS}
      MenuProps={MENU_PROPS}
      data-testid="RulesetTypeSelect"
    >
      {Object.values(RulesetApiTypes).map(apiType => (
        <MenuItem
          key={apiType}
          value={apiType}
          data-testid={`MenuItem-${apiType}`}
        >
          {RULESET_API_TYPE_TITLE_MAP[apiType]}
        </MenuItem>
      ))}
    </Select>
  )
})

RulesetApiTypeSelector.displayName = 'RulesetApiTypeSelector'
