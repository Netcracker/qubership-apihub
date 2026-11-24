import { mergeOpenapiDocuments } from '../../../src/utils'

import path from 'path'
import fs from 'fs/promises'
import { OpenAPIV3 } from 'openapi-types'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

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
    const fileData = loadYaml(await fs.readFile(path.join(pathToFolder, fileName), 'utf-8'))
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
