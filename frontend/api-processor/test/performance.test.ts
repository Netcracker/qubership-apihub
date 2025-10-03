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

import { BUILD_TYPE, VERSION_STATUS } from '../src'
import { Editor, LocalRegistry, loadFileAsString } from './helpers'
import { HASH_FLAG, NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../src/consts'
import {  
  normalize,  
} from '@netcracker/qubership-apihub-api-unifier'
import {
  apiDiff,  
  DIFF_META_KEY,  
  // DIFFS_AGGREGATED_META_KEY,  
} from '@netcracker/qubership-apihub-api-diff'
import { buildSchema } from 'graphql/utilities'
import YAML from 'js-yaml'
import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { takeIf } from '../src/utils'
import { calculateObjectHash } from '../src/utils/hashes'

/**
 * Helper method to measure and log execution duration
 * @param operation - Description of the operation being measured
 * @param fn - Async function to execute and measure
 * @returns Promise that resolves with the result of the executed function
 */
async function measureAndLog<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()
  console.log(`${operation}|${((endTime - startTime) / 1000).toFixed(1)}`)
  return result
}


function normalizeDocument(source:unknown):unknown{
  return normalize(
    source,
    {
      ...NORMALIZE_OPTIONS,
      originsFlag: ORIGINS_SYMBOL,
      hashFlag: HASH_FLAG,  //not passed for GraphQL
      source: source,
    },
  ) 
}

function parseGraphQLDocument(text:string):GraphApiSchema{
  return buildFromSchema(buildSchema(text as string, { noLocation: true }))
}

function parseJSON(text:string):unknown{
  return JSON.parse(text)
}

function parseYAML(text:string):unknown{
  return YAML.load(text)
}

async function loadAnyFile(packageId: string, fileName: string): Promise<string> {
  const fileString = await loadFileAsString('test/projects', packageId, fileName)
  if (!fileString) {
    throw new Error(`Could not load file: ${packageId}/${fileName}`)
  }
  return fileString
}

function getCopyWithEmptyOperations(template: GraphApiSchema): GraphApiSchema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { queries, mutations, subscriptions, ...rest } = template
  return {
    ...takeIf({ queries: {} }, !!queries),
    ...takeIf({ mutations: {} }, !!mutations),
    ...takeIf({ subscriptions: {} }, !!subscriptions),
    ...rest,
  }
}

function calculateDiffs(before:unknown, after:unknown):unknown{
  return apiDiff(
    before,
    after,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: DIFF_META_KEY,
      originsFlag: ORIGINS_SYMBOL,
      // diffsAggregatedFlag: DIFFS_AGGREGATED_META_KEY,
      normalizedResult: true,
    },
  )
}

function parseDocumentByFileType(fileContent: string, fileName: string): unknown {
  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
    return parseYAML(fileContent)
  } else if (fileName.endsWith('.json')) {
    return parseJSON(fileContent)
  } else if (fileName.endsWith('.graphql') || fileName.endsWith('.gql')) {
    return parseGraphQLDocument(fileContent)
  } else {
    throw new Error(`Unsupported file type for: ${fileName}`)
  }
}


/**
 * Generic function to measure execution time of an async operation
 * @param fn - Async function to execute and measure
 * @returns Promise that resolves with the execution time in seconds
 */
async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<number> {
  const startTime = performance.now()
  await fn()
  const endTime = performance.now()
  return (endTime - startTime) / 1000
}

async function measureNormalizationTimeAsync(packageId: string, fileName: string): Promise<number> {
  // Load file content
  const fileContent = await loadAnyFile(packageId, fileName)

  const time = await measureExecutionTime(async () => {    
    // Parse document
    const parsedDocument = parseDocumentByFileType(fileContent, fileName)
    // Normalize document
    normalizeDocument(parsedDocument)
  })
  console.log(`normalize|${packageId}/${fileName}|${time.toFixed(1)}`)
  return time
}

