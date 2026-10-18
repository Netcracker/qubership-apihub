import { flow } from 'lodash'
import * as React from 'react'

import { Playground, PlaygroundProps } from '../components/TryIt/Playground'
import { withPersistenceBoundary } from '../context/Persistence'
import { withMosaicProvider } from '../hoc/withMosaicProvider'
import { withQueryClientProvider } from '../hoc/withQueryClientProvider'
import { withStyles } from '../styled'
import { RoutingProps } from '../types'
import { safeParse } from '@stoplight/json'
import { InlineRefResolverProvider } from '../context/InlineRefResolver'
import { useParsedValue } from '../hooks/useParsedValue'

export type RestPlaygroundProps = PlaygroundProps & RoutingProps;

export const RestPlayground: React.FC<RestPlaygroundProps> = flow(
  withStyles,
  withPersistenceBoundary,
  withMosaicProvider,
  withQueryClientProvider,
)(props => {
  const parsedDocument = useParsedValue(props.document)
  const customServers = typeof props.customServers === 'string' ? safeParse(props.customServers) : props.customServers
  return (
    <InlineRefResolverProvider document={parsedDocument}>
      <Playground {...props} customServers={customServers}/>
    </InlineRefResolverProvider>
  )
})
