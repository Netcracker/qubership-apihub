import { type APIResponse, expect, test } from '@playwright/test'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import type { RestPublishConfig, RestPublishFile } from '@services/rest/rest.types'
import type { PackageApiKey, TestFile, VersionStatuses } from '@shared/entities'
import type {
  TdmOperationGroup,
  TdmPackageCreate,
  TdmPackageUpdate,
  TdmPublishFile,
  TdmPublishVersion,
} from './tdm.entities'
import {
  createRest,
  getRootGroupsList,
  rAddMembersToPackage,
  rAddSysadmin,
  rClearTestData,
  rCreateOperationGroup,
  rCreatePackage,
  rCreatePackageApiKey,
  rDeleteOperationGroup,
  rDeletePackage,
  rDeleteSysadmin,
  type Rest,
  rFavorPackage,
  rGetPackageById,
  rGetPackagesList,
  rGetPublishStatus,
  rGetSysadminsList,
  rGetUsersList,
  rPublishVersionViaUpload,
  rRecalculateGroups,
  rUpdateOperationGroup,
  rUpdatePackage,
  rUpdatePackageVersion,
} from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'
import { TEST_PREFIX } from '@test-data'
import { packToZip } from '@services/utils/files'
import { asyncTimeout, getResponseDebugMsg, getRestFailMsg, getTestIdFromName } from '@services/utils'

export async function createApihubTDM(ssPath: string, requestTimeout?: number): Promise<ApihubTestDataManager> {
  const authData = await getAuthDataFromStorageStateFile(ssPath)
  const rest = await createRest(BASE_ORIGIN, authData.token, requestTimeout)
  return new ApihubTestDataManager(rest)
}

export class ApihubTestDataManager {

  private readonly rest: Rest

  constructor(rest: Rest) {
    this.rest = rest
  }

