import type { RestAgentConfig, RestSnapshot } from '@services/rest/rest.types'
import { type APIResponse, test } from '@playwright/test'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import { createRest, type Rest, rGetNamespaces, rGetServices, rRunDiscovery } from '@services/rest'
import { rCreateSnapshot } from '@services/rest/requests.agent'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { BASE_ORIGIN } from '@test-setup'
import type { TdmAgentConfig } from '@services/test-data-manager'
import { asyncTimeout, getRestFailMsg } from '@services/utils'

export async function createAgentTDM(): Promise<AgentTestDataManager> {
  const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
  const rest = await createRest(BASE_ORIGIN, authData.token)
  return new AgentTestDataManager(rest)
}

export class AgentTestDataManager {

  private readonly rest: Rest

  constructor(rest: Rest) {
    this.rest = rest
  }

  async getNamespaces(params: { cloud: string }): Promise<string[]> {
    const message = `Get namespaces for "${params.cloud}"`
    let response!: APIResponse

    await test.step(message, async () => {
      response = await this.rest.send(rGetNamespaces, [200], params)
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
    const jsonData = await response.json()
    return jsonData.namespaces
  }

  async discoverNamespace(params: TdmAgentConfig): Promise<void> {
    const message = `"${params.namespace}" namespace`

    await test.step(`Starting discovery of the ${message}`, async () => {
      const startDiscoveryResponse = await this.rest.send(rRunDiscovery, [202], params)
      if (startDiscoveryResponse.status() !== 202) {
        throw Error(await getRestFailMsg(`Starting discovery of the ${message}`, startDiscoveryResponse))
      }
    }, { box: true })

    await test.step(`Checking ${message} discovery status`, async () => {
      let getServicesResponse!: APIResponse
      for (let i = 0; i < 30; i++) {
        getServicesResponse = await this.rest.send(rGetServices, [200], params)
        if (getServicesResponse.status() !== 200) {
          throw Error(await getRestFailMsg(`Checking ${message} discovery status`, getServicesResponse))
        }
        const jsonData = await getServicesResponse.json()
        if (jsonData.status === 'complete') {
          return
        }
        await asyncTimeout(2000)
      }
      throw Error(`Discovery of the "${params.namespace}" namespace has not been completed`)
    }, { box: true })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async discoverNamespaceWithData(params: RestAgentConfig): Promise<any> {
    const startTime = Date.now()
    let endTime!: number
    let jsonData

    await test.step(`Starting discovery of the "${params.namespace}" namespace`, async () => {
      const startDiscoveryResponse = await this.rest.send(rRunDiscovery, [202], params)
      if (startDiscoveryResponse.status() !== 202) {
        console.log('Response: ', await startDiscoveryResponse.text())
        jsonData = undefined
      }
    }, { box: true })

    await test.step(`Checking the "${params.namespace}" namespace discovery status`, async () => {
      let getServicesResponse!: APIResponse
      for (let i = 0; i < 100; i++) {
        getServicesResponse = await this.rest.send(rGetServices, [200], params)
        if (getServicesResponse.status() !== 200) {
          console.log('Response: ', await getServicesResponse.text())
          jsonData = undefined
          return
        }
        jsonData = await getServicesResponse.json()
        if (jsonData.status === 'complete') {
          console.log(`${params.namespace}: complete`)
          endTime = Date.now()
          return
        } else if (jsonData.status === 'running') {
          console.log(`${params.namespace}: running`)
          await asyncTimeout(2000)
        } else {
          jsonData = undefined
          return
        }
      }
      console.log(`Discovery of the "${params.namespace}" namespace has not been completed by timout`)
      jsonData = undefined
    }, { box: true })
    const time = endTime ? endTime - startTime : -1
    return {
      name: params.namespace,
      jsonData: jsonData,
      time: time,
    }
  }

  async createSnapshot(params: RestSnapshot): Promise<void> {
    const message = `"${params.version}" snapshot creation`

    await test.step(message, async () => {
      const response = await this.rest.send(rCreateSnapshot, [200], params)
      if (response.status() !== 200) {
        throw Error(await getRestFailMsg(message, response))
      }
    }, { box: true })
  }
}
