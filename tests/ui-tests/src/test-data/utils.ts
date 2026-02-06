import { createRestWithCredentials, rGetPackageById } from '@services/rest'
import { getRestFailMsg } from '@services/utils'
import type { ApihubApps } from '@shared/entities'
import { GRP_P_HIERARCHY_R } from '@test-data/portal'
import { SYSADMIN } from '@test-data/users'
import { BASE_URL } from '@test-setup'

export const isReusableTestDataExist = async (app: ApihubApps): Promise<boolean> => {
  let id!: string
  switch (app) {
    case 'portal': {
      id = GRP_P_HIERARCHY_R.packageId
      break
    }
  }

  const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)

  const response = await rest.send(rGetPackageById, [200, 404], { packageId: id })
  if (response.status() !== 200 && response.status() !== 404) {
    throw Error(await getRestFailMsg(`Getting "${id}" project`, response))
  }
  return response.status() === 200
}
