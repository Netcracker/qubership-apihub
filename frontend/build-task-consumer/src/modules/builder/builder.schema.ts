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

import { Static, Type } from '@sinclair/typebox'

export const RefSchema = Type.Object({
  refId: Type.String(),
  version: Type.String(),
})

export const FileSchema = Type.Object({
  fileId: Type.String(),
  publish: Type.Boolean(),
  labels: Type.Array(Type.String()),
})

// TODO: Remove Any when the problem with alias types is resolved
export const OperationSchema = Type.Object({
  operationId: Type.String(),
  apiType: Type.Any({enum: ['Rest', 'Kafka', 'gRPC', 'GraphQL', 'MD', 'Unknown'], description: 'API type'}),
  apiKind: Type.Any(),
  deprecated: Type.Boolean(),
  title: Type.String(),
  metadata: Type.Object({
    path: Type.String(),
    method: Type.Any({enum: ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'connect', 'trace'], description: 'HTTP Method'}),
  }),
  data: Type.Any(),
  searchScopes: Type.Optional(Type.Any()),
  changes: Type.Optional(Type.Array(Type.Any())),
  changeSummary: Type.Optional(Type.Any()),
  refPackage: Type.Optional(Type.Object({
    id: Type.String(),
    version: Type.String(),
  })),
})

export const PublishFilesConfigSchema = Type.Object({
  buildType: Type.Any({
    enum: [
      'build',
      'changelog',
      'documentGroup',
      'reducedSourceSpecifications',
      'mergedSpecification',
      'exportVersion',
      'build',
      'exportRestDocument',
      'exportRestOperationsGroup',
    ],
  }),
  packageId: Type.String(),
  version: Type.String(),
  status: Type.Any({enum: ['release', 'draft', 'archived', 'release-candidate'], description: 'Version status'}),
  publishId: Type.String(),
  versionFolder: Type.Optional(Type.String()),
  previousVersion: Type.Optional(Type.String()),
  previousVersionPackageId: Type.Optional(Type.String()),
  refs: Type.Array(RefSchema),
  files: Type.Array(FileSchema),
  operations: Type.Array(OperationSchema),
}, { description: 'Build parameters' })

export type PublishFilesConfigType = Static<typeof PublishFilesConfigSchema>

export const BuilderFilesBodySchema = Type.Object({
  config: PublishFilesConfigSchema,
  sources: Type.String({ format: 'binary', description: 'Source files (gz|tgz|zip)' }),
})

export const ErrorResponseSchema = Type.Object({
  status: Type.Number({ description: "HTTP Status Code" }),
  code: Type.String({ description: "Internal string error code. Mandatory in response." }),
  message: Type.String({ description: "The attribute contains an error message." }),
  params: Type.Optional(Type.Record(Type.String(), Type.Any(), { description: "Message parameters", examples: [{ id: "12345", type: "string" }] })),
  debug: Type.Optional(Type.String({ description: "The attribute contains debug details (e.g. stack-trace).\nPresented in the error response only on Dev/Test environments if corresponding logging level is enabled." })),
}, { description: "An error description" })
