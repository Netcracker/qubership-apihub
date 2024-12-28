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

import { useQuery } from '@tanstack/react-query'

import { useParams } from 'react-router-dom'
import { useUpdateBwcFileProblems } from './useFileProblems'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { useBranchConfig } from './useBranchConfig'
import type { BuilderOptions } from './package-version-builder'
import { PackageVersionBuilder } from './package-version-builder'
import { useAllBranchFiles } from './useBranchCache'
import { useProject } from '../../useProject'
import { VERSION_CANDIDATE } from './consts'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsFetched, IsFetching, RefetchQuery } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { groupBy } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { calculateAction, EMPTY_CHANGE_SUMMARY } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { getMajorSeverity } from '@netcracker/qubership-apihub-ui-shared/utils/change-severities'
import type { FileProblem, FileProblemType } from '@apihub/entities/file-problems'
import {
  ERROR_FILE_PROBLEM_TYPE,
  INFO_FILE_PROBLEM_TYPE,
  WARN_FILE_PROBLEM_TYPE,
} from '@apihub/entities/file-problems'
import { calculateTotalChangeSummary } from '@netcracker/qubership-apihub-api-processor'

const BWC_PROBLEMS_QUERY_KEY = 'bwc-problems-query-key'

export function useBwcProblems(previousVersionKey?: Key): [BwcProblems, IsFetched, IsFetching, RefetchQuery<BwcProblems, Error>] {
  const { projectId } = useParams()
  const [branchName] = useBranchSearchParam()
  const [branchConfig] = useBranchConfig()
  const [branchFiles] = useAllBranchFiles()
  const [project] = useProject()
  const packageKey = project?.packageKey ?? projectId

  const updateBwcFileProblems = useUpdateBwcFileProblems()

  const { data, isFetched, isFetching, refetch } = useQuery<BwcProblems, Error, BwcProblems>({
    queryKey: [BWC_PROBLEMS_QUERY_KEY, packageKey, branchName, previousVersionKey!],
    queryFn: () => getBwcProblems({
      packageKey: packageKey!,
      branchName: branchName!,
      versionKey: VERSION_CANDIDATE,
      previousPackageKey: packageKey!,
      previousVersionKey: previousVersionKey!,
      authorization: getAuthorization(),
      files: branchConfig?.files ?? [],
      sources: branchFiles,
    }),
    enabled: false,
    onSuccess: (bwcFileProblems) => {
      for (const [fileKey, bwcProblems] of bwcFileProblems) {
        updateBwcFileProblems({ fileKey, bwcProblems })
      }
    },
  })

  return [data ?? new Map(), isFetched, isFetching, refetch]
}

async function getBwcProblems(
  options: BuilderOptions,
): Promise<BwcProblems> {
  const bwcReport = await PackageVersionBuilder.checkBwc(options)

  const bwcProblems = groupBy(bwcReport, 'comparisonFileId')
  return new Map(
    Object.entries(bwcProblems)
      .map(
        ([fileKey, comparisonsWithBwcProblems]) => [
          fileKey,
          comparisonsWithBwcProblems.map(
            comparison => {
              const action = calculateAction(comparison.version, comparison.previousVersion)
              const changesSummary: ChangesSummary[] =
                comparison.operationTypes.map(operationType => operationType.changesSummary ?? EMPTY_CHANGE_SUMMARY)
              const severity = getMajorSeverity(calculateTotalChangeSummary(changesSummary))

              return {
                type: toFileProblemType(severity ?? ''), // TODO: Need to check
                filePath: fileKey,
                text: action,
              }
            },
          ),
        ],
      ),
  )
}

export type BwcProblems = Map<Key, FileProblem[]>
export const NO_BWC_PROBLEMS = new Map<Key, FileProblem[]>()

function toFileProblemType(severity: string): FileProblemType {
  switch (severity) {
    case 'breaking':
      return ERROR_FILE_PROBLEM_TYPE
    case 'non-breaking':
      return WARN_FILE_PROBLEM_TYPE
    default:
      return INFO_FILE_PROBLEM_TYPE
  }
}
