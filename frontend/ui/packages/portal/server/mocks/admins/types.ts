export type SystemAdminsDto = Readonly<{
  admins: SystemAdmins
}>

export type SystemAdmins = SystemAdmin[]

export type SystemAdmin = Readonly<{
  id: string
  name: string
  email?: string
  avatarUrl: string
}>

export type AddSystemAdmin = Readonly<{
  userId: string
}>

