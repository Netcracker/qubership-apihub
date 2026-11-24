import type { FC } from 'react'
import { memo } from 'react'
import { Box, CircularProgress } from '@mui/material'
import type {
  ContractElementSearchResult,
  DocumentSearchResult,
  PackageSearchResult,
} from '@portal/entities/global-search'

export type SearchResultTabLabelProps = {
  label: string
  results: Array<PackageSearchResult | DocumentSearchResult | ContractElementSearchResult>
  isLoading: boolean
}

export const SearchResultTabLabel: FC<SearchResultTabLabelProps> = memo<SearchResultTabLabelProps>(({
  isLoading,
  results,
  label,
}) => {
  return (
    <Box display="flex" gap={1}>
      <Box>{label}</Box>
      <>
        {isLoading ? <CircularProgress size={14}/> : countSearchResult(results)}
      </>
    </Box>
  )
})

function countSearchResult(
  value: Array<PackageSearchResult | DocumentSearchResult | ContractElementSearchResult>,
): string | number | undefined {
  const { length } = value
  if (length === 0) {
    return undefined
  }

  return length > 99 ? '99+' : length
}
