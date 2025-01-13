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

export type ReportType = 'apihub-styled-html'

export type ReportRunResult = {
  status: string
  startTime: string
  duration: string
  workers: number
  counts: ReportRunResultCounts
  lists: ReportRunResultLists
}

export type ReportRunResultCounts = {
  allTests: number
  executedTests: number
  passedTests: number
  failedTests: number
  flakyTests: number
  affectedTests: number
  skippedTests: number
}

export type ReportRunResultLists = {
  failedList: Map<string, ReportTestInfo>
  flakyList: Map<string, ReportTestInfo>
  affectedList: Map<string, ReportTestInfo>
  skippedList: Map<string, ReportTestInfo>
}

export type ReportTemplateContext = Omit<ReportRunResult, 'counts' | 'lists'> & ReportRunResultCounts & {
  style: string
  ratio: string
  envName: string
  backendVersion: string
  frontendVersion: string
  pwBranch: string
  ciJobLink: string
  ciUser: string
  failedTable: string
  flakyTable: string
  affectedTable: string
  skippedTable: string
}

export type ReportTestInfo = {
  project: string
  fullTitle: string
  testCaseUrl?: string
  issues: ReportTestIssues
}

export type ReportTestIssues = Set<{
  key: string
  url?: string
}>
