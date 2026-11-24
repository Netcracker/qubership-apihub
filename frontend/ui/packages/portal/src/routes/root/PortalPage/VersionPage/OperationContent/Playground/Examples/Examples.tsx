import { Box } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'
import { lazy, memo, Suspense } from 'react'
import type { ExamplesElementProps } from './ExamplesElement'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export type ExamplesProps = PropsWithChildren<{
  document?: string
  fullScreenAvailable?: boolean
}>

const ExamplesElement: FC<ExamplesElementProps> = lazy(() => import('./ExamplesElement'))

export const Examples: FC<ExamplesProps> = memo<ExamplesProps>(({ document, fullScreenAvailable }) => {
  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <Box lineHeight={1.5} height="100%" width="100%" data-testid="ExamplesPanel">
        <ExamplesElement
          document={document}
          fullScreenAvailable={fullScreenAvailable}
        />
      </Box>
    </Suspense>
  )
})
