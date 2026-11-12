import type { FC } from 'react'
import { memo } from 'react'
import { Box, Grid, Typography } from '@mui/material'
import { TitledValue } from './TitledValue'

export type GroupDetails = Partial<{
  name: string
  parentGroup: string
  alias: string
  description: string
}>

export const GroupDetails: FC<GroupDetails> = memo<GroupDetails>(({
  name,
  parentGroup,
  alias,
  description,
}) => {
  return (
    <Box marginTop={2} height="100%" overflow="hidden">
      <Grid item xs container spacing={2} height="100%" overflow="auto">
        <Grid item xs={12}>
          <TitledValue
            title="Group name"
            value={name}
          />
        </Grid>
        <Grid item xs={12}>
          <TitledValue
            title="Alias"
            value={alias}
          />
        </Grid>
        <Grid item xs={12}>
          <TitledValue
            title="Parent group"
            value={parentGroup}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2">Description</Typography>
          <Typography variant="body2">{description}</Typography>
        </Grid>
      </Grid>
    </Box>
  )
})
