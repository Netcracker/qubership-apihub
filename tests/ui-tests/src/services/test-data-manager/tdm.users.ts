import type { Rest } from '@services/rest'
import { createRest, rAddSysytemRole, rCreateUser, rGetUsersList } from '@services/rest'
import type { RestUser } from '@services/rest/rest.types'
import { getAuthDataFromAPI, getAuthDataFromStorageStateFile } from '@services/auth'
import { BASE_ORIGIN } from '@test-setup'
import { getRestFailMsg } from '@services/utils'

export async function createUsersTDM(ssPath?: string): Promise<UsersTestDataManager> {
  if (ssPath) {
    const authData = await getAuthDataFromStorageStateFile(ssPath)
    return new UsersTestDataManager(await createRest(BASE_ORIGIN, authData.token))
  } else {
    return new UsersTestDataManager(await createRest(BASE_ORIGIN, ''))
  }

}

export class UsersTestDataManager {

  constructor(private readonly rest: Rest) { }

  async createSysadmin(user: {
    id: string
    email: string
    name: string
    password: string
  }): Promise<void> {
    await this.createUser(user)
    await this.addSystemRole(user)
  }

  async createGeneralUser(user: RestUser): Promise<void> {
    if (await this.isUserExist(user)) {
      return
    }
    await this.createUser(user)
  }

  async addSystemRole(credentials: { id: string; email: string; password: string }): Promise<void> {
    const message = `Adding System Role for "${credentials.id}" user`

    const authData = await getAuthDataFromAPI(BASE_ORIGIN, credentials)
    const rest = await createRest(BASE_ORIGIN, authData.token)
    const response = await rest.send(rAddSysytemRole, [204], credentials)
    if (response.status() !== 204) {
      throw Error(await getRestFailMsg(message, response))
    }
  }

  private async createUser(user: RestUser): Promise<void> {
    const message = `Creation of "${user.name}" user`

    const response = await this.rest.send(rCreateUser, [201, 400], user)
    if (response.status() === 201) {
      return
    }
    if (response.status() !== 201 && response.status() !== 400) {
      throw Error(await getRestFailMsg(message, response))
    }
    const jsonData = await response.json()
    if (response.status() === 400 && jsonData.params.email === user.email) {
      console.log(`Debug: "${user.name}" user is already exist`)
    } else {
      throw Error(await getRestFailMsg(message, response))
    }
  }

  private async isUserExist(props: { email: string }): Promise<boolean> {
    const message = 'Getting users'

    const response = await this.rest.send(rGetUsersList, [200], { textFilter: props.email })
    if (response.status() !== 200) {
      throw Error(await getRestFailMsg(message, response))
    }
    const jsonBody = await response.json()
    const { users } = jsonBody
    for (const user of users) {
      if (user.email === props.email) {
        return true
      }
    }
    return false
  }
}
