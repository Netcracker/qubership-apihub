import { FC } from 'react'
import {
  GraphQLOperationViewer,
  GraphQLOperationViewerProps
} from '../../components/GraphQLOperationViewer/GraphQLOperationViewer'
import { GraphApiSchemaOptions, prepareGraphApiSchema } from '../preprocess'

type TestGraphQLOperationViewerProps = Omit<GraphQLOperationViewerProps, 'source'> & GraphApiSchemaOptions

export const TestGraphQLOperationViewer: FC<TestGraphQLOperationViewerProps> = (props) => {
  const { source, circular = false } = props
  const mergedSource = prepareGraphApiSchema({
    source: source,
    circular: circular
  })
  return <GraphQLOperationViewer {...props} source={mergedSource}/>
}
