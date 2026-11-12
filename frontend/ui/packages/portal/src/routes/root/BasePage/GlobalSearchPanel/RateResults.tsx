import type { FC } from 'react'
import { memo } from 'react'
import { hasSearchText } from './search-text'
import { Box, Typography } from '@mui/material'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'

type RateResultsProps = {
  searchText: string
  serviceName?: string | undefined
  packageKey?: string | undefined
  labels?: string[] | undefined
}

export const RateResults: FC<RateResultsProps> = memo<RateResultsProps>(({
  searchText,
  serviceName,
  packageKey,
  labels,
}) => {
  if (serviceName && hasSearchText(serviceName, searchText)) {
    return (
      <Box display="flex" gap={1} alignItems="center">
        <Typography variant="body2">Service name</Typography>
        <Typography variant="subtitle2">{serviceName}</Typography>
      </Box>
    )
  }
  if (packageKey && hasSearchText(packageKey, searchText)) {
    return (
      <OverflowTooltip title={packageKey}>
        <Typography noWrap textOverflow="ellipsis" overflow="hidden" variant="subtitle2">{packageKey}</Typography>
      </OverflowTooltip>
    )
  }
  if (labels?.some(label => hasSearchText(label, searchText))) {
    return <>
      {labels.map(label => (
        <CustomChip
          key={`rate-results-custom-chip-${label}`}
          sx={{ mr: 1 }}
          value={label}
        />
      ))}
    </>
  }

  return null
})
