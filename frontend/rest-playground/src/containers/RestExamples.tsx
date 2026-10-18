import { flow } from 'lodash'
import * as React from 'react'
import { FC } from 'react'

import { Examples, ExamplesProps } from '../components/Examples'
import { InlineRefResolverProvider } from '../context/InlineRefResolver'
import { withPersistenceBoundary } from '../context/Persistence'
import { withMosaicProvider } from '../hoc/withMosaicProvider'
import { withQueryClientProvider } from '../hoc/withQueryClientProvider'
import { withStyles } from '../styled'
import { useParsedValue } from '../hooks/useParsedValue'

export type RestExamplesProps = ExamplesProps;

export const RestExamples: FC<RestExamplesProps> = flow(
  withStyles,
  withPersistenceBoundary,
  withMosaicProvider,
  withQueryClientProvider,
)(props => {
  const parsedDocument = useParsedValue(props.document)
  return (
    <InlineRefResolverProvider document={parsedDocument}>
      <Examples {...props} />
    </InlineRefResolverProvider>
  )
})
