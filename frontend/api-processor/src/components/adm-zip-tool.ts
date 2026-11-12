import { ZipTool } from './package'
import AdmZip from 'adm-zip'

export class AdmZipTool implements ZipTool {
  zip: AdmZip = new AdmZip()
  folderName: string

  constructor(folderName: string = '', zip?: AdmZip | null) {
    if (zip) {
      this.zip = zip
    }
    this.folderName = folderName
  }

  async buildResult(): Promise<any> {
    return await this.zip.toBufferPromise()
  }

  async file(path: string, content: object | string | Blob): Promise<void> {
    const pathWithFolder = this.folderName ? `${this.folderName}/${path}` : path
    if (content instanceof Blob) {
      this.zip.addFile(
        pathWithFolder,
        Buffer.from(await content.arrayBuffer()),
      )
      return
    }
    this.zip.addFile(
      pathWithFolder,
      Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)),
    )
  }

  folder(name: string): ZipTool {
    return new AdmZipTool(name, this.zip)
  }
}
