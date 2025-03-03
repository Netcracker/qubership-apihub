import { test } from '@fixtures'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { createRest, rGetPackageVersion } from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'
import { BaseExpect } from './BaseExpect'

export type VersionInput = { packageId: string; version: string }

export class ExpectApiVersion extends BaseExpect<VersionInput> {

  constructor(
    actual: VersionInput,
    isNot = false,
    isSoft = false,
    message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }

  get not(): ExpectApiVersion {
    return new ExpectApiVersion(this.actual, !this.isNot, this.isSoft, this.message)
  }

  async toBePublished(): Promise<void> {
    await test.step(this.formatStepMessage('to be created'), async () => {
      const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
      const rest = await createRest(BASE_ORIGIN, authData.token)
      const response = await rest.send(rGetPackageVersion, [200, 404], this.actual)
      const expectedStatus = 200

      await this.executeExpectation(
        'to be created',
        'toEqual',
        [expectedStatus],
        response.status(),
      )
    }, { box: true })
  }

  protected override formatStepMessage(assertionDescription: string): string {
    return `API: Expect version "${this.actual.version}" ${this.notIndicator}${assertionDescription}`
  }
}
