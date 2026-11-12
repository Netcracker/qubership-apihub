export type Group = Readonly<{
  key: string
  alias: string
  name: string
  parentKey?: string
  description?: string
  serviceName?: string
  favorite: boolean
  lastVersion?: string
  path: string // TODO: Remove `path` when backend will provide groups of project
}>

export type GroupDto = Readonly<{
  groupId: string
  alias: string
  name: string
  parentId?: string
  description?: string
  isFavorite: boolean
  lastVersion?: string
}>

export type GroupsDto = Readonly<{
  groups: ReadonlyArray<GroupDto>
}>
