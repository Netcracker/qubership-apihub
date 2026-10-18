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

import { VersionConfig } from '@netcracker/qubership-apihub-api-processor'

import { BuildStatus } from "../../src/modules/builder/builder.constants"
import { loadConfig, loadFile } from "./utils"

export interface BuildStatusRequest {
  packageId: string
  status: BuildStatus
  data: any
}

export class MockRegistryService {
  public requests: BuildStatusRequest[] = []
  private resolver?: (value: BuildStatusRequest) => void 

  public clear(): MockRegistryService {
    this.requests.length = 0
    return this
  }

  public async buildStatus(): Promise<BuildStatusRequest> {
    return new Promise((resolve) => {
      if (this.requests.length) {
        return resolve(this.requests.pop())        
      }
      this.resolver = resolve
    })
  }

  public async postBuildStatus(packageId: string, status: BuildStatus, data?: any) {
    if (!this.requests.length && this.resolver) {
      this.resolver({ packageId, status, data })
    } else {
      this.requests.push({ packageId, status, data })
    }
  }

  public async getVersionFile(slug: string, version: string, packageId: string) {
    return loadFile("test/resources/versions", packageId + "#" + version, slug)
  }

  public async getVersionConfig(version: string, packageId: string): Promise<VersionConfig> {
    return loadConfig("test/resources/versions", packageId + "#" + version)
  }
}
