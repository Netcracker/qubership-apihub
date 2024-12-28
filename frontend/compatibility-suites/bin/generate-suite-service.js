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

import { exit } from 'process'
import path from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'

const fileName = path.resolve('./../..').split('\\').pop()
if (fileName === 'node_modules') {
  exit()
}

const COMPATIBILITY_SUITES_PATH = `./bin/comparison-base-suite`

const TEST_SPEC_TYPE_OPEN_API = 'openapi'
const TEST_SPEC_TYPE_GRAPH_QL = 'graphql'

const BASE_SUITE_SERVICE =
  `export const TEST_SPEC_TYPE_OPEN_API = '${TEST_SPEC_TYPE_OPEN_API}'\n` +
  `export const TEST_SPEC_TYPE_GRAPH_QL = '${TEST_SPEC_TYPE_GRAPH_QL}'\n\n` +
  'export type TestSpecType =\n' +
  '| typeof TEST_SPEC_TYPE_OPEN_API\n' +
  '| typeof TEST_SPEC_TYPE_GRAPH_QL\n\n' +
  'export function getCompatibilitySuite(suiteType: TestSpecType, suiteId: string, testId: string): [string, string] {\n' +
  '  const suiteKey = `${suiteType}/${suiteId}/${testId}`\n' +
  '  const suite = CompatibilitySuiteMap.get(suiteKey)\n' +
  '  if (!suite) {\n' +
  '    return [\'\', \'\']\n' +
  '  }\n' +
  '  return [suite.before, suite.after]\n' +
  '}\n' +
  'export function getCompatibilitySuites(specType?: TestSpecType): Map<string, string[]> {\n' +
  '  return [...CompatibilitySuiteMap.keys()].reduce((result, key) => {\n' +
  '    const [suiteType, suiteId, testId] = key.split(\'/\')\n' +
  '    if (specType && specType !== suiteType) {\n' +
  '        return result\n' +
  '    }\n' +
  '    const testIds = result.get(suiteId)\n' +
  '    result.set(suiteId, testIds ? [...testIds, testId] : [testId])\n' +
  '    return result\n' +
  '  }, new Map()) as Map<string, string[]>\n' +
  '}'

let suitesMap = []
const suiteTypes = readdirSync(COMPATIBILITY_SUITES_PATH, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)
for (const suiteType of suiteTypes) {
  switch (suiteType) {
    case TEST_SPEC_TYPE_GRAPH_QL: {
      const suites = readdirSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}`, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)
      for (const suiteId of suites) {
        const tests = readdirSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}`, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)
        for (const testId of tests) {
          if (existsSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/before.graphql` && `${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/after.graphql`)) {
            const before = readFileSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/before.graphql`, 'utf-8')
            const after = readFileSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/after.graphql`, 'utf-8')
            const suite = { before: before, after: after }
            const suiteKey = `${suiteType}/${suiteId}/${testId}`
            suitesMap.push([suiteKey, suite])
          }
        }
      }
      break
    }
    case TEST_SPEC_TYPE_OPEN_API: {
      const suites = readdirSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}`, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)
      for (const suiteId of suites) {
        const tests = readdirSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}`, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)
        for (const testId of tests) {
          if (existsSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/before.yaml` && `${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/after.yaml`)) {
            const before = readFileSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/before.yaml`, 'utf-8')
            const after = readFileSync(`${COMPATIBILITY_SUITES_PATH}/${suiteType}/${suiteId}/${testId}/after.yaml`, 'utf-8')
            const suite = { before: before, after: after }
            const suiteKey = `${suiteType}/${suiteId}/${testId}`
            suitesMap.push([suiteKey, suite])
          }
        }
      }
      break
    }
  }
}

if (!existsSync('./generation')) {
  mkdirSync('./generation')
}

writeFileSync(
  './generation/suite-service.ts',
  BASE_SUITE_SERVICE +
  `\nconst CompatibilitySuiteMap = new Map(${JSON.stringify(suitesMap)})`
)

