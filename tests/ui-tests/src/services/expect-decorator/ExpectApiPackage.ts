import { test } from '@fixtures'
import { createRestWithCredentials, rGetPackageById } from '@services/rest'
import { BASE_URL } from '@test-setup'
import { BaseExpect } from './BaseExpect'
import { SYSADMIN } from '@test-data'

export interface PackageInput {
  packageId: string
  name?: string
}

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

  async toBeCreated(): Promise<void> {
    await test.step(this.formatStepMessage('to be created'), async () => {
      const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
      const response = await rest.send(rGetPackageById, [200, 404], this.actual)
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
    return `API: Expect "${this.actual.name || this.actual.packageId}" package ${this.notIndicator}${assertionDescription}`
  }
}
