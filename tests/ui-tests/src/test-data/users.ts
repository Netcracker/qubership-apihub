export const INVALID_LOGIN = 'APIHUB99'

export const INVALID_PASSWORD = '1'

export const TEST_SYSADMIN_LOCAL = {
  id: 'x_atui_sysadminatqa-at',
  email: 'x_atui_sysadmin@qa.at',
  name: 'x_ATUI_Sysadmin',
  password: process.env.TEST_USER_PASSWORD as string,
} as const

export const SYSADMIN = TEST_SYSADMIN_LOCAL

export const TEST_USER_1 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user1atqa-at',
  email: 'x_atui_user1@qa.at',
  name: 'x_ATUI_User1',
} as const

export const TEST_USER_2 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user2atqa-at',
  email: 'x_atui_user2@qa.at',
  name: 'x_ATUI_User2',
} as const

export const TEST_USER_3 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user3atqa-at',
  email: 'x_atui_user3@qa.at',
  name: 'x_ATUI_User3',
} as const

export const TEST_USER_4 = {
  ...TEST_SYSADMIN_LOCAL,
  id: 'x_atui_user4atqa-at',
  email: 'x_atui_user4@qa.at',
  name: 'x_ATUI_User4',
} as const
