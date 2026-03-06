import type { IssueSeverity } from '@apihub/entities/api-quality/issue-severities'
import { ISSUE_SEVERITIES_LIST } from '@apihub/entities/api-quality/issue-severities'
import type { Issue } from '@apihub/entities/api-quality/issues'
import { IssueSeverityMarker } from '@apihub/routes/root/PortalPage/VersionPage/VersionApiQualitySubPage/IssueSeverityMarker'
import { Box, ToggleButton, Typography } from '@mui/material'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import { memo, useMemo, type FC } from 'react'

type IssueSeverityFiltersProps = {
  data: Issue[]
  filters: IssueSeverity[]
  handleFilters: (filters: IssueSeverity[]) => void
}

export const IssueSeverityFilters: FC<IssueSeverityFiltersProps> = memo((props) => {
  const { data, filters, handleFilters } = props

  const summary: Record<IssueSeverity, number> = useMemo(() => (
    data.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1
      return acc
    }, {} as Record<IssueSeverity, number>)
  ), [data])

  const layout = ISSUE_SEVERITIES_LIST.map(severity => {
    return (
      <ToggleButton
        key={severity}
        value={severity}
        data-testid={`IssueSeverityFilterButton-${severity}`}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IssueSeverityMarker
            severity={severity}
          />
          <Typography
            variant="body2"
            fontWeight={500}
          >
            {summary[severity] ?? 0}
          </Typography>
        </Box>
      </ToggleButton>
    )
  })

  return (
    <CustomToggleButtonGroup
      aria-label="text alignment"
      customLastButton={false}
      value={filters}
      onClick={handleFilters}
    >
      {layout}
    </CustomToggleButtonGroup>
  )
})