  async addSysadmin(userId: string): Promise<void> {
    const message = `"${userId}" sysadmin addition`

    await test.step(message, async () => {
      const response = await this.rest.send(rAddSysadmin, [200], { userId: userId })
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.rest.send(rGetSysadminsList, [200])
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg('Getting sysadmins list', response))
      }
      const sysAdmins = await response.text()
      expect(sysAdmins).toContain(userId)
    }, { box: true })
  }

  async addMembersToPackage(params: {
    packageId: string
    name?: string
    emails: string[]
    roleIds: string[]
  }): Promise<void> {
    const message = `Adding "${params.emails}" to the "${params.name || params.packageId}" package as "${params.roleIds}"`

    await test.step(message, async () => {
      const response = await this.rest.send(rAddMembersToPackage, [201], params)
      if (response.status() !== 201) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async createPackage(params: TdmPackageCreate): Promise<void> {
    const { name, alias, parentId } = params
    const packageId = parentId ? `${parentId}.${alias}` : alias
    const message = `"${name}" package creation`

    await test.step(message, async () => {
      if (!await this.isPackageExist(packageId)) {
        const response = await this.rest.send(rCreatePackage, [201, 409], params)
        if (response.status() !== 201 && response.status() !== 409) {
          throw Error(await getRestFailMsg(message, response))
        }
      }
    }, { box: true })

    //TODO need another way of package creation, do not use 409 code and enable creation check (now uses for skipping hidden packages)
    /*await test.step(`Checking <${name}> package creation`, async () => {
      if (!await this.isPackageExist(packageId)) {
        await failTest(`<${name}> package has not been created`, { soft: false })
      }
    }, { box: true })*/
  }

  async updatePackage(params: TdmPackageUpdate): Promise<void> {
    const { name } = params
    const message = `"${name}" package updating`

    await test.step(message, async () => {
      const response = await this.rest.send(rUpdatePackage, [200], params)
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async createPackageApiKeys(params: { packageId: string; apiKeys: PackageApiKey[] }): Promise<void> {
    for (const apiKey of params.apiKeys) {
      const message = `"${apiKey.name}" API Key creation`
      await test.step(message, async () => {
        const response = await this.rest.send(rCreatePackageApiKey, [200], { packageId: params.packageId, ...apiKey })
        if (response.status() !== 200) {
          throw Error(await getRestFailMsg(message, response))
        }
      }, { box: true })
    }
  }

  async recalculateGroups(params: { name: string; packageId: string }): Promise<void> {
    const { name } = params
    const message = `"${name}" package groups recalculation`

    await test.step(message, async () => {
      const response = await this.rest.send(rRecalculateGroups, [200], params)
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async deletePackage(params: { packageId: string; name: string }): Promise<void> {
    const { packageId, name } = params
    const message = `"${name}" package deletion`

    await test.step(message, async () => {
      if (!await this.isPackageExist(packageId)) {
        throw Error(`"${name}" package not found`)
      }
      const response = await this.rest.send(rDeletePackage, [204], params)
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async favorPackage(packageForFavor: { packageId: string; name: string }): Promise<void> {
    const { packageId, name } = packageForFavor
    const message = `Adding "${name}" package to favorites`

    await test.step(message, async () => {
      if (!await this.isPackageExist(packageId)) {
        throw Error(`"${name}" package not found`)
      }
      const response = await this.rest.send(rFavorPackage, [204], packageForFavor)
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.getPackageById(packageId)
      const jsonBody = await response.json()
      expect(jsonBody.isFavorite).toEqual(true)
    }, { box: true })
  }

  async publishVersion(params: TdmPublishVersion): Promise<void> {

    const message = `"${params.version}" version publishing into "${params.pkg.name || params.pkg.packageId}" package`
    let config: string
    let startPublishResponse!: APIResponse
    let getPublishStatusResponse!: APIResponse

    await test.step(message, async () => {
      await test.step('Starting publishing', async () => {
        config = this.buildConfig(params)

        function resolveTestFiles(tdmFiles: TdmPublishFile[]): TestFile[] {
          return tdmFiles.map((tdmFile) => {
            if (tdmFile.fileId) {
              tdmFile.file.name = tdmFile.fileId
              return tdmFile.file
            } else {
              return tdmFile.file
            }
          })
        }

        startPublishResponse = await this.rest.send(rPublishVersionViaUpload, [202], {
          packageId: params.pkg.packageId,
          sources: params.files ? await packToZip(resolveTestFiles(params.files)) : undefined,
          config: config,
        })
        if (startPublishResponse.status() !== 202) {
          throw Error(await getRestFailMsg(`Starting ${message}`, startPublishResponse))
        }
      }, { box: true })

      await test.step('Checking status of publishing', async () => {
        const { publishId } = await startPublishResponse.json()
        for (let i = 0; i < 60; i++) {
          getPublishStatusResponse = await this.rest.send(rGetPublishStatus, [200], {
            packageId: params.pkg.packageId,
            publishId: publishId,
          })
          if (getPublishStatusResponse.status() !== 200) {
            throw Error(await getRestFailMsg(`Checking status of ${message}`, getPublishStatusResponse))
          }
          const jsonData = await getPublishStatusResponse.json()
          if (jsonData.status === 'complete') {
            return
          }
          await asyncTimeout(2000)
        }
        throw Error(`${message} has not been completed\nPublish config: ${config}\n${await getResponseDebugMsg(startPublishResponse, 'Publish')}\n${await getResponseDebugMsg(getPublishStatusResponse, 'Get status')}`)
      }, { box: true })
    }, { box: true })
  }

  async updatePackageVersion(params: {
    pkg: {
      packageId: string
      name?: string
    }
    version: string
    status?: VersionStatuses
    versionLabels?: string[]
  }): Promise<void> {
    const message = `Updating the "${params.version}" version in the "${params.pkg.name || params.pkg.packageId}" package`

    await test.step(message, async () => {
      const response = await this.rest.send(rUpdatePackageVersion, [200], {
        ...params,
        packageId: params.pkg.packageId,
      })
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async createOperationGroup(params: TdmOperationGroup): Promise<void> {
    const message = `Creating the "${params.groupName}" group in the "${params.packageId} / ${params.version} " version`

    await test.step(message, async () => {
      const response = await this.rest.send(rCreateOperationGroup, [201], params)
      if (response.status() !== 201) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    if (params.operations) {
      await this.updateOperationGroup(params)
    }
  }

  async updateOperationGroup(params: TdmOperationGroup): Promise<void> {
    const message = `Updating the "${params.groupName}" group in the "${params.packageId} / ${params.version} " version`

    await test.step(message, async () => {
      const response = await this.rest.send(rUpdateOperationGroup, [204], params)
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async deleteOperationGroup(params: TdmOperationGroup): Promise<void> {
    const message = `Deleting the "${params.groupName}" group in the "${params.packageId} / ${params.version} " version`

    await test.step(message, async () => {
      const response = await this.rest.send(rDeleteOperationGroup, [204], params)
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }

  async deleteUser(id: string): Promise<void> {
    const message = `"${id}" user deletion`

    await test.step(message, async () => {
      const response = await this.rest.send(rClearTestData, [204], { testId: id })
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.rest.send(rGetUsersList, [200], { textFilter: `${id}` })
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(`Checking ${message}`, response))
      }
      const users = await response.text()
      expect(users).not.toContain(id)
    }, { box: true })
  }

  async deleteSysadmin(userId: string): Promise<void> {
    const message = `"${userId}" sysadmin deletion`

    await test.step(message, async () => {
      const response = await this.rest.send(rDeleteSysadmin, [204], { userId: userId })
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.rest.send(rGetSysadminsList, [200])
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(`Checking ${message}`, response))
      }
      const sysAdmins = await response.text()
      expect(sysAdmins).not.toContain(userId)
    }, { box: true })
  }

  async deleteTestEntities(testId: string): Promise<void> {
    const message = `"${testId}" test entity deletion`

    await test.step(message, async () => {
      const response = await this.rest.send(rClearTestData, [204], { testId: testId })
      if (response.status() !== 204) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })

    await test.step(`Checking ${message}`, async () => {
      const response = await this.getWorkspaces()
      const groups = await response.text()
      expect(groups).not.toContain(testId)
    }, { box: true })
  }

  async deleteAllTestEntities(options?: { exclude: string[] }): Promise<void> {
    const exclude: string[] = []
    if (options) {
      exclude.push(...options.exclude)
    }
    console.log('Ids for exclude: ', exclude)

    const testIds: string[] = []
    let getWorkspacesResponse!: APIResponse
    let getGroupsResponse!: APIResponse

    await test.step('Get Groups', async () => {
      getWorkspacesResponse = await this.getWorkspaces(TEST_PREFIX)
      getGroupsResponse = await this.getGroups(TEST_PREFIX)
    }, { box: true })

    await test.step('Get Test IDs', async () => {
      const { packages: workspaces } = await getWorkspacesResponse.json()
      const { packages: groups } = await getGroupsResponse.json()
      workspaces.forEach((workspace: { name: string }) => {
        const id = getTestIdFromName(workspace.name)
        if (id && !exclude.includes(id) && !testIds.includes(id)) {
          testIds.push(id)
        }
      })
      groups.forEach((group: { name: string }) => {
        const id = getTestIdFromName(group.name)
        if (id && !exclude.includes(id) && !testIds.includes(id)) {
          testIds.push(id)
        }
      })
      console.log('IDs for deletion: ', testIds)
    }, { box: true })

    await test.step('Delete Test Entities ', async () => {
      for (const testId of testIds) {
        await this.deleteTestEntities(testId)
        console.log(`Entity with "${testId}" test ID deleted`)
      }
    }, { box: true })
  }

  private buildConfig(params: TdmPublishVersion): string {

    function resolveRestPublishFiles(files: TdmPublishFile[]): RestPublishFile[] {
      return files.map((file) => (file.fileId ? file as RestPublishFile : {
        fileId: file.file.name,
        publish: file.publish,
        labels: file.labels,
      }))
    }

    const config: RestPublishConfig = {
      packageId: params.pkg.packageId,
      version: params.version,
      previousVersion: params.previousVersion || '',
      status: params.status,
      refs: params.refs || [],
      files: params.files ? resolveRestPublishFiles(params.files) : [],
      metadata: params.metadata || {},
    }
    return JSON.stringify(config)
  }

  private async getRootGroups(): Promise<APIResponse> {
    const response = await this.rest.send(getRootGroupsList, [200])
    if (response.status() !== 200) {
      throw Error(await getRestFailMsg('Getting Root Groups list', response))
    }
    return response
  }

  private async getWorkspaces(textFilter?: string): Promise<APIResponse> {
    const response = await this.rest.send(rGetPackagesList, [200], { kind: 'workspace', textFilter: textFilter })
    if (response.status() !== 200) {
      throw Error(await getRestFailMsg('Getting Workspaces list', response))
    }
    return response
  }

  private async getGroups(textFilter?: string): Promise<APIResponse> {
    const response = await this.rest.send(rGetPackagesList, [200], { kind: 'group', textFilter: textFilter })
    if (response.status() !== 200) {
      throw Error(await getRestFailMsg('Getting Groups list', response))
    }
    return response
  }

  private async getPackageById(packageId: string): Promise<APIResponse> {
    const response = await this.rest.send(rGetPackageById, [200, 404], { packageId: packageId })
    if (response.status() !== 200 && response.status() !== 404) {
      throw Error(await getRestFailMsg(`Getting "${packageId}" package`, response))
    }
    return response
  }

  private async isPackageExist(packageId: string): Promise<boolean> {
    const response = await this.getPackageById(packageId)
    const jsonBody = await response.json()
    return response.status() === 200 && jsonBody.packageId === packageId
  }
}
