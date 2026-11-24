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
