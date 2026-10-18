import { Package } from '@test-data/props'
import { A_GR_APIHUB, A_GR_APIHUB_R, A_GR_APIHUB_N } from './groups'

export const TEST_SERVICE_1 = new Package({
  name: 'Test Service',
  alias: 'TS',
  parent: A_GR_APIHUB,
  serviceName: 'apihub-agent-test-service',
})
export const TEST_SERVICE_2 = new Package({
  name: 'APIHUB backend',
  alias: 'RS',
  parent: A_GR_APIHUB,
  serviceName: 'apihub-backend',
})

export const TEST_SERVICE_1_IMM = new Package({
  ...TEST_SERVICE_1,
  parent: A_GR_APIHUB_R,
})
export const TEST_SERVICE_2_IMM = new Package({
  ...TEST_SERVICE_2,
  parent: A_GR_APIHUB_R,
})

export const TEST_SERVICE_1_VAR = new Package({
  ...TEST_SERVICE_1,
  parent: A_GR_APIHUB_N,
})
export const TEST_SERVICE_2_VAR = new Package({
  ...TEST_SERVICE_2,
  parent: A_GR_APIHUB_N,
})

export const PK_A_UPLOAD_R = new Package({
  name: 'Upload-options',
  alias: 'PKAUPLR',
  parent: A_GR_APIHUB_R,
})
