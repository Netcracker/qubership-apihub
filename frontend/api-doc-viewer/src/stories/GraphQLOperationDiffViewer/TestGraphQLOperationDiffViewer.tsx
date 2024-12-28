/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
