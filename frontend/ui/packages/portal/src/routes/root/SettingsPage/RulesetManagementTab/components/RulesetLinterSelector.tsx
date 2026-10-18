import type { Linter } from '@apihub/entities/api-quality/linters'
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material'
import { memo, type FC } from 'react'

const STYLE = {
  minWidth: 170,
}

const MENU_PROPS = {
  PaperProps: {
    sx: {
      borderRadius: 1.5,
    },
  },
}

const INPUT_PROPS = { 'aria-label': 'API Type' }

type RulesetLinterSelectorProps = {
  loading: boolean
  linterList: readonly Linter[]
  selectedLinter: Linter
  onChange?: (event: SelectChangeEvent) => void
}

export const RulesetLinterSelector: FC<RulesetLinterSelectorProps> = memo<RulesetLinterSelectorProps>((props) => {
  const { linterList, selectedLinter, onChange } = props

  return (
    <FormControl sx={STYLE} variant="filled">
      <InputLabel id="demo-select-small-label">Linter</InputLabel>
      <Select
        labelId='demo-select-small-label'
        variant="filled"
        value={selectedLinter.linter}
        onChange={onChange}
        sx={STYLE}
        inputProps={INPUT_PROPS}
        MenuProps={MENU_PROPS}
        data-testid="RulesetLinterSelect"
        label='Linter'
      >
        {linterList.map(linter => (
          <MenuItem
            key={`linter-option-${linter.linter}`}
            value={linter.linter}
            data-testid={`MenuItem-${linter.linter}`}
          >
            {linter.displayName}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
})

RulesetLinterSelector.displayName = 'RulesetLinterSelector'
