import { FC } from 'react'
import { GraphApiDiffSchemaOptions, prepareGraphApiDiffSchema } from '../preprocess'
import {
  GraphQLOperationDiffViewer,
  GraphQLOperationDiffViewerProps
} from '../../components/GraphQLOperationViewer/GraphQLOperationDiffViewer'

type TestGraphQLOperationDiffViewerProps = Omit<GraphQLOperationDiffViewerProps, 'source'> & GraphApiDiffSchemaOptions

export const TestGraphQLOperationDiffViewer: FC<TestGraphQLOperationDiffViewerProps> = (props) => {
  const { beforeSource, afterSource, circular = false } = props
  const mergedSource = prepareGraphApiDiffSchema({
    beforeSource: beforeSource,
    afterSource: afterSource,
    circular: circular
  })
  return <GraphQLOperationDiffViewer {...props} source={mergedSource}/>
}
