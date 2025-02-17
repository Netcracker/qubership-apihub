import { expect as expectPw, test } from '@fixtures'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { createRest, rGetPackageVersion } from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'

class BaseExpectApiVersion {
  protected readonly notStr: string

  constructor(
    protected readonly actual: { packageId: string; version: string },
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {
    if (isNot) {
      this.notStr = 'not '
    } else {
      this.notStr = ''
    }
  }

  async toBeCreated(): Promise<void> {
    await test.step(`Expect version "${this.actual.version}" ${this.notStr}to be created `, async () => {
      const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
      const rest = await createRest(BASE_ORIGIN, authData.token)
      const response = await rest.send(rGetPackageVersion, [200, 404], this.actual)

      if (!this.isNot) {
        if (!this.isSoft) {
          expectPw(response.status(), this.message || undefined).toEqual(200)
        } else {
          expectPw.soft(response.status(), this.message || undefined).toEqual(200)
        }
      } else {
        if (!this.isSoft) {
          expectPw(response.status(), this.message || undefined).toEqual(404)
        } else {
          expectPw.soft(response.status(), this.message || undefined).toEqual(404)
        }
      }
    }, { box: true })
  }
}

export class ExpectApiVersion extends BaseExpectApiVersion {
  readonly not = new BaseExpectApiVersion(this.actual, true, this.isSoft, this.message)

  constructor(
    protected readonly actual: { packageId: string; version: string },
    protected readonly isNot: boolean,
    protected readonly isSoft: boolean,
    protected readonly message?: string,
  ) {
    super(actual, isNot, isSoft, message)
  }
}
