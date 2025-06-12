import AdmZip from 'adm-zip'

export type Task = {
  configJson: string,
  sources?: AdmZip,
  builderId: string,
}
