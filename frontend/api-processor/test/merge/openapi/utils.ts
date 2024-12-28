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

import { mergeOpenapiDocuments } from '../../../src/utils'

import path from 'path'
import fs from 'fs/promises'
import { load } from 'js-yaml'
import { OpenAPIV3 } from 'openapi-types'

const TEST_DIR = 'test'
const SUITE_ID = 'merge/openapi'
const EXPECTED_RESULT_FILE = 'result.yaml'
const TEMPLATE_FILE = 'template.yaml'
const TEST_INFO_SECTION = {
  title: 'test',
  version: '0.1.0',
}

type MergedResult = unknown
type ExpectedResult = object

export async function getTestData(testId: string): Promise<[MergedResult, ExpectedResult]> {
  const pathToFolder = `${TEST_DIR}/${SUITE_ID}/${testId}`
  const fileNames = await fs.readdir(pathToFolder)

  let template
  let resultSpec
  const specsToMerge = []
  for (const fileName of fileNames) {
    const fileData = load(await fs.readFile(path.join(pathToFolder, fileName), 'utf-8'))
    if (fileName === EXPECTED_RESULT_FILE) {
      resultSpec = fileData
      continue
    }
    if (fileName === TEMPLATE_FILE) {
      template = fileData as OpenAPIV3.Document
      continue
    }
    specsToMerge.push(fileData as OpenAPIV3.Document)
  }

  const merged = mergeOpenapiDocuments(
    specsToMerge,
    TEST_INFO_SECTION,
    template,
  )

  return [merged, resultSpec || {}]
}
