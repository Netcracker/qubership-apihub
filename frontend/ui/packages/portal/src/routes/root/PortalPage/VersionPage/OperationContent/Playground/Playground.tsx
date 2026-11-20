import { Box } from '@mui/material'
import type { FC, PropsWithChildren } from 'react'
import { lazy, memo, Suspense } from 'react'
import type { PlaygroundElementProps } from './PlaygroundElement'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export type PlaygroundProps = PropsWithChildren<{
  document?: string
  customServers?: string
}>

const PlaygroundElement: FC<PlaygroundElementProps> = lazy(() => import('./PlaygroundElement'))

export const Playground: FC<PlaygroundProps> = memo<PlaygroundProps>(({ document, customServers }) => {
  // This key allows you to update the list of servers after adding a new one.
  //TODO: It is necessary to find out why the list is not updated independently
  const playgroundKey = `playground-${customServers || 'empty'}`

  return (
    <Suspense fallback={<LoadingIndicator/>}>
      <Box lineHeight={1.5} height="100%" width="100%" data-testid="PlaygroundPanel">
        <PlaygroundElement
          key={playgroundKey}
          document={document}
          customServers={customServers}
          origin={window.location.origin}
        />
      </Box>
    </Suspense>
  )
})
