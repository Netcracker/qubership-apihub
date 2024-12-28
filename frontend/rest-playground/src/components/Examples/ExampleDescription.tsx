import * as React from 'react'
import { FC, memo } from 'react'
import { Typography } from '@mui/material'

export type ExampleDescriptionProps = {
  description: string | undefined;
};
export const ExampleDescription: FC<ExampleDescriptionProps> = memo<ExampleDescriptionProps>(({ description }) => {
  if (!description) {
    return null
  }

  return (
    <Typography sx={{ mt: 2 }} variant="inherit">
      {description}
    </Typography>
  )
})
