import { Group } from '@test-data/props'
import { A_WS_R, A_WS_N, A_WS_DEFAULT } from './workspaces'

const { TEST_PRODUCT_GROUP_NAME, TEST_PRODUCT_GROUP_ALIAS, TEST_SUB_GROUP_NAME, TEST_SUB_GROUP_ALIAS } = process.env

const PRODUCT_GROUP_NAME = TEST_PRODUCT_GROUP_NAME || 'QS Product'
const PRODUCT_GROUP_ALIAS = TEST_PRODUCT_GROUP_ALIAS || 'QS'
const SUB_GROUP_NAME = TEST_SUB_GROUP_NAME || 'Sub Group'
const SUB_GROUP_ALIAS = TEST_SUB_GROUP_ALIAS || 'SG'
const APIHUB_GROUP_NAME = 'APIHUB'
const APIHUB_GROUP_ALIAS = 'AH'

export const A_GR_SUB = new Group({
  name: SUB_GROUP_NAME,
  alias: SUB_GROUP_ALIAS,
  parent: A_WS_DEFAULT,
})
export const A_GR_APIHUB = new Group({
  name: APIHUB_GROUP_NAME,
  alias: APIHUB_GROUP_ALIAS,
  parent: A_GR_SUB,
})

export const A_GR_PRODUCT_R = new Group({
  name: PRODUCT_GROUP_NAME,
  alias: PRODUCT_GROUP_ALIAS,
  parent: A_WS_R,
})
export const A_GR_SUB_R = new Group({
  name: SUB_GROUP_NAME,
  alias: SUB_GROUP_ALIAS,
  parent: A_GR_PRODUCT_R,
})
export const A_GR_APIHUB_R = new Group({
  name: APIHUB_GROUP_NAME,
  alias: APIHUB_GROUP_ALIAS,
  parent: A_GR_SUB_R,
})

export const A_GR_PRODUCT_N = new Group({
  name: PRODUCT_GROUP_NAME,
  alias: PRODUCT_GROUP_ALIAS,
  parent: A_WS_N,
})
export const A_GR_SUB_N = new Group({
  name: SUB_GROUP_NAME,
  alias: SUB_GROUP_ALIAS,
  parent: A_GR_PRODUCT_N,
})
export const A_GR_APIHUB_N = new Group({
  name: APIHUB_GROUP_NAME,
  alias: APIHUB_GROUP_ALIAS,
  parent: A_GR_SUB_N,
})
