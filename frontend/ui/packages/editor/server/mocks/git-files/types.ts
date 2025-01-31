export type GitFileDto = Readonly<{
  name: string
  isFolder: boolean
}>

export type GitFilesDto = Readonly<{
  files: GitFileDto[]
}>
