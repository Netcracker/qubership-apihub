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

import { createVersionPackage, ZipTool } from '../../../src/components/package'
import { registryFs } from './fs'
import { BuildConfig, BuilderContext, BuildResult, PackageConfig } from '../../../src'
import { EXPORT_BUILD_TYPES } from '../../../src/consts'

export const VERSIONS_PATH = 'test/versions'

// Publishing an EXPORT_* build would leave an empty version directory: createVersionPackage returns
// the export documents and writes no package. Fail here, not later on a missing operations.json.
export function assertPublishableBuildType({ buildType }: PackageConfig): void {
  if (EXPORT_BUILD_TYPES.some(exportBuildType => exportBuildType === buildType)) {
    throw new Error(`Cannot publish a '${buildType}' build: it produces export documents, not a version package`)
  }
}

// Shared by both test registries: serialize a build result into the version directory through the
// production serializer, so the on-disk layout is whatever createVersionPackage produces.
export async function publishVersionPackage(
  buildResult: BuildResult,
  builderContext: BuilderContext,
  config: BuildConfig,
): Promise<void> {
  assertPublishableBuildType(buildResult.config)
  const basePath = `${VERSIONS_PATH}/${config.packageId}/${config.version}`
  try {
    await registryFs.rm(basePath, { recursive: true })
  } catch (e) {
    // do nothing
  }
  await registryFs.mkdir(basePath, { recursive: true })

  await createVersionPackage(buildResult, createDiskZipTool(basePath), builderContext)
}

// Mirrors JSZip: objects → pretty JSON, strings → raw, Blobs → binary. Since callers fire `file()`
// without awaiting, writes are tracked in `pending` and drained by the always-awaited `buildResult()`.
export function createDiskZipTool(basePath: string): ZipTool {
  const pending: Promise<void>[] = []
  const dirPromises = new Map<string, Promise<unknown>>()
  const writeChains = new Map<string, Promise<void>>()

  // mkdir each directory once: every write awaits the same shared promise, so the dir is created a
  // single time and no concurrent (un-awaited) write races ahead of it.
  const ensureDir = (dir: string): Promise<unknown> => {
    let created = dirPromises.get(dir)
    if (!created) {
      created = registryFs.mkdir(dir, { recursive: true })
      dirPromises.set(dir, created)
    }
    return created
  }

  const writeEntry = async (path: string, content: object | string | Blob): Promise<void> => {
    const dir = path.substring(0, path.lastIndexOf('/'))
    await ensureDir(dir)

    if (content instanceof Blob) {
      await registryFs.writeFile(path, Buffer.from(await content.arrayBuffer()))
    } else if (typeof content === 'string') {
      await registryFs.writeFile(path, content)
    } else {
      await registryFs.writeFile(path, JSON.stringify(content, undefined, 2))
    }
  }

  const at = (base: string): ZipTool => ({
    file(name: string, content: object | string | Blob): Promise<void> {
      // Chain writes to the same path: JSZip resolves duplicates last-write-wins by call order, so
      // the sink must too — firing them concurrently would let the scheduler pick the winner.
      const path = `${base}/${name}`
      const promise = (writeChains.get(path) ?? Promise.resolve()).then(() => writeEntry(path, content))
      writeChains.set(path, promise)
      pending.push(promise)
      return promise
    },
    folder(name: string): ZipTool {
      return at(`${base}/${name}`)
    },
    async buildResult(): Promise<void> {
      await Promise.all(pending)
    },
  })

  return at(basePath)
}
