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

import { wrap, type Remote } from 'comlink'
import Worker from './package-version-builder-worker?worker'
import type { PackageVersionBuilderWorker } from './package-version-builder-worker'
import { SESSION_STORAGE_KEY_LAST_IDENTITY_PROVIDER_ID } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ProjectFile } from '@apihub/entities/project-files'

export type BuilderOptions = {
  packageKey: Key
  versionKey: Key
  previousPackageKey?: Key
  previousVersionKey?: Key
  currentGroup?: Key
  previousGroup?: Key
  branchName?: string
  files?: ReadonlyArray<ProjectFile>
}

let builder: Remote<PackageVersionBuilderWorker> | null = null
let ready: Promise<void> | null = null

// Lazily creates the build worker on first use (publish / changelog / export). The
// worker chunk — and the ddlapi parser + libpg-query WASM it loads on first DDL
// parse — is fetched only when actually needed, not on app load. `init` is awaited so
// the worker has its system configuration before the first heavy call runs.
export async function getPackageVersionBuilder(): Promise<Remote<PackageVersionBuilderWorker>> {
  if (!builder) {
    builder = wrap<PackageVersionBuilderWorker>(new Worker())
    ready = builder.init(localStorage.getItem(SESSION_STORAGE_KEY_LAST_IDENTITY_PROVIDER_ID))
  }
  await ready
  return builder
}
