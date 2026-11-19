import { Stack, Typography } from '@mui/material'
import { type FC, memo } from 'react'

import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

import type { LibraryVersion } from '@portal/entities/libraries'

type LibraryVersionBuildErrorProps = Readonly<{ version: LibraryVersion }>

export const LibraryVersionBuildError: FC<LibraryVersionBuildErrorProps> = memo<LibraryVersionBuildErrorProps>(
  ({ version }) => (
    <Placeholder
      invisible={false}
      area={CONTENT_PLACEHOLDER_AREA}
      message={
        <Stack role="alert" spacing={1} sx={{ minWidth: 0 }}>
          <Typography color="error" variant="h6">Build failed</Typography>
          {version.metadata?.buildError && (
            <Typography color="error" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {version.metadata.buildError}
            </Typography>
          )}
        </Stack>
      }
      data-testid="LibraryVersionBuildError"
    />
  ),
)
LibraryVersionBuildError.displayName = 'LibraryVersionBuildError'
