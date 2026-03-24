import type { RulesetMetadata } from '@apihub/entities/api-quality/rulesets'
import { Check } from '@mui/icons-material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import { Box, Button, List, ListItemButton, Skeleton, Typography } from '@mui/material'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { FC } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { ValidationRulesetLink } from './ValidatationRulesetLink'

type ValidationRulesetsDropdownProps = {
  options: RulesetMetadata[]
  onChange: (selected: Set<RulesetMetadata>) => void
  loading: IsLoading
}

const DropdownLabel: FC = () => {
  return <Typography variant="body2" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Validated by:</Typography>
}

const Dropdown: FC<ValidationRulesetsDropdownProps> = (props) => {
  const { options, onChange, loading } = props

  const [anchor, setAnchor] = useState<HTMLElement>()

  const [selectedValues, setSelectedValues] = useState<Set<RulesetMetadata>>(new Set())
  useEffect(() => {
    const initialValues = new Set(options)
    setSelectedValues(initialValues)
    onChange(initialValues)
  }, [onChange, options])

  const handleSelect = useCallback((option: RulesetMetadata) => {
    setSelectedValues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(option)) {
        newSet.delete(option)
      } else {
        newSet.add(option)
      }
      onChange(newSet)
      return newSet
    })
  }, [onChange])

  if (loading) {
    return <Skeleton variant="text" width={100} height={20} />
  }

  return (
    <Box flex='1 1 auto' maxWidth='400px' minWidth={0}>
      <Button
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          minWidth: 4,
          width: '100%',
          height: 20,
          minHeight: 20,
          p: 0,
          m: 0,
        }}
        variant="text"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        data-testid="ValidatedByLinterSelectorButton"
      >
        <Box display="flex" alignItems="center" gap={1} width="100%" minWidth={0}>
          <Box display="flex" alignItems="center" minWidth={0} flexGrow={1}>
            {selectedValues.size === 0 && (
              <Typography variant="body2" fontWeight={500}>No linters selected</Typography>
            )}
            {selectedValues.size === 1 && (
              <ValidationRulesetLink data={Array.from(selectedValues.values())[0]} loading={loading} />
            )}
            {selectedValues.size > 1 && (
              <Typography variant="body2" fontWeight={500}>{selectedValues.size} linters</Typography>
            )}
          </Box>
          {anchor
            ? <KeyboardArrowUpOutlinedIcon htmlColor='#353C4E' fontSize='small' />
            : <KeyboardArrowDownOutlinedIcon htmlColor='#353C4E' fontSize='small' />}
        </Box>
        <MenuButtonItems
          anchorEl={anchor}
          open={!!anchor}
          onClick={event => event.stopPropagation()}
          onClose={() => setAnchor(undefined)}
        >
          <List sx={{ maxWidth: '400px' }}>
            {options.map(option => {
              const isSelected = selectedValues.has(option)
              return (
                <ListItemButton
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    height: '36px',
                    minWidth: 0,
                  }}
                >
                  <Check htmlColor={isSelected ? '#353C4E' : 'transparent'} fontSize='small' />
                  <ValidationRulesetLink
                    data={option}
                    loading={loading}
                  />
                </ListItemButton>
              )
            })}
          </List>
        </MenuButtonItems>
      </Button>
    </Box>
  )
}

export const ValidationRulesetsDropdown: FC<ValidationRulesetsDropdownProps> = memo<ValidationRulesetsDropdownProps>((props) => {
  return (
    <Box display="flex" alignItems="center" gap={1} minWidth={0}>
      <DropdownLabel />
      <Dropdown {...props} />
    </Box>
  )
})
