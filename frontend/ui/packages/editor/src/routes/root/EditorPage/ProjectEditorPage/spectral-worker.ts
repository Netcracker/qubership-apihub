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

import type { ISpectralDiagnostic, RulesetDefinition } from '@stoplight/spectral-core'
import { Document, Spectral } from '@stoplight/spectral-core'
import * as Parsers from '@stoplight/spectral-parsers'

import { Resolver } from '@stoplight/spectral-ref-resolver'
import type URI from 'urijs'
import { expose } from 'comlink'
import { oas } from '@stoplight/spectral-rulesets'
import { truthy } from '@stoplight/spectral-functions'
import { DiagnosticSeverity } from '@stoplight/types'
import type { BranchCache } from './useBranchCache'
import type { FileProblemType } from '@apihub/entities/file-problems'
import {
  ERROR_FILE_PROBLEM_TYPE,
  INFO_FILE_PROBLEM_TYPE,
  WARN_FILE_PROBLEM_TYPE,
} from '@apihub/entities/file-problems'
import { scheduleInBackground } from '@netcracker/qubership-apihub-ui-shared/utils/scheduler'
import type { FileKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const MAX_CONCURRENT_WORKERS_COUNT = 3

export type ValidationWorker = {
  validate: (
    fileKey: FileKey,
    initialFileContent: string,
    branchCache: BranchCache,
  ) => Promise<ValidationDiagnostic[]>
}

export type ValidationDiagnostic = {
  fileProblemType: FileProblemType
} & ISpectralDiagnostic

const validationWorker: ValidationWorker = {
  validate: async (
    fileKey,
    initialFileContent,
    branchCache,
  ): Promise<ValidationDiagnostic[]> => {
    return (
      await scheduleInBackground(async () => {
        const spectral = createSpectral(fileKey, branchCache)

        const diagnostic = await spectral.run(new Document(initialFileContent, Parsers.Yaml, fileKey))

        return toValidationDiagnostic(diagnostic)
      })
    )
  },
}

function toValidationDiagnostic(diagnostic: ISpectralDiagnostic[]): ValidationDiagnostic[] {
  return diagnostic.map(value => ({
    ...value,
    fileProblemType: toFileProblemType(value.severity),
  }))
}

function createSpectral(
  fileKey: string,
  branchCache: BranchCache,
): Spectral {
  const resolver = new Resolver({
    resolvers: {
      file: {
        resolve: async (uri: URI) => {
          const href = uri.href()
          const fileKey = href.startsWith('./') ? href.replace('./', '') : href

          const content = branchCache[fileKey]?.content

          if (!content) {
            throw Error(`No content of '${fileKey}' file`)
          }
          return content
        },
      },
    },
  })

  const spectral = new Spectral({ resolver })
  spectral.setRuleset(APIHUB_OAS_RULESET)
  return spectral
}

function toFileProblemType(severity: DiagnosticSeverity): FileProblemType {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return ERROR_FILE_PROBLEM_TYPE
    case DiagnosticSeverity.Warning:
      return WARN_FILE_PROBLEM_TYPE
    case DiagnosticSeverity.Information:
      return INFO_FILE_PROBLEM_TYPE
    default:
      return INFO_FILE_PROBLEM_TYPE
  }
}

const APIHUB_OAS_RULESET: RulesetDefinition = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  extends: [[oas, 'off']],
  rules: {
    'contact-properties': true,
    'duplicated-entry-in-enum': true,
    'info-contact': true,
    'info-description': true,
    'info-license': true,
    'path-params': true,
    'license-url': true,
    'no-script-tags-in-markdown': true,
    'no-$ref-siblings': 'warn',
    'oas3-api-servers': true,
    'oas3-examples-value-or-externalValue': true,
    'oas3-operation-security-defined': true,
    'oas3-parameter-description': true,
    'oas3-schema': true,
    'oas3-server-trailing-slash': true,
    'oas3-valid-media-example': true,
    'oas3-valid-schema-example': true,
    'oas3-unused-component': true,
    'openapi-tags': true,
    'operation-description': true,
    'operation-operationId': true,
    'operation-operationId-unique': true,
    'operation-parameters': true,
    'operation-success-response': true,
    'operation-tags': true,
    'operation-tag-defined': true,
    'path-declarations-must-exist': true,
    'path-keys-no-trailing-slash': true,
    'path-not-include-query': true,
    'tag-description': true,
    'typed-enum': true,
    'qs-oas3-audience': {
      description: 'The API audience from the point of customer view is needed.',
      message: 'Missing the {{property}}',
      given: '$.info.x-qs-api-audience',
      severity: 'warn',
      then: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        function: truthy,
      },
    },
  },
}

expose(validationWorker)