async function measureApiDiffTimeAsync(packageId: string, beforeFileName: string, afterFileName: string, emptyBeforeOperation: boolean = false): Promise<number> {
  // Load both files
  const beforeContent = await loadAnyFile(packageId, beforeFileName)
  const afterContent = await loadAnyFile(packageId, afterFileName)

  const time = await measureExecutionTime(async () => {
    // Parse both documents
    const afterParsed = parseDocumentByFileType(afterContent, afterFileName)
    const beforeParsed = emptyBeforeOperation? getCopyWithEmptyOperations(afterParsed as GraphApiSchema) : parseDocumentByFileType(beforeContent, beforeFileName)    
    
    // Calculate diffs
    const result = calculateDiffs(beforeParsed, afterParsed)
  })
  console.log(`apiDiff|${packageId}/${afterFileName}-${beforeFileName}|${time.toFixed(1)}`)
  return time
}

describe('Publish large packages', () => {

  // Test data: [packageId, beforeFileId, afterFileId]
  const testData: [string, string, string][] = [    
    // ['performance/openapi/github', '2_18.yaml', '2_19.yaml'],
    // ['performance/openapi/github', '2_19.yaml', '2_20.yaml'],
    // ['performance/openapi/github', '2_20.yaml', '2_21.yaml'],
    // ['performance/openapi/github', '2_21.yaml', '2_22.yaml'],
    // ['performance/openapi/github', '2_22.yaml', '3_0.yaml'],
    // ['performance/openapi/github', '3_0.yaml', '3_1.yaml'],
    // ['performance/openapi/github', '3_1.yaml', '3_2.yaml'],
    // ['performance/openapi/github', '3_2.yaml', '3_3.yaml'],
    // ['performance/openapi/github', '3_3.yaml', '3_4.yaml'],
    // ['performance/openapi/github', '3_4.yaml', '3_5.yaml'],
    // ['performance/openapi/github', '3_5.yaml', '3_6.yaml'],
    // ['performance/openapi/github', '3_6.yaml', '3_7.yaml'],
    // ['performance/openapi/github', '3_7.yaml', '3_8.yaml'],
    // ['performance/openapi/loket.nl', 'openapi_2021-02-19.yaml', 'openapi_2021-06-30.yaml'],
    // ['performance/openapi/loket.nl', 'openapi_2021-06-30.yaml', 'openapi_2023-04-23.yaml'],

    // ['performance/openapi/x1', 'before.yaml', 'after.yaml'],
    // ['performance/graphql/x1', 'before.graphql', 'after.graphql'],
    // ['performance/graphql/x2', 'before.graphql', 'after.graphql'],
    // ['performance/graphql/x8', 'before.graphql', 'after.graphql'],

    // ['performance/graphql/shopify', '2022_01.graphql', '2022_04.graphql'],
    // ['performance/graphql/shopify', '2022_04.graphql', '2023_07.graphql'],
    ['performance/graphql/shopify', '2023_07.graphql', '2023_10.graphql'],

    // ['performance/graphql/cbss_like', '2024_2.graphql', '2024_3.graphql'],    
    // Add more test data tuples as needed
  ]

  test.skip('publish large package success', async () => {
    
    for (const [packageId, beforeFileId, afterFileId] of testData) {

      const portal = new LocalRegistry('performance')

      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)
      
      // Measure normalization time for before file
      const beforeNormalizeTime = await measureNormalizationTimeAsync(packageId, beforeFileId)

      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)
      
      await measureAndLog(`build|${packageId}/${beforeFileId}|${beforeNormalizeTime.toFixed(1)}`, async () => {
        return portal.publish(packageId, {
          packageId: packageId,
          version: 'v1',
          status: VERSION_STATUS.RELEASE,
          files: [
            { fileId: beforeFileId },        
          ],
        })
      })
      
      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)

      // // Measure normalization time for after file
      const afterNormalizeTime = await measureNormalizationTimeAsync(packageId, afterFileId)
      
      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)
      
      await measureAndLog(`build|${packageId}/${afterFileId}|${afterNormalizeTime.toFixed(1)}`, async () => {
        return portal.publish(packageId, {
          packageId: packageId,
          version: 'v2',      
          status: VERSION_STATUS.RELEASE,
          files: [
            // todo replace with modified files
            { fileId: afterFileId },        
          ],
        })
      })

      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)

      // Measure apiDiff time for the pair of documents
      const apiDiffTime = await measureApiDiffTimeAsync(packageId, beforeFileId, afterFileId)

      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)

      await measureAndLog(`changelog|${packageId}/${afterFileId}-${beforeFileId}|${apiDiffTime.toFixed(1)}`, async () => {
        const editor = new Editor(packageId, {
          version: 'v2',
          packageId: packageId,
          previousVersionPackageId: packageId,
          previousVersion: 'v1',
          buildType: BUILD_TYPE.CHANGELOG,
          status: VERSION_STATUS.RELEASE,
        })
        await editor.run()
      })
    }

    expect(true).toBe(true)
  }, 400_000_000)

  test.skip('compare large package with empty before', async () => {
    
    for (const [packageId, beforeFileId, afterFileId] of testData) {

      // const portal = new LocalRegistry('performance')

      // console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)
      
      // // Measure normalization time for before file
      // const beforeNormalizeTime = await measureNormalizationTimeAsync(packageId, beforeFileId)

      // console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)
      
      // await measureAndLog(`build|${packageId}/${beforeFileId}|${beforeNormalizeTime.toFixed(1)}`, async () => {
      //   return portal.publish(packageId, {
      //     packageId: packageId,
      //     version: 'v1',
      //     status: VERSION_STATUS.RELEASE,
      //     files: [
      //       { fileId: beforeFileId },        
      //     ],
      //   })
      // })
      
      // console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)

      // // // Measure normalization time for after file
      // const afterNormalizeTime = await measureNormalizationTimeAsync(packageId, afterFileId)
      
      // console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)
      
      // await measureAndLog(`build|${packageId}/${afterFileId}|${afterNormalizeTime.toFixed(1)}`, async () => {
      //   return portal.publish(packageId, {
      //     packageId: packageId,
      //     version: 'v2',      
      //     status: VERSION_STATUS.RELEASE,
      //     files: [
      //       // todo replace with modified files
      //       { fileId: afterFileId },        
      //     ],
      //   })
      // })

      // console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)

      // // Measure apiDiff time for the pair of documents
      // const apiDiffTime = await measureApiDiffTimeAsync(packageId, beforeFileId, afterFileId, false)

      // console.log(`apiDiffTime|${apiDiffTime}`)

      console.log(`${new Date().toLocaleTimeString('ru-RU', { hour12: false })}`)

      await measureAndLog(`changelog|${packageId}/${afterFileId}-${beforeFileId}}`, async () => {
        const editor = new Editor(packageId, {
          version: 'v2',
          packageId: packageId,
          previousVersionPackageId: packageId,
          previousVersion: 'v1',
          buildType: BUILD_TYPE.CHANGELOG,
          status: VERSION_STATUS.RELEASE,
        })
        await editor.run()
      })
      expect(true).toBe(true)
    }
  }, 400_000_000)

    test.skip('Hash performance', async () => {
      for (const [packageId, beforeFileId, afterFileId] of testData) {
        let normalizedDocument: any
        const normalizeTime = await measureExecutionTime(async () => {
          const fileContent = await loadAnyFile(packageId, beforeFileId)
          const parsedDocument = parseDocumentByFileType(fileContent, beforeFileId)
          // Normalize document
          normalizedDocument = normalizeDocument(parsedDocument) as any        
        })
        console.log(`normalize|${packageId}/${beforeFileId}|${normalizeTime.toFixed(1)}`)
        const hashTime = await measureExecutionTime(async () => {        
          const result = calculateObjectHash(normalizedDocument)
        })
        console.log(`hash|${packageId}/${beforeFileId}|${hashTime.toFixed(1)}`)      
        expect(true).toBe(true)
      }
    }, 400_000_000)
})
