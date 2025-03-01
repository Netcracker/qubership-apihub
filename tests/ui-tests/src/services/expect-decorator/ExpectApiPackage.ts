import { test } from '@fixtures'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { createRest, rGetPackageById } from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'
import { BaseExpect } from './BaseExpect'

export type PackageInput = { packageId: string; name?: string }

export class ExpectApiPackage extends BaseExpect<PackageInput> {

  constructor(
    actual: PackageInput,
    isNot = false,
    isSoft = false,
    message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }

  get not(): ExpectApiPackage {
    return new ExpectApiPackage(this.actual, !this.isNot, this.isSoft, this.message)
  }

  protected override formatStepMessage(assertionDescription: string): string {
    return `Expect "${this.actual.name || this.actual.packageId}" package ${this.notIndicator}${assertionDescription}`
  }

  async toBeCreated(): Promise<void> {
    await test.step(this.formatStepMessage('to be created'), async () => {
      const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
      const rest = await createRest(BASE_ORIGIN, authData.token)
      const response = await rest.send(rGetPackageById, [200, 404], this.actual)
      const expectedStatus = this.isNot ? 404 : 200

      await this.executeExpectation(
        'to be created',
        'toEqual',
        [expectedStatus],
        response.status(),
      )
    }, { box: true })
  }
}
