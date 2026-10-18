import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import type { SelectChangeEvent } from '@mui/material/Select'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import { type ChangeEvent, type ReactElement, type ReactNode, useCallback, useMemo } from 'react'

import type { ApiType } from '../entities/api-types'
import { type ContractType, getRouteApiTypeTitle, isApiContract } from '../entities/contract-types'
import type { ApiTypeProblemDetails } from '../hooks/versions/apiTypeProblemDetails'
import { genericMemo } from '../utils/components'
import { ApiTypeErrorIndicator } from './ErrorIndicators/ApiTypeErrorIndicator'
import { FilledSelectField } from './FilledSelectField'
import type { TestableProps } from './Testable'

type ApiTypeSelectorOption = ApiType | ContractType | 'all'

type ApiTypeSelectorProps<T extends ApiTypeSelectorOption> = TestableProps & {
  apiType: T
  allowedApiTypes: ReadonlyArray<T>
  apiTypeProblems?: Partial<Record<T, ApiTypeProblemDetails>>
  onChange?: (apiType: T) => void
}

function ApiTypeSelectorComponent<T extends ApiTypeSelectorOption>({
  apiType,
  allowedApiTypes,
  apiTypeProblems,
  onChange,
  'data-testid': dataTestId = 'ApiTypeSelector',
}: ApiTypeSelectorProps<T>): ReactElement {
  const handleChange = useCallback((
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent,
  ): void => {
    const { value } = event.target
    if (isAllowedApiType(value, allowedApiTypes)) {
      onChange?.(value)
    }
  }, [allowedApiTypes, onChange])

  const renderValue = useCallback((selected: unknown): ReactNode => {
    if (!isAllowedApiType(selected, allowedApiTypes)) {
      return null
    }

    return (
      <SelectedItemContainer>
        <Typography noWrap variant="inherit">
          {getOptionTitle(selected)}
        </Typography>
        <ApiTypeErrorIndicator
          problem={apiTypeProblems?.[selected]}
          tabIndex={-1}
        />
      </SelectedItemContainer>
    )
  }, [allowedApiTypes, apiTypeProblems])

  const menuItems = useMemo(() =>
    allowedApiTypes.map(type => (
      <MenuItem
        key={type}
        value={type}
        data-testid={`MenuItem-${type}`}
      >
        <MenuItemContainer>
          <MenuItemTitle noWrap variant="inherit">
            {getOptionTitle(type)}
          </MenuItemTitle>
          <ApiTypeErrorIndicator
            problem={apiTypeProblems?.[type]}
            showTooltip={false}
            fontSize="extra-small"
          />
        </MenuItemContainer>
      </MenuItem>
    )), [allowedApiTypes, apiTypeProblems])

  return (
    <FilledSelectField
      value={apiType}
      onChange={handleChange}
      renderValue={renderValue}
      maxWidth={220}
      data-testid={dataTestId}
    >
      {menuItems}
    </FilledSelectField>
  )
}

ApiTypeSelectorComponent.displayName = 'ApiTypeSelector'

export const ApiTypeSelector = genericMemo(ApiTypeSelectorComponent)

function isAllowedApiType<T extends ApiTypeSelectorOption>(
  value: unknown,
  allowedApiTypes: ReadonlyArray<T>,
): value is T {
  return allowedApiTypes.some(type => type === value)
}

function getOptionTitle(type: string): string {
  return isApiContract(type) ? getRouteApiTypeTitle(type) : 'All'
}

const SelectedItemContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const MenuItemContainer = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: '100%',
}))

const MenuItemTitle = styled(Typography)({
  flexGrow: 1,
})
